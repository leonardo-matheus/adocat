import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../output/qa/', import.meta.url);
await mkdir(directory, { recursive: true });
const channel =
    process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const browser = await chromium.launch({ channel, headless: true });
const results = [];
try {
    for (const [name, viewport] of [
        ['desktop', { width: 1440, height: 1000 }],
        ['mobile', { width: 390, height: 844 }],
    ]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        for (const [route, slug] of [
            ['/', 'home'],
            ['/adotar', 'catalog'],
            ['/amigos/faisca', 'detail'],
            ['/doar', 'donations'],
            ['/adotar/faisca', 'adoption'],
            ['/voluntariado', 'volunteer'],
            ['/admin/entrar', 'login'],
            ['/sobre', 'about'],
            ['/conteudos/casa-segura-para-gatos', 'article'],
            ['/privacidade', 'privacy'],
        ]) {
            await page.goto(`http://127.0.0.1:5173${route}`);
            await page.waitForLoadState('networkidle');
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(async () => {
                for (const image of document.images) image.loading = 'eager';
                await Promise.all(
                    [...document.images].map((image) => image.decode().catch(() => {})),
                );
            });
            await page.screenshot({
                path: fileURLToPath(new URL(`${name}-${slug}.png`, directory)),
                fullPage: true,
            });
            const layout = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > window.innerWidth,
                brokenImages: [...document.images]
                    .filter((image) => !image.complete || image.naturalWidth === 0)
                    .map((image) => image.src),
            }));
            const accessibility = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                .analyze();
            results.push({
                name,
                route,
                ...layout,
                errors: [...errors],
                violations: accessibility.violations.map(({ id, impact, nodes }) => ({
                    id,
                    impact,
                    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
                })),
            });
            if (route === '/doar') {
                await page.getByRole('button', { name: 'Quero contribuir' }).click();
                const modalAccessibility = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                    .analyze();
                results.push({
                    name,
                    route: '/doar#dialog',
                    violations: modalAccessibility.violations.map(({ id, impact, nodes }) => ({
                        id,
                        impact,
                        nodes: nodes.map(({ target, failureSummary }) => ({
                            target,
                            failureSummary,
                        })),
                    })),
                });
            }
        }
        await context.close();
    }
    await writeFile(new URL('browser-audit.json', directory), JSON.stringify(results, null, 4));
    console.log(
        JSON.stringify(
            results.map(({ name, route, overflow, brokenImages, errors, violations }) => ({
                name,
                route,
                overflow,
                brokenImages,
                errors,
                violations: violations.map(({ id, nodes }) => `${id} (${nodes.length})`),
            })),
            null,
            2,
        ),
    );
} finally {
    await browser.close();
}
