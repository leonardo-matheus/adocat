<?php

declare(strict_types=1);

namespace AdoCat;

use Aws\S3\S3Client;
use Laminas\Diactoros\Response\JsonResponse;
use Laminas\Diactoros\ServerRequestFactory;
use Laminas\HttpHandlerRunner\Emitter\SapiEmitter;
use Laminas\HttpHandlerRunner\RequestHandlerRunnerInterface;
use Mezzio\Application;
use Mezzio\MiddlewareContainer;
use Mezzio\MiddlewareFactory;
use Mezzio\Router\FastRouteRouter;
use Mezzio\Router\Middleware\DispatchMiddleware;
use Mezzio\Router\Middleware\RouteMiddleware;
use Mezzio\Router\RouteCollector;
use PHPMailer\PHPMailer\PHPMailer;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Stratigility\MiddlewarePipe;
use PDO;
use RuntimeException;
use Throwable;

final class App
{
    private Application $app;
    private PDO $db;
    private array $env;
    private FastRouteRouter $router;

    private function __construct(PDO $db, array $env)
    {
        $this->db = $db;
        $this->env = $env;
        $container = new class implements ContainerInterface {
            public function get(string $id): mixed { throw new RuntimeException("Serviço não encontrado: $id"); }
            public function has(string $id): bool { return false; }
        };
        $router = $this->router = new FastRouteRouter();
        $factory = new MiddlewareFactory(new MiddlewareContainer($container));
        $runner = new class implements RequestHandlerRunnerInterface { public function run(): void {} };
        $this->app = new Application($factory, new MiddlewarePipe(), new RouteCollector($router), $runner);
        $this->routes();
    }

    public static function fromEnvironment(string $root): self
    {
        $env = self::loadEnv($root . '/.env');
        $dsn = $env['DB_DSN'] ?? ('sqlite:' . $root . '/var/adocat.sqlite');
        if(str_starts_with($dsn,'sqlite:')){$path=substr($dsn,7);if($path!==':memory:'&&!str_starts_with($path,'/')&&!preg_match('/^[A-Za-z]:[\\\\\/]/',$path))$dsn='sqlite:'.$root.'/'.$path;}
        return new self(Database::connect(['dsn' => $dsn, 'user' => $env['DB_USER'] ?? null, 'password' => $env['DB_PASSWORD'] ?? null]), $env);
    }

    public static function create(PDO $db, array $env = []): self
    {
        return new self($db, $env);
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return $this->app->handle($request);
    }

    public function run(): void
    {
        (new SapiEmitter())->emit($this->handle(ServerRequestFactory::fromGlobals()));
    }

