import { expect, test, type Page } from '@playwright/test';

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function login(page: Page) {
    await page.goto('/admin/entrar');
    await page.getByLabel('E-mail').fill('demo@adocat.org');
    await page.locator('#login-password').fill('adocat-demo');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
}

async function adminGo(page: Page, name: 'Animais' | 'Triagens' | 'Voluntários' | 'Campanhas') {
    const item = page.getByRole('button', { name, exact: true });
    if ((page.viewportSize()?.width ?? 1280) <= 820) {
        await page.locator('#main-content').getByRole('button', { name: 'Abrir menu' }).click();
    }
    await item.click();
}

test('envia interesse de adoção e mantém a triagem atualizada após recarregar', async ({
    page,
}) => {
    const marker = unique();
    const name = `Adotante E2E ${marker}`;
    await page.goto('/adotar/faisca');
    await expect(page.getByRole('heading', { name: 'Faísca' })).toBeVisible();
    await page.getByLabel('Nome completo').fill(name);
    await page.getByLabel('E-mail').fill(`adotante-${marker}@example.com`);
    await page.getByLabel('WhatsApp').fill('(16) 99999-8877');
    await page.getByLabel('Cidade', { exact: true }).fill('Araraquara');
    await page.getByLabel('Tipo de moradia').selectOption('apartment');
    await page.getByLabel(/Janelas, sacadas/).check();
    await page
        .getByLabel('Há outros animais em casa?')
        .fill('Uma gata adulta, vacinada e sociável.');
    await page
        .getByLabel('Como é sua rotina?')
        .fill('Trabalho em casa e tenho tempo diário para adaptação e brincadeiras.');
    await page.getByLabel(/Autorizo o uso destes dados/).check();
    await page.getByRole('button', { name: /Enviar interesse/ }).click();
    await expect(page.getByRole('heading', { name: /Obrigado por abrir seu lar/ })).toBeVisible();
    await expect(page.getByText(/Cadastro salvo nesta demonstração/)).toBeVisible();

    await login(page);
    await adminGo(page, 'Triagens');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText('Faísca');
    await row.getByRole('combobox').selectOption('contacted');
    await expect(row.getByRole('combobox')).toHaveValue('contacted');
    await page.reload();
    await adminGo(page, 'Triagens');
    await expect(page.getByRole('row').filter({ hasText: name }).getByRole('combobox')).toHaveValue(
        'contacted',
    );
    await expectNoHorizontalOverflow(page);
});

test('cadastra voluntário e apresenta os dados no painel', async ({ page }) => {
    const marker = unique();
    const name = `Voluntário E2E ${marker}`;
    await page.goto('/voluntariado');
    await page.getByLabel('Lar temporário').check();
    await page.getByLabel('Carona solidária').check();
    await page.getByLabel('Nome completo').fill(name);
    await page.getByLabel('E-mail').fill(`voluntario-${marker}@example.com`);
    await page.getByLabel('WhatsApp').fill('(16) 98888-7766');
    await page.getByLabel('Cidade', { exact: true }).fill('Matão');
    await page.getByLabel('Disponibilidade').fill('Sábados à tarde e duas noites por semana');
    await page
        .getByLabel('Quer contar mais alguma coisa?')
        .fill('Tenho experiência com gatos idosos.');
    await page.getByLabel(/Autorizo o contato/).check();
    await page.getByRole('button', { name: 'Quero ser voluntário' }).click();
    await expect(page.getByRole('heading', { name: 'Que bom ter você por perto.' })).toBeVisible();

    await login(page);
    await adminGo(page, 'Voluntários');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText('Matão');
    await expect(row).toContainText('Lar temporário');
    await row.getByRole('combobox').selectOption('active');
    await expect(row.getByRole('combobox')).toHaveValue('active');
    await expectNoHorizontalOverflow(page);
});

