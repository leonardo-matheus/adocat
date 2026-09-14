# AdoCat

Plataforma web da ONG AdoCat para apresentar animais, receber candidaturas de adoção, organizar voluntários e divulgar campanhas. A interface pública inclui catálogo com filtros, perfis detalhados, favoritos, formulário de adoção, página de doações, conteúdo educativo e painel administrativo responsivo.

[Acessar a demonstração](https://leonardo-matheus.github.io/adocat/) · [Acompanhar os deploys](https://github.com/leonardo-matheus/adocat/actions/workflows/deploy-pages.yml)

O repositório vem pronto para demonstração no navegador. Os animais, histórias, campanhas e valores iniciais são ilustrativos e podem ser substituídos em `src/data/seed.ts`. As fotografias e fontes usadas no projeto estão documentadas em [ASSETS.md](./ASSETS.md).

## Demonstração local

Requisitos: Node.js 22 ou mais recente e npm. O projeto usa Vitest 4; o runtime de desenvolvimento atual é Node.js 24.

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:5173`. O painel fica em `/admin` e, no modo de demonstração, aceita:

- e-mail: `demo@adocat.org`
- senha: `adocat-demo`

Nesse modo, alterações do painel e formulários são gravados somente no `localStorage`/`sessionStorage` do navegador. Esse armazenamento serve para teste local, não oferece persistência compartilhada, controle de acesso real ou garantia de conservação dos dados. Limpe os dados do site no navegador para restaurar o seed inicial.

## Modo API

O frontend usa a API PHP quando estas variáveis são definidas antes do build ou em um arquivo `.env.local`:

```dotenv
VITE_DATA_MODE=api
VITE_API_URL=/api
```

Para desenvolvimento, inicie o backend em `127.0.0.1:8080` conforme [backend/README.md](./backend/README.md) e depois execute `npm run dev`. O proxy já configurado no Vite encaminha `/api` para o PHP na porta 8080, mantendo cookies de sessão e proteção CSRF na mesma origem vista pelo navegador. Se a porta estiver ocupada, inicie o PHP em outra porta e ajuste `API_PROXY_TARGET` no `.env.local`.

As credenciais de demonstração não valem no modo API. Configure credenciais administrativas próprias e todos os serviços necessários no `.env` privado do backend. SMTP é necessário para notificações por e-mail, R2 para uploads públicos de imagens e PIX para exibir dados de contribuição. Esses serviços e segredos não acompanham o repositório.

## Limites funcionais

As campanhas são cadastradas e atualizadas manualmente no painel. A aplicação não consulta banco, concilia pagamentos, confirma depósitos ou processa cobrança recorrente. A equipe deve conferir cada contribuição pelos canais oficiais antes de atualizar o valor arrecadado.

Os artigos incluídos são conteúdo editorial inicial e podem ser substituídos. Antes de publicar, revise todos os textos, perfis, campanhas, contatos e políticas com a ONG. Formulários reais contêm dados pessoais e exigem rotina operacional de atendimento, retenção e exclusão adequada.

## Verificação

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

No Windows, os testes E2E usam o Microsoft Edge instalado no sistema por padrão. Em Linux e macOS, usam o Chromium distribuído pelo Playwright; instale-o antes da primeira execução:

```bash
npx playwright install chromium
```

Para usar esse Chromium também no Windows, instale-o com o comando acima e defina `PLAYWRIGHT_CHANNEL=chromium`. No PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:e2e
```

A API possui comandos próprios de lint, testes e integração descritos em `backend/README.md`.

Também há verificações de acessibilidade e capturas em `node scripts/visual-qa.mjs`, e de instalação/cache offline em `node scripts/production-smoke.mjs` (requer `npm run preview` em execução). O fluxo completo contra a API está em `node scripts/api-browser-smoke.mjs`: execute somente com banco de teste, pois cria candidaturas, voluntários e campanhas. Configure `API_SITE_URL`, `API_ADMIN_EMAIL` e `API_ADMIN_PASSWORD`; por padrão usa `http://127.0.0.1:5174` e as credenciais locais do teste de integração. Os relatórios ficam em `output/qa/`.

## Produção

Gere o frontend com `npm run build` e publique `dist/` no DocumentRoot. Sirva a API PHP em `/api` na mesma origem por meio de um `Alias` para `backend/public`; um exemplo está em [deploy/apache.example.conf](./deploy/apache.example.conf). Essa composição preserva os cookies de sessão e evita configuração cross-origin.

Para publicar uma demonstração estática, o projeto também inclui um workflow do GitHub Actions pronto para o GitHub Pages. Ele ajusta automaticamente o caminho base do repositório, valida o build em Chromium e publica somente `dist/`. Siga o [guia de publicação no GitHub Pages](./deploy/GITHUB_PAGES.md). Esse formato usa dados locais do navegador e não executa a API PHP ou o MySQL.

Use HTTPS, defina `APP_ENV=production` e `SESSION_SECURE=true` no backend e mantenha `.env`, `vendor/`, banco local, logs, ferramentas e código-fonte fora de qualquer diretório público. Somente `dist/` e `backend/public/` devem ser alcançáveis pelo servidor web. Adapte o handler PHP do exemplo ao PHP-FPM ou módulo PHP disponível no servidor.

Antes do deploy, configure fora do controle de versão:

- banco MySQL e migrações;
- e-mail e hash de senha do administrador;
- SMTP e destinatários das notificações;
- bucket, credenciais e domínio público do R2;
- chave PIX, favorecido e cidade;
- certificados TLS, permissões de escrita e backups.

## Estrutura

```text
src/
  components/       componentes compartilhados
  data/             dados iniciais da demonstração
  lib/              tipos, acesso à API e utilitários
  pages/            páginas públicas e administrativas
public/
  fonts/             fontes locais
  icons/             ícones e marca reduzida
  images/            logo e fotografias ilustrativas
backend/
  public/            único diretório público da API
  src/               aplicação PHP
  migrations/        esquemas SQLite e MySQL
  tests/             testes unitários e de integração
deploy/              exemplos de configuração de infraestrutura
output/qa/           artefatos locais de revisão visual
```
