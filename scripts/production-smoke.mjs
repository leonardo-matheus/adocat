import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const channel =
    process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const browser = await chromium.launch({ channel });
try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const manifest = await page.evaluate(async () => {
        const response = await fetch('/manifest.webmanifest');
        return response.json();
    });
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.icons.length, 2);
    await page.goto(`${baseURL}/amigos/faisca`);
    await page.getByRole('heading', { name: 'Faísca', exact: true }).waitFor();
    await context.setOffline(true);
    await page.goto(`${baseURL}/adotar`);
    await page.getByRole('heading', { name: 'Vamos nos reconectar?' }).waitFor();
    const cachedPaths = await page.evaluate(async () => {
        const keys = await caches.keys();
        const requests = await Promise.all(
            keys.map(async (key) => (await caches.open(key)).keys()),
        );
        return requests.flat().map((request) => new URL(request.url).pathname);
    });
    assert(cachedPaths.includes('/offline.html'));
    assert(!cachedPaths.some((path) => path.startsWith('/api') || path.startsWith('/admin')));
    await context.setOffline(false);
    await page.getByRole('link', { name: 'Tentar novamente' }).click();
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.match(await page.title(), /AdoCat/);
    assert.deepEqual(errors, []);
    console.log(
        'Produção: navegação direta, manifesto, service worker, página offline e reconexão passaram.',
    );
    await context.close();
} finally {
    await browser.close();
}