test('protege o login e permite criar, editar, publicar e excluir um animal', async ({ page }) => {
    const marker = unique();
    const name = `Pet E2E ${marker}`;
    await page.goto('/admin/entrar');
    await page.getByLabel('E-mail').fill('demo@adocat.org');
    await page.locator('#login-password').fill('senha-incorreta');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
    await page.locator('#login-password').fill('adocat-demo');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();

    await adminGo(page, 'Animais');
    await page.getByRole('button', { name: 'Novo animal' }).click();
    await page.getByLabel('Nome').fill(name);
    await page.getByLabel('Espécie').selectOption('cat');
    await page.getByLabel('Sexo').selectOption('male');
    await page.getByLabel('Faixa etária').selectOption('adult');
    await page.getByLabel('Idade exibida').fill('3 anos');
    await page.getByLabel('Porte').selectOption('small');
    await page.getByLabel('Cidade', { exact: true }).fill('Araraquara');
    await page.getByLabel('Temperamento').fill('Carinhoso, Brincalhão');
    await page
        .getByLabel('Descrição')
        .fill('Um gato criado pelo teste E2E para validar todo o fluxo administrativo.');
    await page.getByLabel('URL da imagem').fill('/images/faisca.jpg');
    await page.getByRole('button', { name: 'Salvar' }).click();
    const card = page.locator('.admin-pet-card').filter({ hasText: name });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Status').selectOption('treatment');
    await page.getByLabel('Vacinado').check();
    await page.getByLabel('Data da vacinação').fill('2026-09-10');
    await page.getByLabel('Castrado').check();
    await page.getByLabel('Data da castração').fill('2026-09-11');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(card).toContainText('Em tratamento');

    await page.goto('/adotar');
    await page.getByLabel('Buscar por nome ou personalidade').fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page.getByText(name, { exact: true }).click();
    await expect(page.getByText('Recebendo cuidados')).toBeVisible();
    await expect(page.getByText('Vacinação em dia')).toBeVisible();
    await expect(page.getByText('Castrado', { exact: true })).toBeVisible();

    await page.goto('/admin');
    await adminGo(page, 'Animais');
    const savedCard = page.locator('.admin-pet-card').filter({ hasText: name });
    await savedCard.getByRole('button', { name: 'Excluir' }).click();
    await savedCard.getByRole('button', { name: 'Cancelar' }).click();
    await expect(savedCard).toBeVisible();
    await savedCard.getByRole('button', { name: 'Excluir' }).click();
    await savedCard.locator('.delete-confirm').getByRole('button', { name: 'Excluir' }).click();
    await expect(savedCard).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
});

test('cria e edita campanha e publica os valores na página de doações', async ({ page }) => {
    const marker = unique();
    const title = `Campanha E2E ${marker}`;
    await login(page);
    await adminGo(page, 'Campanhas');
    await page.getByRole('button', { name: 'Nova campanha' }).click();
    await page.getByLabel('Título').fill(title);
    await page
        .getByLabel('Descrição')
        .fill('Campanha criada para validar a gestão de arrecadações.');
    await page.getByLabel('Meta (R$)').fill('1500');
    await page.getByLabel('Arrecadado (R$)').fill('250');
    await page.getByLabel('Categoria').fill('Tratamento');
    await page.getByLabel('Imagem (URL)').fill('/images/faisca.jpg');
    await page.getByRole('button', { name: 'Salvar' }).click();
    const card = page.locator('.campaign-admin').filter({ hasText: title });
    await expect(card).toContainText('R$ 250,00');
    await card.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Arrecadado (R$)').fill('750');
    await page.getByLabel('Status').selectOption('completed');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(card).toContainText('Concluída');
    await expect(card).toContainText('R$ 750,00');

    await page.goto('/doar');
    const publicCard = page.locator('.campaign-card').filter({ hasText: title });
    await expect(publicCard).toBeVisible();
    await expect(publicCard).toContainText(/R\$\s*750/);
    await expect(publicCard).toContainText(/R\$\s*1\.500/);
    await expect(publicCard).toContainText('Meta alcançada');
    await expectNoHorizontalOverflow(page);
});
