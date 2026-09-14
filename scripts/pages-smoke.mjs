import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const distDirectory = path.resolve('dist');
const channel =
    process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');

function normalizeBasePath(value) {
    let basePath = String(value || '/')
        .trim()
        .replaceAll('\\', '/');
    if (!basePath.startsWith('/')) basePath = `/${basePath}`;
    basePath = basePath.replace(/\/{2,}/g, '/');
    if (!basePath.endsWith('/')) basePath += '/';
    assert(!basePath.includes('..'), 'PAGES_TEST_BASE_PATH não pode conter "..".');
    return basePath;
}

const basePath = normalizeBasePath(process.env.PAGES_TEST_BASE_PATH);
const contentTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.webmanifest', 'application/manifest+json; charset=utf-8'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2'],
]);

function sendStatus(response, status) {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`${status}\n`);
}

async function serveStatic(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        sendStatus(response, 405);
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
        sendStatus(response, 400);
        return;
    }

    const mountWithoutSlash = basePath === '/' ? '/' : basePath.slice(0, -1);
    if (pathname === mountWithoutSlash && basePath !== '/') {
        response.writeHead(308, { Location: basePath });
        response.end();
        return;
    }
    if (!pathname.startsWith(basePath) || pathname.includes('\0') || pathname.includes('\\')) {
        sendStatus(response, 404);
        return;
    }

    let relativePath = pathname.slice(basePath.length);
    if (!relativePath) relativePath = 'index.html';
    const segments = relativePath.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.')) {
        sendStatus(response, 404);
        return;
    }

    const filePath = path.resolve(distDirectory, ...segments);
    const relativeToDist = path.relative(distDirectory, filePath);
    if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
        sendStatus(response, 404);
        return;
    }

    try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) throw new Error('Not a file');
        response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Length': fileStat.size,
            'Content-Type':
                contentTypes.get(path.extname(filePath).toLowerCase()) ||
                'application/octet-stream',
        });
        if (request.method === 'HEAD') response.end();
        else createReadStream(filePath).pipe(response);
    } catch {
        sendStatus(response, 404);
    }
}

const server = createServer((request, response) => {
    serveStatic(request, response).catch((error) => {
        console.error(error);
        if (!response.headersSent) sendStatus(response, 500);
        else response.destroy(error);
    });
});

await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
assert(address && typeof address === 'object');
const origin = `http://127.0.0.1:${address.port}`;
const siteURL = new URL(basePath, origin).href;
let browser;

