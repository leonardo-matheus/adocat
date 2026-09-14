# Publicação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` valida, gera e publica o frontend automaticamente. Ele roda a cada envio para a branch `main` e também pode ser iniciado manualmente pela aba **Actions**.

## Repositório e publicação

- Código: [leonardo-matheus/adocat](https://github.com/leonardo-matheus/adocat).
- Site: [leonardo-matheus.github.io/adocat](https://leonardo-matheus.github.io/adocat/).
- Execuções: [Deploy GitHub Pages](https://github.com/leonardo-matheus/adocat/actions/workflows/deploy-pages.yml).

O Pages deste repositório está configurado com **GitHub Actions** como fonte em **Settings > Pages**. Para trabalhar em outra máquina, clone o projeto:

```bash
git clone https://github.com/leonardo-matheus/adocat.git
cd adocat
npm ci
```

Depois de validar e registrar suas alterações em commits, envie a branch `main` com `git push origin main`. Acompanhe a publicação na aba **Actions**.

O workflow não exige token pessoal nem segredo do repositório. O GitHub fornece as permissões temporárias necessárias para publicar no ambiente `github-pages`. O envio inicial com `git push` usa a autenticação da sua conta GitHub.

## Endereço e caminho base

O caminho público é obtido automaticamente do GitHub. Em um site de projeto, os arquivos e links usam `/nome-do-repositorio/`; em um domínio personalizado ou repositório de usuário, usam `/`. Assim, não é necessário alterar o código ao mudar entre esses formatos.

Neste repositório, a base é `/adocat/`. O endereço final também aparece na etapa de deploy e na página **Settings > Pages**. O workflow publica somente o conteúdo gerado em `dist/`.

## Escopo desta publicação

O GitHub Pages hospeda apenas arquivos estáticos. Por isso, este deploy força o modo demonstrativo e usa rotas com hash, por exemplo `/adocat/#/adotar`. Formulários e alterações administrativas ficam no armazenamento do navegador e não são compartilhados com outros visitantes.

A API PHP, o MySQL, o envio de e-mail e os uploads R2 precisam de hospedagem com suporte a processos de servidor. A API atual usa sessão, cookies e proteção CSRF na mesma origem; apontá-la diretamente para outro domínio exige ajustes de CORS, cookies e CSRF. Para produção com dados reais, publique frontend e API na mesma origem conforme o exemplo Apache do projeto. A demonstração do PIX não recebe nem confirma pagamentos.

## Validar antes de enviar

```bash
npm ci
npm test
npm run build:pages
npm run test:pages
```

No Windows, o teste usa o Microsoft Edge instalado. Em Linux/macOS, instale o navegador uma vez com `npx playwright install --with-deps chromium`. O workflow faz essa instalação automaticamente.

Para simular um site de projeto no PowerShell:

```powershell
$env:VITE_BASE_PATH = '/adocat/'
$env:PAGES_TEST_BASE_PATH = '/adocat/'
npm run build:pages
npm run test:pages
```

O teste inicia e encerra seu próprio servidor. Ele verifica os arquivos publicados, rotas com hash, filtros, manifesto, service worker e reconexão offline. O build padrão `npm run build` continua disponível para hospedagem com servidor e rotas normais. Não coloque senhas ou tokens em variáveis `VITE_*`: seus valores entram nos arquivos públicos.

## Execução do workflow

Antes da publicação, o GitHub Actions:

1. instala as dependências com Node.js 24;
2. executa os testes do projeto;
3. gera o build com a base pública informada pelo Pages;
4. abre a versão estática em um servidor estrito e testa a navegação com Chromium;
5. publica `dist/` somente se todas as verificações passarem.

Uma nova publicação ocorre ao enviar commits para `main`. Para republicar sem novo commit, abra o workflow na aba **Actions** e selecione **Run workflow**.
