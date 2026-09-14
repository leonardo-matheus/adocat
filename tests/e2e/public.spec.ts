import { test, expect } from '@playwright/test';

test('navega da página inicial até o perfil de um animal', async ({ page, isMobile }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Todo amormerece um lar.');
    if (isMobile) {
        await page.getByRole('button', { name: 'Abrir menu' }).click();
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
        await page
            .getByRole('navigation', { name: 'Navegação principal' })
            .getByRole('link', { name: 'Quero adotar' })
            .click();
        await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    } else {
        await page.getByRole('link', { name: 'Encontre seu novo amigo' }).click();
    }
    await expect(page).toHaveURL('/adotar');
    await page.getByRole('link', { name: 'Faísca', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Faísca');
    await expect(
        page.getByRole('link', { name: /Quero adotar/ }).filter({ hasText: /Faísca/ }),
    ).toBeVisible();
    await expect(page.locator('.detail-location')).toContainText('Araraquara, SP');
});

test('combina filtros e mantém favoritos depois de recarregar', async ({ page }) => {
    await page.goto('/adotar');
    await expect(page.locator('.pet-card')).toHaveCount(8);
    await page.getByRole('button', { name: 'Cães', exact: true }).click();
    await expect(page.locator('.pet-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Amora', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar Amora aos favoritos' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Remover Amora dos favoritos' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await page.getByRole('button', { name: /Meus favoritos/ }).click();
    await expect(page.locator('.pet-card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await page.getByRole('searchbox', { name: 'Buscar por nome ou personalidade' }).fill('faisca');
    await expect(page.locator('.pet-card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Faísca', exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('animal inexistente');
    await expect(
        page.getByRole('heading', { name: 'Nenhum amigo com esses filtros.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ver todos os amigos' }).click();
    await page.getByLabel('Momento').selectOption('treatment');
    await expect(page.locator('.pet-card')).toHaveCount(2);
    await page.getByRole('link', { name: 'Ragna', exact: true }).click();
    await expect(page.locator('.detail-actions')).not.toContainText('Quero adotar');
});

test('doações explicam o modo demo e o diálogo funciona por teclado', async ({ page }) => {
    await page.goto('/doar');
    await expect(page.locator('.campaign-card')).toHaveCount(3);
    await expect(page.getByText('Meta alcançada', { exact: true })).toBeVisible();
    const open = page.getByRole('button', { name: 'Quero contribuir' });
    await open.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Esta é uma demonstração.', { exact: false })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copiar código PIX' })).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'Falar com a AdoCat' })).toHaveAttribute(
        'href',
        /^https:\/\/wa.me\/5516997587596\?text=/,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    await page.goto('/doar?campanha=tratamento-fabricia');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Tratamento da Fabrícia');
    await page.getByRole('button', { name: 'Fechar doação' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('conteúdo, rotas diretas e página inexistente permanecem navegáveis', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of [
        '/sobre',
        '/conteudos',
        '/conteudos/casa-segura-para-gatos',
        '/privacidade',
        '/caminho-inexistente',
    ]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await expect(page.getByRole('main')).toHaveCount(1);
    }
    await expect(
        page.getByRole('link', { name: 'Conhecer os animais', exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
});
