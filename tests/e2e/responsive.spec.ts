import { expect, test, type Page } from '@playwright/test';

async function fitsViewport(page: Page) {
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
}

async function ready(page: Page) {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
}

test.describe('adaptação ao espaço disponível', () => {
    test.use({ reducedMotion: 'reduce' });
    test.skip(({ isMobile }) => isMobile, 'A matriz abaixo define suas próprias dimensões.');

    for (const width of [320, 390, 600, 768, 820, 881, 1024, 1440, 1920]) {
        test(`páginas e controles cabem em ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            for (const route of ['/', '/adotar', '/amigos/faisca', '/sobre', '/voluntariado']) {
                await page.goto(route);
                await ready(page);
                await fitsViewport(page);
            }
            await page.goto('/adotar');
            await expect(page.locator('.pet-card')).toHaveCount(8);
            const sizes = await page
                .locator('.favorite-button, .filter-tabs button, .favorites-filter, select')
                .evaluateAll((elements) =>
                    elements.map((element) => {
                        const { width, height } = element.getBoundingClientRect();
                        return { width, height };
                    }),
                );
            for (const size of sizes) {
                expect(size.width).toBeGreaterThanOrEqual(44);
                expect(size.height).toBeGreaterThanOrEqual(44);
            }
            await page.getByRole('combobox', { name: 'Cidade', exact: true }).selectOption('Matão');
            await expect(page.locator('.pet-card')).toHaveCount(4);
            await fitsViewport(page);
        });
    }

    test('menu permanece acessível em paisagem e devolve o foco', async ({ page }) => {
        await page.setViewportSize({ width: 740, height: 320 });
        await page.goto('/');
        const toggle = page.getByRole('button', { name: 'Abrir menu' });
        await toggle.click();
        const menu = page.getByRole('navigation', { name: 'Navegação principal' });
        const bounds = await menu.boundingBox();
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(320);
        await menu.getByRole('link', { name: 'Dicas e cuidados' }).click();
        await expect(page).toHaveURL('/conteudos');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('doação cabe na altura disponível e aceita entrada sem ampliar campos', async ({
        page,
    }) => {
        for (const viewport of [
            { width: 320, height: 568 },
            { width: 844, height: 390 },
        ]) {
            await page.setViewportSize(viewport);
            await page.goto('/doar');
            const open = page.getByRole('button', { name: 'Quero contribuir' });
            await open.click();
            const dialog = page.getByRole('dialog');
            const bounds = await dialog.boundingBox();
            expect(bounds!.y).toBeGreaterThanOrEqual(0);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
            expect(
                await dialog.evaluate((element) => element.scrollWidth - element.clientWidth),
            ).toBeLessThanOrEqual(1);
            const value = page.getByLabel('Outro valor (R$)');
            expect(
                await value.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
            ).toBeGreaterThanOrEqual(16);
            await value.fill('75');
            await expect(value).toHaveValue('75');
            await dialog.getByRole('link', { name: 'Falar com a AdoCat' }).scrollIntoViewIfNeeded();
            await expect(dialog.getByRole('link', { name: 'Falar com a AdoCat' })).toBeInViewport();
            await page.keyboard.press('Escape');
            await expect(open).toBeFocused();
        }
    });

    test('conteúdo e navegação longos publicados pelo CMS se reorganizam', async ({ page }) => {
        await page.addInitScript(() => {
            const content = {
                values: {
                    'brand.name': 'Associação AdoCat',
                    'site.donateLabel': 'Ajude a transformar uma vida',
                    'home.hero.titleLine1': 'Todo grande recomeço',
                    'home.hero.titleLine2': 'merece acolhimento e carinho.',
                },
                navigation: Array.from({ length: 9 }, (_, index) => ({
                    id: `menu-${index}`,
                    label: `Dicas para cuidar com amor ${index + 1}`,
                    href: '/conteudos',
                    visible: true,
                    newTab: false,
                })),
            };
            localStorage.setItem(
                'adocat-content-v1',
                JSON.stringify({ draft: content, published: content, revision: 1 }),
            );
        });
        for (const width of [320, 390, 768, 881, 1440]) {
            await page.setViewportSize({ width, height: 740 });
            await page.goto('/');
            await ready(page);
            await expect(page.getByRole('heading', { level: 1 })).toContainText(
                'Todo grande recomeço',
            );
            await fitsViewport(page);
            const brand = page.locator('.header-inner .brand');
            expect((await brand.boundingBox())!.height).toBeLessThanOrEqual(70);
            await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
            const menu = page.getByRole('navigation', { name: 'Navegação principal' });
            const bounds = await menu.boundingBox();
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(740);
            await menu.getByRole('link', { name: 'Dicas para cuidar com amor 9' }).click();
            await expect(page).toHaveURL('/conteudos');
        }
    });

    for (const viewport of [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 740, height: 320 },
    ]) {
        test(`painel e edição de animais em ${viewport.width}x${viewport.height}`, async ({
            page,
        }) => {
            await page.setViewportSize(viewport);
            await page.addInitScript(() =>
                sessionStorage.setItem('adocat-demo-session', 'authenticated'),
            );
            await page.goto('/admin');
            await ready(page);
            const navigate = async (name: string) => {
                const toggle = page.locator('.admin-menu');
                if (await toggle.isVisible()) await toggle.click();
                await page
                    .locator('.admin-sidebar')
                    .getByRole('button', { name, exact: true })
                    .click();
                await ready(page);
            };
            for (const name of [
                'Animais',
                'Triagens',
                'Voluntários',
                'Campanhas',
                'Conteúdo do site',
                'Artigos',
                'Mídias',
                'Menus e botões',
                'Integrações',
            ]) {
                await navigate(name);
                await fitsViewport(page);
                await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
            }
            await navigate('Animais');
            await page.getByRole('button', { name: 'Novo animal' }).click();
            const dialog = page.getByRole('dialog');
            const card = dialog.locator('.modal-card');
            const bounds = await card.boundingBox();
            expect(bounds!.y).toBeGreaterThanOrEqual(0);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
            const name = dialog.getByLabel('Nome', { exact: true });
            expect(
                await name.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
            ).toBeGreaterThanOrEqual(16);
            await name.fill('Amigo de teste');
            const save = dialog.getByRole('button', { name: 'Salvar', exact: true });
            await save.scrollIntoViewIfNeeded();
            await expect(save).toBeInViewport();
            await fitsViewport(page);
            await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
        });
    }

    test('menu do painel permite navegação por teclado sem focar controles ocultos', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.addInitScript(() =>
            sessionStorage.setItem('adocat-demo-session', 'authenticated'),
        );
        await page.goto('/admin');
        await ready(page);
        const toggle = page.locator('.admin-menu');
        const sidebar = page.locator('.admin-sidebar');
        await expect(sidebar).toBeHidden();
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-label', 'Fechar menu');
        await expect(
            sidebar.getByRole('button', { name: 'Visão geral', exact: true }),
        ).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(sidebar.getByRole('button', { name: 'Animais', exact: true })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Animais');
        await expect(sidebar).toBeHidden();
        await toggle.click();
        await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await page.keyboard.press('Tab');
        await expect(sidebar.locator(':focus')).toHaveCount(0);
        await toggle.click();
        await page.locator('.admin-avatar').click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await page.setViewportSize({ width: 1024, height: 768 });
        await expect(sidebar).toBeVisible();
        await page.setViewportSize({ width: 320, height: 568 });
        await expect(sidebar).toBeHidden();
    });
});
