<?php

declare(strict_types=1);

use AdoCat\App;
use Laminas\Diactoros\ServerRequest;
use Laminas\Diactoros\Stream;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamInterface;

final class CmsApiTest extends TestCase
{
    private App $app;
    private string $csrf;
    private string $remoteIp;

    protected function setUp(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        session_id('cms-' . bin2hex(random_bytes(8)));
        $this->remoteIp = '10.' . random_int(1, 250) . '.' . random_int(1, 250) . '.' . random_int(1, 250);
        $db = new PDO('sqlite::memory:');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->exec(file_get_contents(dirname(__DIR__) . '/migrations/001_initial.sqlite.sql'));
        $db->exec(file_get_contents(dirname(__DIR__) . '/migrations/004_content_cms.sqlite.sql'));
        $this->app = App::create($db, [
            'ADMIN_EMAIL' => 'admin@test.local',
            'ADMIN_PASSWORD' => 'secret',
            'APP_ORIGIN' => 'https://site.example',
            'SMTP_HOST' => 'smtp.example',
            'MAIL_FROM' => 'from@example.test',
            'MAIL_TO' => 'to@example.test',
        ]);
        $session = $this->request('GET', '/api/auth/session');
        $this->csrf = $session['body']['data']['csrfToken'];
        $login = $this->request('POST', '/api/auth/login', ['email'=>'admin@test.local','password'=>'secret'], true);
        self::assertSame(200, $login['response']->getStatusCode());
        $this->csrf = $login['body']['data']['csrfToken'];
    }

    protected function tearDown(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
    }

