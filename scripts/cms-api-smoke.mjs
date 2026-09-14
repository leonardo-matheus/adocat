import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.API_SITE_URL || 'http://127.0.0.1:5174';
const email = process.env.API_ADMIN_EMAIL;
const password = process.env.API_ADMIN_PASSWORD;
if (!email || !password)
    throw new Error('Defina API_ADMIN_EMAIL e API_ADMIN_PASSWORD para um banco de teste.');

const browser = await chromium.launch({
    channel:
        process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium'),
});
let page;
try {
    const team = await browser.newContext({
        baseURL: origin,
        viewport: { width: 1440, height: 1000 },
    });
    const visitor = await browser.newContext({ baseURL: origin });
    page = await team.newPage();
    const publicPage = await visitor.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/admin/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await page.getByRole('heading', { name: 'Visão geral' }).waitFor();
    let reads = 0;
    let finishDelayedRead;
    const delayedRead = new Promise((resolve) => {
        finishDelayedRead = resolve;
    });
    let releaseSave;
    const saveGate = new Promise((resolve) => {
        releaseSave = resolve;
    });
    await page.route('**/api/admin/content', async (route) => {
        if (route.request().method() === 'GET' && ++reads === 1) {
            const response = await route.fetch();
            // Force out-of-order StrictMode loads; a late response must not replace an edit.
            await new Promise((resolve) => setTimeout(resolve, 800));
            await route.fulfill({ response });
            finishDelayedRead();
        } else if (route.request().method() === 'PATCH') {
            await saveGate;
            await route.continue();
        } else {
            await route.continue();
        }
    });
    await page
        .locator('.admin-sidebar')
        .getByRole('button', { name: 'Conteúdo do site', exact: true })
        .click();
    await page.getByRole('button', { name: /Página inicial/ }).click();
    const title = `Cuidado compartilhado ${Date.now()}`;
    const titleInput = page.getByLabel('Título — primeira linha', { exact: true });
    await titleInput.fill(title);
    await delayedRead;
    await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(titleInput).toHaveValue(title);
    await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(titleInput).toBeDisabled();
    releaseSave();
    await page.getByText('Rascunho salvo.', { exact: true }).waitFor();
    await page.unroute('**/api/admin/content');
    await publicPage.goto('/');
    assert(
        !(await publicPage.locator('h1').innerText()).includes(title),
        'Rascunho não deve aparecer ao visitante',
    );
    assert.equal((await visitor.request.get('/api/admin/content')).status(), 401);
    await page.getByRole('button', { name: 'Publicar alterações' }).click();
    await page.locator('.cms-message.is-success').filter({ hasText: 'publicadas' }).waitFor();
    await publicPage.reload();
    await publicPage.getByRole('heading', { level: 1 }).filter({ hasText: title }).waitFor();

    const state = (await (await team.request.get('/api/admin/content')).json()).data;
    const session = (await (await team.request.get('/api/auth/session')).json()).data;
    const headers = { 'X-CSRF-Token': session.csrfToken };
    const stale = await team.request.post('/api/admin/content/publish', {
        headers,
        data: { revision: state.revision - 1 },
    });
    assert.equal(stale.status(), 409, 'Revisão antiga precisa ser rejeitada');
    const invalid = structuredClone(state.draft);
    invalid.values['home.hero.primaryHref'] = 'javascript:alert(1)';
    assert.equal(
        (
            await team.request.patch('/api/admin/content', {
                headers,
                data: { document: invalid, revision: state.revision },
            })
        ).status(),
        422,
    );
    assert.equal(
        (
            await team.request.post('/api/admin/content/publish', {
                data: { revision: state.revision },
            })
        ).status(),
        403,
    );

    await page
        .locator('.admin-sidebar')
        .getByRole('button', { name: 'Mídias', exact: true })
        .click();
    await page.getByLabel('Nome da mídia', { exact: true }).fill('Imagem CMS API');
    await page.getByLabel('Texto alternativo', { exact: true }).fill('Luna descansando');
    await page.getByLabel('Endereço da imagem', { exact: true }).fill('/images/luna.jpg');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await page.locator('.cms-media-card').filter({ hasText: 'Imagem CMS API' }).waitFor();
    assert(
        (await (await team.request.get('/api/admin/media')).json()).data.some(
            (item) => item.name === 'Imagem CMS API',
        ),
    );
    await mkdir('output/qa', { recursive: true });
    await page.screenshot({ path: 'output/qa/cms-api-media.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
        'CMS API: login, rascunho privado, publicação compartilhada, revisão, validação, CSRF e mídia persistida passaram.',
    );
} catch (error) {
    await mkdir('output/qa', { recursive: true });
    await page?.screenshot({ path: 'output/qa/cms-api-failure.png', fullPage: true });
    throw error;
} finally {
    await browser.close();
}