try {
    const outsideResponse = await fetch(new URL('/__outside-pages-base__', origin));
    assert.equal(
        outsideResponse.status,
        404,
        'O servidor não pode aplicar fallback SPA fora da base.',
    );
    const directRouteResponse = await fetch(new URL(`${basePath}adotar`, origin));
    assert.equal(
        directRouteResponse.status,
        404,
        'O servidor estrito não pode aplicar fallback SPA a uma rota sem hash.',
    );

    browser = await chromium.launch({ channel });
    const context = await browser.newContext();
    const page = await context.newPage();
    const runtimeErrors = [];
    const failedRequests = [];
    const errorResponses = [];
    const apiRequests = [];

    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('response', (response) => {
        if (response.status() >= 400) {
            errorResponses.push(`${response.status()} ${response.url()}`);
        }
    });
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (/\/api(?:\/|$)/.test(url.pathname)) apiRequests.push(url.href);
    });
    page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });

    await page.goto(siteURL, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.match(await page.title(), /AdoCat/);

    const initialURL = page.url();
    const skipLink = page.locator('.skip-link');
    await skipLink.focus();
    await skipLink.click();
    assert.equal(page.url(), initialURL, 'O link de salto não pode alterar a rota com hash.');
    assert.equal(
        await page.evaluate(() => document.activeElement?.id),
        'main-content',
        'O link de salto precisa mover o foco para o conteúdo principal.',
    );

    await page.evaluate(async () => {
        const step = Math.max(window.innerHeight * 0.75, 400);
        for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
            window.scrollTo({ top, behavior: 'instant' });
            await new Promise((resolve) => window.setTimeout(resolve, 50));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForLoadState('networkidle');

    const brokenImages = await page
        .locator('img')
        .evaluateAll((images) =>
            images
                .filter((image) => !image.complete || image.naturalWidth === 0)
                .map((image) => image.currentSrc || image.src),
        );
    assert.deepEqual(brokenImages, [], 'Há imagens quebradas na página inicial.');
    await page.evaluate(() => document.fonts.ready);
    const failedFonts = await page.evaluate(() =>
        [...document.fonts].filter((font) => font.status === 'error').map((font) => font.family),
    );
    assert.deepEqual(failedFonts, [], 'Há fontes que falharam ao carregar.');

    const internalLinks = await page.locator('a[href]').evaluateAll(
        (links, expectedBase) =>
            links
                .map((link) => link.href)
                .filter((href) => href.startsWith(window.location.origin))
                .filter((href) => !new URL(href).pathname.startsWith(expectedBase)),
        basePath,
    );
    assert.deepEqual(internalLinks, [], 'Há links internos que escapam do caminho base.');

    await page
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('link', { name: 'Quero adotar' })
        .click();
    await page.getByRole('heading', { name: 'Quem vai ganhar seu coração?' }).waitFor();
    assert.equal(new URL(page.url()).pathname, basePath);
    assert.match(new URL(page.url()).hash, /^#\/adotar/);

    await page.getByRole('button', { name: 'Gatos' }).click();
    await page.getByLabel(/^Idade/).selectOption('kitten');
    await page.getByLabel('Buscar por nome ou personalidade').fill('Faísca');
    await page.getByText('1 amigo encontrado', { exact: true }).waitFor();
    assert.match(new URL(page.url()).hash, /especie=cat/);
    assert.match(new URL(page.url()).hash, /idade=kitten/);
    assert.match(new URL(page.url()).hash, /busca=Fa%C3%ADsca/);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByLabel(/^Idade/).inputValue(), 'kitten');
    assert.equal(await page.getByLabel('Buscar por nome ou personalidade').inputValue(), 'Faísca');
    await page.getByText('1 amigo encontrado', { exact: true }).waitFor();

    await page.goto(`${siteURL}#/amigos/faisca`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Faísca', exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Faísca', exact: true }).waitFor();

    await page.goto(`${siteURL}#/admin/entrar`);
    await page.getByLabel('E-mail', { exact: true }).fill('demo@adocat.org');
    await page.locator('#login-password').fill('adocat-demo');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await page.getByRole('heading', { name: 'Visão geral' }).waitFor();
    await page
        .locator('.admin-sidebar')
        .getByRole('button', { name: 'Menus e botões', exact: true })
        .click();
    const menuItem = page.locator('.cms-nav-row').first();
    await menuItem.getByLabel('Nome', { exact: true }).fill('Conteúdo gerenciado');
    await menuItem.getByLabel('Destino', { exact: true }).fill('/sobre');
    await menuItem.getByLabel('Nova aba', { exact: true }).check();
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await page.getByText('Rascunho salvo.', { exact: true }).waitFor();
    await page
        .locator('.admin-sidebar')
        .getByRole('button', { name: 'Conteúdo do site', exact: true })
        .click();
    await page.getByRole('button', { name: /Página inicial/ }).click();
    await page.getByLabel('Link institucional', { exact: true }).fill('Voltar à apresentação');
    await page.getByLabel('Destino do link institucional', { exact: true }).fill('#main-content');
    await page.getByRole('button', { name: 'Ver prévia', exact: true }).click();
    await page.getByText('Prévia do rascunho', { exact: true }).waitFor();
    assert.equal(
        new URL(page.url()).pathname,
        basePath,
        'A prévia precisa permanecer na base do Pages.',
    );
    await page.getByRole('button', { name: 'Voltar ao painel' }).click();
    await page
        .locator('.admin-sidebar')
        .getByRole('button', { name: 'Conteúdo do site', exact: true })
        .click();
    await page.getByRole('button', { name: 'Publicar alterações' }).click();
    await page.locator('.cms-message.is-success').waitFor();
    await page.goto(siteURL);
    const newTab = page.waitForEvent('popup');
    await page
        .locator('#main-navigation')
        .getByRole('link', { name: 'Conteúdo gerenciado' })
        .click();
    const popup = await newTab;
    await popup.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(
        new URL(popup.url()).pathname,
        basePath,
        'Menu em nova aba precisa preservar o caminho base.',
    );
    assert.match(new URL(popup.url()).hash, /^#\/sobre/);
    await popup.close();
    await page.getByRole('link', { name: 'Voltar à apresentação', exact: true }).click();
    assert.match(
        new URL(page.url()).hash,
        /^#\/#main-content$/,
        'Âncora editável precisa preservar a rota hash.',
    );
    await page.getByRole('heading', { level: 1 }).filter({ hasText: 'Todo amor' }).waitFor();
    await page.goto(`${siteURL}#/amigos/faisca`, { waitUntil: 'networkidle' });

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    assert(manifestHref, 'A página precisa declarar um manifesto.');
    const manifestURL = new URL(manifestHref, page.url());
    assert(manifestURL.pathname.startsWith(basePath));
    const manifestResponse = await context.request.get(manifestURL.href);
    assert(manifestResponse.ok(), 'O manifesto não pôde ser carregado.');
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, 'standalone');
    assert(Array.isArray(manifest.icons) && manifest.icons.length > 0);
    for (const field of ['id', 'scope', 'start_url']) {
        const target = new URL(manifest[field], manifestURL);
        assert(target.pathname.startsWith(basePath), `${field} do manifesto escapou da base.`);
    }
    for (const icon of manifest.icons) {
        const iconURL = new URL(icon.src, manifestURL);
        assert(iconURL.pathname.startsWith(basePath), 'Um ícone do manifesto escapou da base.');
        assert(
            (await context.request.get(iconURL.href)).ok(),
            `Ícone indisponível: ${iconURL.href}`,
        );
    }

    const registration = await page.evaluate(async () => {
        const ready = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) =>
                window.setTimeout(
                    () => reject(new Error('Service worker não ficou ativo em 30 segundos.')),
                    30_000,
                ),
            ),
        ]);
        return { scope: ready.scope, scriptURL: ready.active?.scriptURL };
    });
    assert.equal(new URL(registration.scope).pathname, basePath);
    assert(registration.scriptURL);
    assert(new URL(registration.scriptURL).pathname.startsWith(basePath));
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

    assert.deepEqual(apiRequests, [], 'O build demonstrativo tentou acessar a API.');
    assert.deepEqual(failedRequests, [], 'Houve requisições que falharam antes do teste offline.');
    assert.deepEqual(errorResponses, [], 'Houve respostas HTTP com erro antes do teste offline.');
    assert.deepEqual(runtimeErrors, [], 'Houve erros no console ou na página.');

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Vamos nos reconectar?' }).waitFor();
    const reconnectHref = await page
        .getByRole('link', { name: 'Tentar novamente' })
        .getAttribute('href');
    assert(reconnectHref);
    assert.equal(new URL(reconnectHref, page.url()).pathname, basePath);

    await context.setOffline(false);
    await page.getByRole('link', { name: 'Tentar novamente' }).click();
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(new URL(page.url()).pathname, basePath);

    await context.close();
    console.log(`GitHub Pages: smoke test aprovado em ${basePath}`);
} finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
    );
}