    private static function loadEnv(string $path): array
    {
        $env = getenv() + $_ENV + $_SERVER;
        if (!is_file($path)) {
            return $env;
        }
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $env[trim($key)] = trim(trim($value), "\"'");
        }
        return $env;
    }

    private function routes(): void
    {
        $this->app->pipe(function (ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface {
            $origin = $request->getHeaderLine('Origin');
            $allowed = $this->env['APP_ORIGIN'] ?? 'http://localhost:5173';
            if ($request->getMethod() === 'OPTIONS') {
                return $this->cors(new JsonResponse(['data' => null], 204), $origin, $allowed);
            }
            try {
                return $this->cors($handler->handle($request), $origin, $allowed);
            } catch (ApiException $e) {
                return $this->cors($this->error($e->getMessage(), $e->status, $e->fields), $origin, $allowed);
            } catch (Throwable $e) {
                error_log('AdoCat API error: ' . $e->getMessage());
                return $this->cors($this->error('Erro interno do servidor.', 500), $origin, $allowed);
            }
        });
        $this->app->pipe(new RouteMiddleware($this->router));

        $this->app->get('/api/pets', fn(ServerRequestInterface $r) => $this->listPets($r));
        $this->app->get('/api/pets/{id}', fn(ServerRequestInterface $r) => $this->getPet($r));
        $this->app->get('/api/campaigns', fn() => $this->listCampaigns(true));
        $this->app->get('/api/config', fn() => new JsonResponse(['data' => $this->publicConfig()]));
        $this->app->post('/api/adoptions', fn(ServerRequestInterface $r) => $this->createAdoption($r));
        $this->app->post('/api/volunteers', fn(ServerRequestInterface $r) => $this->createVolunteer($r));
        $this->app->get('/api/auth/session', fn() => $this->sessionInfo());
        $this->app->post('/api/auth/login', fn(ServerRequestInterface $r) => $this->login($r));
        $this->app->post('/api/auth/logout', fn(ServerRequestInterface $r) => $this->logout($r));

        $this->app->get('/api/admin/pets', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->listPets($r, true)));
        $this->app->post('/api/admin/pets', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->savePet($r)));
        $this->app->patch('/api/admin/pets/{id}', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->savePet($r, (string)$r->getAttribute('id'))));
        $this->app->delete('/api/admin/pets/{id}', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->deleteRecord('pets', (string)$r->getAttribute('id'))));
        $this->app->get('/api/admin/adoptions', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->listSubmissions('adoptions')));
        $this->app->patch('/api/admin/adoptions/{id}', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->updateStatus($r, 'adoptions')));
        $this->app->get('/api/admin/volunteers', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->listSubmissions('volunteers')));
        $this->app->patch('/api/admin/volunteers/{id}', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->updateStatus($r, 'volunteers')));
        $this->app->post('/api/admin/uploads', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->upload($r)));
        $this->app->get('/api/admin/campaigns', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->listCampaigns(false)));
        $this->app->post('/api/admin/campaigns', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->saveCampaign($r)));
        $this->app->patch('/api/admin/campaigns/{id}', fn(ServerRequestInterface $r) => $this->admin($r, fn() => $this->saveCampaign($r, (string)$r->getAttribute('id'))));
        $this->app->pipe(new DispatchMiddleware());
        $this->app->pipe(fn() => $this->error('Rota não encontrada.', 404));
    }

    private function cors(ResponseInterface $response, string $origin, string $allowed): ResponseInterface
    {
        if ($origin !== '' && hash_equals($allowed, $origin)) {
            $response = $response->withHeader('Access-Control-Allow-Origin', $origin)->withHeader('Access-Control-Allow-Credentials', 'true')->withHeader('Vary', 'Origin');
        }
        return $response->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')->withHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')->withHeader('Cache-Control', 'no-store');
    }

    private function json(ServerRequestInterface $r): array
    {
        $raw = (string)$r->getBody();
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('JSON inválido.', 400);
        }
        return $data;
    }

    private function error(string $message, int $status, array $fields = []): JsonResponse
    {
        $body = ['error' => ['message' => $message]];
        if ($fields !== []) $body['error']['fields'] = $fields;
        return new JsonResponse($body, $status);
    }

    private function listPets(ServerRequestInterface $r, bool $admin = false): JsonResponse
    {
        $where = []; $params = [];
        if (!$admin) { $where[] = "status IN ('available','treatment')"; }
        foreach (['species', 'sex', 'age_group', 'size', 'city', 'status'] as $key) {
            $queryKey = $key === 'age_group' ? 'ageGroup' : $key;
            $value = $r->getQueryParams()[$queryKey] ?? null;
            if ($value !== null && ($admin || $key !== 'status')) { $where[] = "$key = :$key"; $params[$key] = $value; }
        }
        $sql = 'SELECT * FROM pets' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY created_at DESC';
        $stmt = $this->db->prepare($sql); $stmt->execute($params);
        return new JsonResponse(['data' => array_map([$this, 'pet'], $stmt->fetchAll())]);
    }

    private function getPet(ServerRequestInterface $r): JsonResponse
    {
        $stmt = $this->db->prepare("SELECT * FROM pets WHERE id = ? AND status IN ('available','treatment')");
        $stmt->execute([(string)$r->getAttribute('id')]);
        $row = $stmt->fetch();
        if (!$row) throw new ApiException('Pet não encontrado.', 404);
        return new JsonResponse(['data' => $this->pet($row)]);
    }

    private function pet(array $p): array
    {
        $out = ['id'=>(string)$p['id'],'name'=>$p['name'],'species'=>$p['species'],'sex'=>$p['sex'],'ageGroup'=>$p['age_group'],'ageLabel'=>$p['age_label'],'size'=>$p['size'],'city'=>$p['city'],'image'=>$p['image'],'description'=>$p['description'],'temperament'=>json_decode($p['temperament'], true) ?: [],'vaccinated'=>(bool)$p['vaccinated'],'neutered'=>(bool)$p['neutered'],'status'=>$p['status']];
        if ($p['vaccine_date']) $out['vaccineDate'] = $p['vaccine_date'];
        if ($p['neuter_date']) $out['neuterDate'] = $p['neuter_date'];
        return $out;
    }

    private function savePet(ServerRequestInterface $r, ?string $id = null): JsonResponse
    {
        $d = $this->json($r);
        if ($id !== null) {
            $stmt = $this->db->prepare('SELECT * FROM pets WHERE id=?'); $stmt->execute([$id]); $current = $stmt->fetch();
            if (!$current) throw new ApiException('Pet não encontrado.', 404);
            $d = array_replace($this->pet($current), $d);
        }
        $fields = $this->validate($d, ['name','species','sex','ageGroup','ageLabel','size','city','image','description','temperament','vaccinated','neutered','status']);
        $this->oneOf($d, $fields, ['species'=>['cat','dog'],'sex'=>['female','male'],'ageGroup'=>['kitten','adult','senior'],'size'=>['small','medium','large'],'status'=>['available','treatment','adopted']]);
        $this->checkStrings($d,$fields,['name'=>100,'ageLabel'=>50,'city'=>100,'description'=>5000]);
        $this->checkBooleans($d,$fields,['vaccinated','neutered']);
        $this->checkList($d,$fields,'temperament',0,12,40);
        $this->checkUrl($d,$fields,'image',true);
        foreach(['vaccineDate','neuterDate'] as $key){if(($d[$key]??'')==='')$d[$key]=null;$this->checkDate($d,$fields,$key);}
        if ($fields) throw new ApiException('Revise os campos.', 422, $fields);
        $values = [$d['name'],$d['species'],$d['sex'],$d['ageGroup'],$d['ageLabel'],$d['size'],$d['city'],$d['image'],$d['description'],json_encode(array_values($d['temperament']), JSON_UNESCAPED_UNICODE),(int)$d['vaccinated'],(int)$d['neutered'],$d['status'],$d['vaccineDate']??null,$d['neuterDate']??null];
        if ($id === null) {
            $id = $this->uuid();
            $stmt = $this->db->prepare('INSERT INTO pets (name,species,sex,age_group,age_label,size,city,image,description,temperament,vaccinated,neutered,status,vaccine_date,neuter_date,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $stmt->execute([...$values, $id]); $status = 201;
        } else {
            $stmt = $this->db->prepare('UPDATE pets SET name=?,species=?,sex=?,age_group=?,age_label=?,size=?,city=?,image=?,description=?,temperament=?,vaccinated=?,neutered=?,status=?,vaccine_date=?,neuter_date=? WHERE id=?');
            $stmt->execute([...$values, $id]); if ($stmt->rowCount() === 0 && !$this->exists('pets',$id)) throw new ApiException('Pet não encontrado.',404); $status = 200;
        }
        $stmt = $this->db->prepare('SELECT * FROM pets WHERE id=?'); $stmt->execute([$id]);
        return new JsonResponse(['data'=>$this->pet($stmt->fetch())], $status);
    }

    private function createAdoption(ServerRequestInterface $r): JsonResponse
    {
        $this->rateLimit($r, 'adoptions'); $d=$this->json($r);
        $fields=$this->validate($d,['petId','name','email','phone','city','homeType','screened','otherPets','routine','consent']);
        $this->oneOf($d,$fields,['homeType'=>['house','apartment']]);
        $this->checkStrings($d,$fields,['name'=>120,'email'=>254,'phone'=>30,'city'=>100,'otherPets'=>2000,'routine'=>5000]);
        $this->checkBooleans($d,$fields,['screened','consent']);
        if(is_string($d['name']??null)&&mb_strlen(trim($d['name']))<3)$fields['name']='Informe ao menos 3 caracteres.';
        if(is_string($d['phone']??null)&&strlen(preg_replace('/\D/','',$d['phone']))<10)$fields['phone']='Telefone inválido.';
        if(is_string($d['routine']??null)&&mb_strlen(trim($d['routine']))<10)$fields['routine']='Conte um pouco mais sobre sua rotina.';
        if (($d['consent']??null)!==true) $fields['consent']='O consentimento é obrigatório.';
        if (!filter_var($d['email']??'',FILTER_VALIDATE_EMAIL)) $fields['email']='E-mail inválido.';
        if ($this->recordStatus('pets',(string)($d['petId']??''))!=='available') $fields['petId']='Este pet não está disponível para adoção.';
        if ($fields) throw new ApiException('Revise os campos.',422,$fields);
        $id=$this->uuid(); $stmt=$this->db->prepare('INSERT INTO adoptions (id,pet_id,name,email,phone,city,home_type,screened,other_pets,routine,consent,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$id,$d['petId'],trim($d['name']),trim($d['email']),trim($d['phone']),trim($d['city']),$d['homeType'],(int)$d['screened'],$d['otherPets'],$d['routine'],1,'pending']);
        $this->notify('Nova solicitação de adoção', "Uma nova solicitação foi registrada no painel. Protocolo: $id");
        return new JsonResponse(['data'=>$this->submission('adoptions',$id)],201);
    }

    private function createVolunteer(ServerRequestInterface $r): JsonResponse
    {
        $this->rateLimit($r, 'volunteers'); $d=$this->json($r);$d['message']??='';
        $fields=$this->validate($d,['name','email','phone','city','interests','availability','consent']);
        $this->checkStrings($d,$fields,['name'=>120,'email'=>254,'phone'=>30,'city'=>100,'availability'=>255,'message'=>5000]);
        $this->checkList($d,$fields,'interests',1,12,80);$this->checkBooleans($d,$fields,['consent']);
        if(is_string($d['name']??null)&&mb_strlen(trim($d['name']))<3)$fields['name']='Informe ao menos 3 caracteres.';
        if(is_string($d['phone']??null)&&strlen(preg_replace('/\D/','',$d['phone']))<10)$fields['phone']='Telefone inválido.';
        if (($d['consent']??null)!==true) $fields['consent']='O consentimento é obrigatório.';
        if (!filter_var($d['email']??'',FILTER_VALIDATE_EMAIL)) $fields['email']='E-mail inválido.';
        if ($fields) throw new ApiException('Revise os campos.',422,$fields);
        $id=$this->uuid(); $stmt=$this->db->prepare('INSERT INTO volunteers (id,name,email,phone,city,interests,availability,message,consent,status) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$id,trim($d['name']),trim($d['email']),trim($d['phone']),trim($d['city']),json_encode(array_values($d['interests']),JSON_UNESCAPED_UNICODE),$d['availability'],$d['message'],1,'pending']);
        $this->notify('Novo cadastro de voluntariado', "Um novo cadastro foi registrado no painel. Protocolo: $id");
        return new JsonResponse(['data'=>$this->submission('volunteers',$id)],201);
    }

    private function listCampaigns(bool $public): JsonResponse
    {
        $sql='SELECT * FROM campaigns ORDER BY created_at DESC';
        return new JsonResponse(['data'=>array_map([$this,'campaign'],$this->db->query($sql)->fetchAll())]);
    }

    private function campaign(array $c): array
    {
        $o=['id'=>(string)$c['id'],'title'=>$c['title'],'description'=>$c['description'],'image'=>$c['image'],'target'=>(float)$c['target'],'raised'=>(float)$c['raised'],'status'=>$c['status'],'category'=>$c['category']];
        if ($c['external_url']) $o['externalUrl']=$c['external_url']; return $o;
    }

    private function saveCampaign(ServerRequestInterface $r, ?string $id=null): JsonResponse
    {
        $d=$this->json($r);
        if($id!==null){$s=$this->db->prepare('SELECT * FROM campaigns WHERE id=?');$s->execute([$id]);$current=$s->fetch();if(!$current)throw new ApiException('Campanha não encontrada.',404);$d=array_replace($this->campaign($current),$d);}
        $fields=$this->validate($d,['title','description','image','target','raised','status','category']); $this->oneOf($d,$fields,['status'=>['active','completed']]);
        $this->checkStrings($d,$fields,['title'=>150,'description'=>5000,'category'=>80]);$this->checkUrl($d,$fields,'image',true);$this->checkUrl($d,$fields,'externalUrl',false);
        if ((!is_int($d['target']??null)&&!is_float($d['target']??null))||!is_finite((float)($d['target']??0))||(float)($d['target']??0)<=0) $fields['target']='A meta deve ser positiva.';
        if ((!is_int($d['raised']??null)&&!is_float($d['raised']??null))||!is_finite((float)($d['raised']??-1))||(float)($d['raised']??-1)<0) $fields['raised']='Valor inválido.';
        if ($fields) throw new ApiException('Revise os campos.',422,$fields);
        $v=[$d['title'],$d['description'],$d['image'],$d['target'],$d['raised'],$d['status'],$d['category'],$d['externalUrl']??null];
        if ($id===null) { $id=$this->uuid(); $s=$this->db->prepare('INSERT INTO campaigns (title,description,image,target,raised,status,category,external_url,id) VALUES (?,?,?,?,?,?,?,?,?)'); $s->execute([...$v,$id]); $status=201; }
        else { $s=$this->db->prepare('UPDATE campaigns SET title=?,description=?,image=?,target=?,raised=?,status=?,category=?,external_url=? WHERE id=?'); $s->execute([...$v,$id]); if(!$this->exists('campaigns',$id))throw new ApiException('Campanha não encontrada.',404); $status=200; }
        $s=$this->db->prepare('SELECT * FROM campaigns WHERE id=?');$s->execute([$id]);return new JsonResponse(['data'=>$this->campaign($s->fetch())],$status);
    }

    private function sessionInfo(): JsonResponse
    {
        $this->startSession();$idle=max(300,(int)($this->env['SESSION_IDLE_SECONDS']??1800));if(($_SESSION['admin']??false)===true&&time()-(int)($_SESSION['last_activity']??0)>$idle){$_SESSION=[];session_regenerate_id(true);}$authenticated=($_SESSION['admin']??false)===true; $_SESSION['csrf']??=bin2hex(random_bytes(32)); $data=['authenticated'=>$authenticated,'csrfToken'=>$_SESSION['csrf']];
        return new JsonResponse(['data'=>$data]);
    }

    private function login(ServerRequestInterface $r): JsonResponse
    {
        $this->rateLimit($r,'login',10);$this->startSession(); $this->csrf($r); $d=$this->json($r); $email=(string)($d['email']??'');$password=(string)($d['password']??'');
        $expected=$this->env['ADMIN_EMAIL']??'';$hash=$this->env['ADMIN_PASSWORD_HASH']??'';$plain=$this->env['ADMIN_PASSWORD']??'';
        if(($this->env['APP_ENV']??'development')==='production'&&$plain!=='')throw new ApiException('Configuração administrativa insegura.',503);
        $validPassword=$hash!==''?password_verify($password,$hash):($plain!==''&&hash_equals($plain,$password));
        if($expected===''||!hash_equals(strtolower($expected),strtolower($email))||!$validPassword) throw new ApiException('Credenciais inválidas.',401);
        session_regenerate_id(true);$_SESSION['admin']=true;$_SESSION['last_activity']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        return new JsonResponse(['data'=>['authenticated'=>true,'csrfToken'=>$_SESSION['csrf']]]);
    }

    private function logout(ServerRequestInterface $r): JsonResponse
    {
        $this->startSession();$this->csrf($r);$_SESSION=[];if(session_status()===PHP_SESSION_ACTIVE)session_destroy();return new JsonResponse(['data'=>null]);
    }

    private function admin(ServerRequestInterface $r, callable $action): ResponseInterface
    {
        $this->startSession();if(($_SESSION['admin']??false)!==true)throw new ApiException('Autenticação necessária.',401);
        $idle=max(300,(int)($this->env['SESSION_IDLE_SECONDS']??1800));if(time()-(int)($_SESSION['last_activity']??0)>$idle){$_SESSION=[];session_destroy();throw new ApiException('Sessão expirada.',401);}$_SESSION['last_activity']=time();
        if(!in_array($r->getMethod(),['GET','HEAD'],true))$this->csrf($r);return $action();
    }

    private function csrf(ServerRequestInterface $r): void
    {
        $provided=$r->getHeaderLine('X-CSRF-Token');if($provided===''||!hash_equals((string)($_SESSION['csrf']??''),$provided))throw new ApiException('Token CSRF inválido.',403);
    }

    private function startSession(): void
    {
        if(session_status()===PHP_SESSION_ACTIVE)return;
        ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
        session_name('adocat_admin');session_set_cookie_params(['httponly'=>true,'secure'=>filter_var($this->env['SESSION_SECURE']??'false',FILTER_VALIDATE_BOOLEAN),'samesite'=>'Lax','path'=>'/']);session_start();
    }

    private function listSubmissions(string $table): JsonResponse
    {
        $rows=$this->db->query("SELECT * FROM $table ORDER BY created_at DESC")->fetchAll();
        foreach($rows as &$row){$row=$this->camelize($row);if(isset($row['interests']))$row['interests']=json_decode($row['interests'],true)?:[];$row['consent']=(bool)$row['consent'];if(isset($row['screened']))$row['screened']=(bool)$row['screened'];}
        return new JsonResponse(['data'=>$rows]);
    }

    private function updateStatus(ServerRequestInterface $r,string $table): JsonResponse
    {
        $d=$this->json($r);$allowed=$table==='adoptions'?['pending','contacted','approved','rejected']:['pending','contacted','active'];
        if(!in_array($d['status']??null,$allowed,true))throw new ApiException('Status inválido.',422,['status'=>'Valor inválido.']);
        $id=(string)$r->getAttribute('id');$s=$this->db->prepare("UPDATE $table SET status=? WHERE id=?");$s->execute([$d['status'],$id]);if(!$this->exists($table,$id))throw new ApiException('Registro não encontrado.',404);return new JsonResponse(['data'=>$this->submission($table,$id)]);
    }

    private function upload(ServerRequestInterface $r): JsonResponse
    {
        foreach(['R2_ENDPOINT','R2_ACCESS_KEY','R2_SECRET_KEY','R2_BUCKET','R2_PUBLIC_URL'] as $key)if(($this->env[$key]??'')==='')throw new ApiException('Upload R2 não configurado.',503);
        $file=$r->getUploadedFiles()['image']??null;if(!$file||$file->getError()!==UPLOAD_ERR_OK)throw new ApiException('Envie o campo image.',422,['image'=>'Arquivo obrigatório.']);
        if($file->getSize()>3*1024*1024)throw new ApiException('Imagem excede 3 MB.',422,['image'=>'Arquivo muito grande.']);
        $stream=$file->getStream();$contents=$stream->getContents();$stream->rewind();$mime=(new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);$dimensions=@getimagesizefromstring($contents);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]??null;
        if(!$ext||$dimensions===false)throw new ApiException('Formato de imagem inválido.',422,['image'=>'Use JPEG, PNG ou WebP.']);
        $key='pets/'.date('Y/m').'/'.$this->uuid().'.'.$ext;
        $client=new S3Client(['version'=>'latest','region'=>$this->env['R2_REGION']??'auto','endpoint'=>$this->env['R2_ENDPOINT'],'credentials'=>['key'=>$this->env['R2_ACCESS_KEY'],'secret'=>$this->env['R2_SECRET_KEY']]]);
        $client->putObject(['Bucket'=>$this->env['R2_BUCKET'],'Key'=>$key,'Body'=>$contents,'ContentType'=>$mime]);
        $url=rtrim($this->env['R2_PUBLIC_URL'],'/').'/'.$key;return new JsonResponse(['data'=>['url'=>$url]],201);
    }

    private function notify(string $subject,string $body): void
    {
        if(($this->env['SMTP_HOST']??'')==='')return;
        try{$m=new PHPMailer(true);$m->isSMTP();$m->CharSet='UTF-8';$m->Timeout=8;$m->Host=$this->env['SMTP_HOST'];$m->Port=(int)($this->env['SMTP_PORT']??587);$m->SMTPAuth=($this->env['SMTP_USER']??'')!=='';$m->Username=$this->env['SMTP_USER']??'';$m->Password=$this->env['SMTP_PASSWORD']??'';$m->SMTPSecure=$this->env['SMTP_ENCRYPTION']??PHPMailer::ENCRYPTION_STARTTLS;$m->setFrom($this->env['MAIL_FROM']??'adocat.adocao@gmail.com');$m->addAddress($this->env['MAIL_TO']??'adocat.adocao@gmail.com');$m->Subject=$subject;$m->Body=$body;$m->send();}catch(Throwable $e){error_log('AdoCat SMTP notification failed: '.$e->getMessage());}
    }

    private function rateLimit(ServerRequestInterface $r,string $scope,?int $override=null): void
    {
        $dir=dirname(__DIR__).'/var/rate-limit';if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))throw new ApiException('Rate limit indisponível.',503);
        if(random_int(1,100)===1){foreach(glob($dir.'/*')?:[] as $old)if(is_file($old)&&filemtime($old)<time()-180)@unlink($old);}
        $ip=$r->getServerParams()['REMOTE_ADDR']??'unknown';$key=hash('sha256',$scope.'|'.$ip.'|'.date('YmdHi'));$file="$dir/$key";$handle=fopen($file,'c+');if($handle===false)throw new ApiException('Rate limit indisponível.',503);
        try{if(!flock($handle,LOCK_EX))throw new ApiException('Rate limit indisponível.',503);rewind($handle);$count=(int)stream_get_contents($handle);$limit=$override??max(1,(int)($this->env['RATE_LIMIT_PER_MINUTE']??30));if($count>=$limit)throw new ApiException('Muitas solicitações. Tente novamente em instantes.',429);rewind($handle);ftruncate($handle,0);fwrite($handle,(string)($count+1));fflush($handle);}finally{flock($handle,LOCK_UN);fclose($handle);}
    }

    private function validate(array $data,array $required): array { $f=[];foreach($required as $k)if(!array_key_exists($k,$data)||$data[$k]===''||$data[$k]===null)$f[$k]='Campo obrigatório.';return $f; }
    private function oneOf(array $d,array &$f,array $rules): void {foreach($rules as $k=>$values)if(isset($d[$k])&&!in_array($d[$k],$values,true))$f[$k]='Valor inválido.';}
    private function checkStrings(array $d,array &$f,array $rules): void {foreach($rules as $k=>$max){if($k==='message'&&($d[$k]??'')==='')continue;if(array_key_exists($k,$d)&&(!is_string($d[$k])||mb_strlen(trim($d[$k]))<($k==='name'?2:1)||mb_strlen($d[$k])>$max))$f[$k]='Texto inválido ou muito longo.';}}
    private function checkBooleans(array $d,array &$f,array $keys): void {foreach($keys as $k)if(array_key_exists($k,$d)&&!is_bool($d[$k]))$f[$k]='Informe verdadeiro ou falso.';}
    private function checkList(array $d,array &$f,string $key,int $min,int $max,int $itemMax): void {$value=$d[$key]??null;if(!is_array($value)||count($value)<$min||count($value)>$max){$f[$key]='Lista inválida.';return;}foreach($value as $item)if(!is_string($item)||trim($item)===''||mb_strlen($item)>$itemMax){$f[$key]='A lista contém item inválido.';break;}}
    private function checkUrl(array $d,array &$f,string $key,bool $required): void {$value=$d[$key]??null;if(($value===null||$value==='')&&!$required)return;if(!is_string($value)||mb_strlen($value)>2048||(!str_starts_with($value,'/')&&!filter_var($value,FILTER_VALIDATE_URL))||str_starts_with($value,'//')||(filter_var($value,FILTER_VALIDATE_URL)&&parse_url($value,PHP_URL_SCHEME)!=='https'))$f[$key]='Use uma URL HTTPS ou um caminho local.';}
    private function checkDate(array $d,array &$f,string $key): void {if(($d[$key]??null)===null)return;if(!is_string($d[$key])){$f[$key]='Data inválida.';return;}$date=\DateTimeImmutable::createFromFormat('!Y-m-d',$d[$key]);if(!$date||$date->format('Y-m-d')!==$d[$key])$f[$key]='Data inválida.';}
    private function exists(string $table,string $id): bool {$s=$this->db->prepare("SELECT 1 FROM $table WHERE id=?");$s->execute([$id]);return(bool)$s->fetchColumn();}
    private function recordStatus(string $table,string $id): ?string {$s=$this->db->prepare("SELECT status FROM $table WHERE id=?");$s->execute([$id]);$status=$s->fetchColumn();return$status===false?null:(string)$status;}
    private function submission(string $table,string $id): array {$s=$this->db->prepare("SELECT * FROM $table WHERE id=?");$s->execute([$id]);$row=$s->fetch();if(!$row)throw new ApiException('Registro não encontrado.',404);$row=$this->camelize($row);if(isset($row['interests']))$row['interests']=json_decode($row['interests'],true)?:[];$row['consent']=(bool)$row['consent'];if(isset($row['screened']))$row['screened']=(bool)$row['screened'];return$row;}
    private function deleteRecord(string $table,string $id): JsonResponse {if($table==='pets'){ $s=$this->db->prepare('SELECT 1 FROM adoptions WHERE pet_id=? LIMIT 1');$s->execute([$id]);if($s->fetchColumn())throw new ApiException('Este animal possui candidaturas. Altere seu status para preservar o histórico.',409);}$s=$this->db->prepare("DELETE FROM $table WHERE id=?");$s->execute([$id]);if($s->rowCount()===0)throw new ApiException('Registro não encontrado.',404);return new JsonResponse(['data'=>null]);}
    private function uuid(): string {$b=random_bytes(16);$b[6]=chr((ord($b[6])&0x0f)|0x40);$b[8]=chr((ord($b[8])&0x3f)|0x80);return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($b),4));}
    private function camelize(array $row): array {$out=[];foreach($row as $k=>$v){$out[preg_replace_callback('/_([a-z])/',fn($m)=>strtoupper($m[1]),$k)]=$v;}return$out;}
    private function publicConfig(): array {$key=trim($this->env['PIX_KEY']??'');$recipient=trim($this->env['DONATION_RECIPIENT']??'');$city=trim($this->env['DONATION_CITY']??'');$configured=$key!==''&&$recipient!==''&&$city!=='';return ['pixConfigured'=>$configured,'pixKey'=>$configured?$key:null,'donationRecipient'=>$configured?$recipient:null,'donationCity'=>$configured?$city:null];}
}

final class ApiException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status, public readonly array $fields=[]){parent::__construct($message);}
}
