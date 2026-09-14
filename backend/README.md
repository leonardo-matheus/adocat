# API AdoCat

API REST em PHP 8.2, Mezzio/PSR-15 e PDO. MySQL é o banco de produção; SQLite permite desenvolvimento e testes locais.

## Instalação local

```powershell
cd backend
Copy-Item .env.example .env
composer install
php -f bin/migrate.php
php -f bin/seed.php
php -S 127.0.0.1:8080 -t public
```

É necessário PHP 8.2 ou mais recente com as extensões `json`, `pdo`, `fileinfo` e `mbstring`, além do driver do banco escolhido (`pdo_sqlite` no desenvolvimento ou `pdo_mysql` em produção). Se existir uma cópia local do Composer em `tools/composer.phar`, `php tools/composer.phar install` pode substituir `composer install`.

O `.env.example` já aponta para SQLite local. Execute os comandos a partir de `backend`, pois o caminho é relativo a essa pasta. O servidor de desenvolvimento deve permanecer em loopback. O seed contém somente dados demonstrativos, é opcional e insere apenas IDs ausentes; não o inclua como etapa obrigatória do deploy de produção.

Em produção, crie um banco MySQL 8 com `utf8mb4`, configure `DB_DSN=mysql:host=127.0.0.1;dbname=adocat;charset=utf8mb4`, `DB_USER` e `DB_PASSWORD`, e então execute `php -f bin/migrate.php`. Sirva somente `backend/public` no caminho `/api`, na mesma origem do frontend; veja [a configuração Apache](../deploy/apache.example.conf).

Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH` (gerado por `php -r "echo password_hash('senha', PASSWORD_DEFAULT);"`) antes de usar o painel. `ADMIN_PASSWORD` funciona apenas em desenvolvimento e causa erro de configuração se estiver definido com `APP_ENV=production`. Cookies usam HttpOnly, SameSite=Lax, IDs estritos e expiração por inatividade; ative `SESSION_SECURE=true` sob HTTPS. Toda escrita administrativa exige o token retornado por `GET /api/auth/session` no header `X-CSRF-Token`.

SMTP é opcional. Quando configurado, novos formulários geram uma notificação UTF-8 sem incluir PII no log. Falha de notificação é registrada e o formulário permanece salvo. Upload administrativo exige todas as variáveis `R2_*`; sem elas a API responde `503`, e nunca retorna uma URL fictícia. O conteúdo completo é validado como JPEG, PNG ou WebP de até 3 MB. Configure `upload_max_filesize=3M` e `post_max_size=4M` ou mais no PHP do servidor.

## Contrato

Todas as respostas bem-sucedidas usam `{ "data": ... }`; erros usam `{ "error": { "message": "...", "fields": {} } }`. Rotas públicas: `GET /api/pets`, `GET /api/pets/{id}`, `GET /api/campaigns`, `GET /api/config`, `POST /api/adoptions` e `POST /api/volunteers`. A vitrine inclui animais disponíveis e em tratamento; apenas disponíveis recebem candidatura. Campanhas ativas e concluídas permanecem públicas. O PIX só é marcado como configurado quando chave, favorecido e cidade foram explicitamente definidos.

Autenticação: `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/logout`. Administração: CRUD de `/api/admin/pets`; listagem e alteração de status em `/api/admin/adoptions/{id}` e `/api/admin/volunteers/{id}`; `GET`, `POST` e `PATCH /api/admin/campaigns/{id}`; upload multipart `image` em `/api/admin/uploads`.

## Verificação

```powershell
composer lint
composer test
pwsh -File tests/integration.ps1 -Port 8080
```

O teste HTTP usa PowerShell 7 (`pwsh`) e um banco SQLite temporário. Se estiver usando o PHAR local, substitua `composer` por `php tools/composer.phar` nesses comandos.

Não registre corpos de requisição: adoções e voluntários contêm dados pessoais. Em Apache, habilite `mod_rewrite` e negue acesso ao restante do projeto.
