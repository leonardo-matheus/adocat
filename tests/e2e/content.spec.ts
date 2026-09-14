import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
    await page.goto('/admin/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill('demo@adocat.org');
    await page.locator('#login-password').fill('adocat-demo');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}

async function go(page: Page, name: string) {
    if ((page.viewportSize()?.width ?? 1280) <= 820) {
        await page.locator('#main-content').getByRole('button', { name: 'Abrir menu' }).click();
    }
    await page.locator('.admin-sidebar').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
}

async function save(page: Page) {
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByText('Rascunho salvo.', { exact: true })).toBeVisible();
}

async function publish(page: Page) {
    await page.getByRole('button', { name: 'Publicar alterações' }).click();
    await expect(page.locator('.cms-message.is-success')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toBeDisabled();
}

async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
    ).toBeLessThanOrEqual(1);
}

test('edita a capa, revisa em prévia e publica apenas quando solicitado', async ({
    page,
    context,
}) => {
    await login(page);
    await go(page, 'Conteúdo do site');
    await page.getByRole('button', { name: /Página inicial/ }).click();
    await page.getByLabel('Título — primeira linha', { exact: true }).fill('Novos encontros');
    await page.getByLabel('Título — segunda linha', { exact: true }).fill('Transformam vidas.');
    await page.getByLabel('Botão de adoção', { exact: true }).fill('Conheça nossa história');
    await page.getByLabel('Destino do botão de adoção', { exact: true }).fill('/sobre');
    await noOverflow(page);
    await save(page);

    const visitor = await context.newPage();
    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { level: 1 })).toContainText('Todo amor');
    await page.getByRole('button', { name: 'Ver prévia', exact: true }).click();
    await expect(page.getByText('Prévia do rascunho', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Novos encontros');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        /^Novos encontros\s*Transformam vidas\.$/,
    );
    await expect(
        page.getByRole('link', { name: 'Conheça nossa história', exact: true }),
    ).toHaveAttribute('href', '/sobre');
    await page.getByRole('button', { name: 'Voltar ao painel' }).click();
    await go(page, 'Conteúdo do site');
    await publish(page);
    await visitor.reload();
    await expect(visitor.getByRole('heading', { level: 1 })).toContainText('Novos encontros');
    await expect(
        visitor.getByRole('link', { name: 'Conheça nossa história', exact: true }),
    ).toHaveAttribute('href', '/sobre');
    await visitor.close();
});

test('cria um artigo com blocos de leitura e publica no catálogo', async ({ page }) => {
    await login(page);
    await go(page, 'Artigos');
    await page.getByRole('button', { name: 'Novo artigo', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill('Uma adoção preparada');
    await page.getByLabel('Endereço (slug)', { exact: true }).fill('uma-adocao-preparada');
    await page
        .getByLabel('Resumo', { exact: true })
        .fill('Prepare o espaço e a rotina para receber seu novo amigo.');
    await page.getByLabel('Imagem de capa', { exact: true }).fill('/images/luna.jpg');
    await page.getByLabel('Visibilidade', { exact: true }).selectOption('published');
    await page.getByLabel('Título do bloco', { exact: true }).fill('Organize a chegada');
    await page
        .getByLabel('Texto', { exact: true })
        .fill('Reserve um ambiente tranquilo com água, alimento e abrigo.');
    await noOverflow(page);
    await publish(page);
    await page.goto('/conteudos/uma-adocao-preparada');
    await expect(
        page.getByRole('heading', { name: 'Uma adoção preparada', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Organize a chegada' })).toBeVisible();
    await expect(
        page.getByText('Reserve um ambiente tranquilo com água, alimento e abrigo.'),
    ).toBeVisible();
});

test('cadastra uma mídia, edita a descrição e reutiliza a capa', async ({ page }) => {
    await login(page);
    await go(page, 'Mídias');
    await page.getByLabel('Nome da mídia', { exact: true }).fill('Capa editorial');
    await page
        .getByLabel('Texto alternativo', { exact: true })
        .fill('Gata em um ambiente tranquilo');
    await page.getByLabel('Endereço da imagem', { exact: true }).fill('/images/luna.jpg');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    const card = page.locator('.cms-media-card').first();
    await expect(card).toContainText('Capa editorial');
    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await card.getByLabel('Texto alternativo', { exact: true }).fill('Uma gata tranquila');
    await card.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(card).toContainText('Uma gata tranquila');
    await noOverflow(page);
    await go(page, 'Conteúdo do site');
    await page.getByRole('button', { name: /Página inicial/ }).click();
    const field = page
        .locator('.cms-field')
        .filter({ has: page.getByLabel('Imagem principal', { exact: true }) });
    await field.getByRole('button', { name: 'Escolher da biblioteca' }).click();
    await field.getByRole('button', { name: 'Uma gata tranquila', exact: true }).click();
    await expect(page.getByLabel('Imagem principal', { exact: true })).toHaveValue(
        '/images/luna.jpg',
    );
    await publish(page);
    await page.goto('/');
    await expect(page.locator('.hero-visual img').first()).toHaveAttribute(
        'src',
        /\/images\/luna\.jpg$/,
    );
});

test('configura menu e canais de contato com validação de destinos', async ({ page }) => {
    await login(page);
    await go(page, 'Menus e botões');
    const item = page.locator('.cms-nav-row').first();
    await item.getByLabel('Nome', { exact: true }).fill('Comece por aqui');
    await item.getByLabel('Destino', { exact: true }).fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('destinos do menu');
    await item.getByLabel('Destino', { exact: true }).fill('/sobre');
    await save(page);
    await go(page, 'Integrações');
    await page.getByLabel('WhatsApp', { exact: true }).fill('5516999991234');
    await page.getByLabel('E-mail', { exact: true }).fill('equipe@example.org');
    await page
        .getByLabel('Instagram', { exact: true })
        .fill('https://www.instagram.com/adocat_exemplo');
    await noOverflow(page);
    await publish(page);
    await page.goto('/');
    if ((page.viewportSize()?.width ?? 1280) <= 820) {
        await page
            .locator('.site-header')
            .getByRole('button', { name: 'Abrir menu', exact: true })
            .click();
    }
    await expect(
        page.locator('#main-navigation').getByRole('link', { name: 'Comece por aqui' }),
    ).toHaveAttribute('href', '/sobre');
    await expect(
        page.locator('.site-footer').getByRole('link', { name: 'equipe@example.org' }),
    ).toHaveAttribute('href', 'mailto:equipe@example.org');
    await expect(page.locator('.site-footer a[href="https://wa.me/5516999991234"]')).toHaveCount(1);
});
