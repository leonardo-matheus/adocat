<?php

declare(strict_types=1);

use AdoCat\App;
use Laminas\Diactoros\ServerRequest;
use PHPUnit\Framework\TestCase;

final class ApiTest extends TestCase
{
    private PDO $db;
    private App $app;

    protected function setUp(): void
    {
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec(file_get_contents(dirname(__DIR__) . '/migrations/001_initial.sqlite.sql'));
        $this->db->exec("INSERT INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES ('p1','Faísca','cat','female','kitten','5 meses','small','Araraquara','https://example.test/cat.jpg','Carinhosa','[\"carinhosa\"]',1,0,'available')");
        $this->db->exec("INSERT INTO pets (id,name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status) VALUES ('p2','Ragna','cat','female','senior','9 anos','small','Matão','/images/ragna.jpg','Em recuperação','[\"serena\"]',1,1,'treatment')");
        $this->app = App::create($this->db, ['ADMIN_EMAIL'=>'admin@test.local','ADMIN_PASSWORD'=>'secret','PIX_KEY'=>'']);
    }

    public function testPublicPetEnvelopeAndFilter(): void
    {
        $response = $this->app->handle(new ServerRequest([], [], '/api/pets?species=cat', 'GET'));
        $body = json_decode((string)$response->getBody(), true);
        self::assertSame(200, $response->getStatusCode());
        self::assertSame('Faísca', $body['data'][0]['name']);
        self::assertTrue($body['data'][0]['vaccinated']);
        self::assertCount(2,$body['data']);
    }

    public function testValidationUsesErrorEnvelope(): void
    {
        $request=(new ServerRequest([], [], '/api/volunteers', 'POST'))->withBody($this->stream('{}'));
        $response=$this->app->handle($request);$body=json_decode((string)$response->getBody(),true);
        self::assertSame(422,$response->getStatusCode());self::assertArrayHasKey('fields',$body['error']);
    }

    public function testPublicConfigDoesNotInventPixKey(): void
    {
        $response=$this->app->handle(new ServerRequest([], [], '/api/config','GET'));$data=json_decode((string)$response->getBody(),true)['data'];
        self::assertFalse($data['pixConfigured']);self::assertNull($data['pixKey']);
    }

    public function testTreatmentPetCannotReceiveAdoption(): void
    {
        $payload=['petId'=>'p2','name'=>'Pessoa Teste','email'=>'pessoa@example.test','phone'=>'16999999999','city'=>'São Carlos','homeType'=>'house','screened'=>true,'otherPets'=>'Não','routine'=>'Trabalho em casa todos os dias','consent'=>true];
        $request=(new ServerRequest(['REMOTE_ADDR'=>'127.0.0.1'], [], '/api/adoptions','POST'))->withBody($this->stream(json_encode($payload)));
        $response=$this->app->handle($request);$body=json_decode((string)$response->getBody(),true);
        self::assertSame(422,$response->getStatusCode());self::assertArrayHasKey('petId',$body['error']['fields']);
    }

    private function stream(string $content): \Psr\Http\Message\StreamInterface
    {
        $stream=fopen('php://temp','r+');fwrite($stream,$content);rewind($stream);return new Laminas\Diactoros\Stream($stream);
    }
}