    public function testDraftOnlyBecomesPublicAfterPublishAndHidesDraftArticles(): void
    {
        $initial = $this->request('GET', '/api/content');
        self::assertSame([], $initial['body']['data']['values']);

        $document = $this->document();
        $document['values']['home.hero.title'] = 'Um lar muda tudo';
        $document['articles'] = [
            $this->article('historia-publica', 'published'),
            $this->article('rascunho-secreto', 'draft'),
        ];
        $saved = $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>1], true);
        self::assertSame(200, $saved['response']->getStatusCode(), json_encode($saved['body'], JSON_UNESCAPED_UNICODE));
        self::assertSame(2, $saved['body']['data']['revision']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $saved['body']['data']['updatedAt']);
        self::assertSame([], $this->request('GET', '/api/content')['body']['data']['values']);

        $published = $this->request('POST', '/api/admin/content/publish', ['revision'=>2], true);
        self::assertSame(3, $published['body']['data']['revision']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $published['body']['data']['publishedAt']);
        $public = $this->request('GET', '/api/content')['body']['data'];
        self::assertSame('Um lar muda tudo', $public['values']['home.hero.title']);
        self::assertSame(['historia-publica'], array_column($public['articles'], 'slug'));

        $stale = $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>2], true);
        self::assertSame(409, $stale['response']->getStatusCode());
    }

    public function testDiscardRestoresPublishedDocument(): void
    {
        $publishedDocument = $this->document();
        $publishedDocument['values']['home.hero.title'] = 'Publicado';
        $this->request('PATCH', '/api/admin/content', ['document'=>$publishedDocument,'revision'=>1], true);
        $this->request('POST', '/api/admin/content/publish', ['revision'=>2], true);

        $draft = $publishedDocument;
        $draft['values']['home.hero.title'] = 'Mudança local';
        $this->request('PATCH', '/api/admin/content', ['document'=>$draft,'revision'=>3], true);
        $discarded = $this->request('POST', '/api/admin/content/discard', ['revision'=>4], true);
        self::assertSame('Publicado', $discarded['body']['data']['draft']['values']['home.hero.title']);
        self::assertSame(5, $discarded['body']['data']['revision']);
    }

    public function testRejectsUnsafeLinksAndIncompletePixConfiguration(): void
    {
        $document = $this->document();
        $document['values']['home.cta.href'] = 'javascript:alert(1)';
        $document['integrations']['pixKey'] = 'chave@example.test';
        $result = $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>1], true);
        self::assertSame(422, $result['response']->getStatusCode());
        self::assertArrayHasKey('values', $result['body']['error']['fields']);
        self::assertArrayHasKey('integrations.pixKey', $result['body']['error']['fields']);
    }

    public function testAcceptsDocumentWithoutTextOverrides(): void
    {
        $document = $this->document();
        $document['navigation'] = [['id'=>'home','label'=>'Início','href'=>'/','visible'=>true,'newTab'=>false]];
        $saved = $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>1], true);
        self::assertSame(200, $saved['response']->getStatusCode());
        self::assertSame([], $saved['body']['data']['draft']['values']);
    }

    public function testMediaLibraryAndIntegrationReadinessDoNotExposeSecrets(): void
    {
        $created = $this->request('POST', '/api/admin/media', ['url'=>'https://cdn.example.test/cat.webp','name'=>'Gata Luna','alt'=>'Gata laranja'], true);
        self::assertSame(201, $created['response']->getStatusCode());
        $id = $created['body']['data']['id'];
        $updated = $this->request('PATCH', "/api/admin/media/$id", ['name'=>'Luna no abrigo','alt'=>'Gata Luna descansando'], true);
        self::assertSame('Luna no abrigo', $updated['body']['data']['name']);
        self::assertSame($created['body']['data']['createdAt'], $updated['body']['data']['createdAt']);
        self::assertCount(1, $this->request('GET', '/api/admin/media')['body']['data']);

        $readiness = $this->request('GET', '/api/admin/integrations')['body']['data'];
        self::assertTrue($readiness['smtp']);
        self::assertFalse($readiness['storage']);
        self::assertArrayNotHasKey('password', $readiness);

        self::assertSame(200, $this->request('DELETE', "/api/admin/media/$id", null, true)['response']->getStatusCode());
        self::assertCount(0, $this->request('GET', '/api/admin/media')['body']['data']);
    }

    public function testAcceptsAnchorsAndRejectsAmbiguousRelativeLinks(): void
    {
        foreach (['/\\evil.test', '/sobre nos', '//evil.test', 'javascript:alert(1)'] as $href) {
            $document = $this->document();
            $document['navigation'] = [['id'=>'link','label'=>'Link','href'=>$href,'visible'=>true,'newTab'=>false]];
            self::assertSame(422, $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>1], true)['response']->getStatusCode());
        }
        $document['navigation'][0]['href'] = '#main-content';
        $saved = $this->request('PATCH', '/api/admin/content', ['document'=>$document,'revision'=>1], true);
        self::assertSame(200, $saved['response']->getStatusCode());
    }

    public function testRejectsObjectsWhereTheClientRequiresLists(): void
    {
        $article = $this->article('historia', 'published');
        $documents = [];
        $document = $this->document();
        $document['articles'] = ['named'=>$article];
        $documents[] = $document;
        $document = $this->document();
        $document['navigation'] = ['named'=>['id'=>'home','label'=>'Início','href'=>'/','visible'=>true,'newTab'=>false]];
        $documents[] = $document;
        $document = $this->document();
        $article['sections'] = ['named'=>['title'=>'Título','text'=>'Texto']];
        $document['articles'] = [$article];
        $documents[] = $document;
        foreach ($documents as $invalid) {
            self::assertSame(422, $this->request('PATCH', '/api/admin/content', ['document'=>$invalid,'revision'=>1], true)['response']->getStatusCode());
        }
    }

    private function document(): array
    {
        return [
            'values' => [],
            'articles' => null,
            'navigation' => null,
            'integrations' => [
                'whatsapp'=>'5516997587596',
                'email'=>'adocat.adocao@gmail.com',
                'instagram'=>'',
                'facebook'=>'',
                'pixKey'=>'',
                'donationRecipient'=>'',
                'donationCity'=>'',
            ],
        ];
    }

    private function article(string $slug, string $status): array
    {
        return [
            'slug'=>$slug,
            'category'=>'Cuidados',
            'title'=>'Uma história',
            'excerpt'=>'Resumo da história.',
            'image'=>'/images/luna.jpg',
            'readTime'=>'4 min',
            'sections'=>[['title'=>'Começo','text'=>'Conteúdo completo.']],
            'status'=>$status,
        ];
    }

    private function request(string $method, string $uri, ?array $payload = null, bool $csrf = false): array
    {
        $request = new ServerRequest(['REMOTE_ADDR'=>$this->remoteIp], [], $uri, $method);
        if ($payload !== null) $request = $request->withBody($this->stream(json_encode($payload, JSON_THROW_ON_ERROR)));
        if ($csrf) $request = $request->withHeader('X-CSRF-Token', $this->csrf);
        $response = $this->app->handle($request);
        return ['response'=>$response,'body'=>json_decode((string)$response->getBody(), true)];
    }

    private function stream(string $content): StreamInterface
    {
        $stream=fopen('php://temp','r+');fwrite($stream,$content);rewind($stream);return new Stream($stream);
    }
}
