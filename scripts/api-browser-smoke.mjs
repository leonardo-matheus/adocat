import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.API_SITE_URL || 'http://127.0.0.1:5174';
const channel =
    process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const marker = Date.now().toString();
const adopter = `Adotante API ${marker}`;
const volunteer = `Voluntário API ${marker}`;
const petName = `Pet API ${marker}`;
const campaignTitle = `Campanha API ${marker}`;
const report = { baseURL, checks: [] };
await mkdir('output/qa', { recursive: true });

async function login() {
    await page.goto('/admin/entrar');
    await page.getByLabel('E-mail').fill(process.env.API_ADMIN_EMAIL || 'admin@integration.local');
    await page
        .locator('#login-password')
        .fill(process.env.API_ADMIN_PASSWORD || 'integration-secret');
    await page.getByRole('button', { name: 'Entrar no painel' }).click();
    await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
}

async function go(name) {
    await page.getByRole('button', { name, exact: true }).click();
}

async function fillContact(name, city) {
    await page.getByLabel('Nome completo').fill(name);
    await page.getByLabel('E-mail').fill(`teste-${marker}@example.test`);
    await page.getByLabel('WhatsApp').fill('(16) 99999-8877');
    await page.getByLabel('Cidade', { exact: true }).fill(city);
}

async function saveResponse(method, path, action) {
    const pending = page.waitForResponse(
        (response) =>
            response.url().includes(`/api/${path}`) && response.request().method() === method,
    );
    await action();
    const response = await pending;
    expect(response.ok(), await response.text()).toBeTruthy();
    return (await response.json()).data;
}

try {
    const anonymous = await context.request.get('/api/admin/pets');
    expect(anonymous.status()).toBe(401);
    await page.goto('/adotar/faisca');
    await expect(page.getByRole('heading', { name: 'Faísca' })).toBeVisible();
    await fillContact(adopter, 'São Carlos');
    await page.getByLabel('Tipo de moradia').selectOption('apartment');
    await page.getByLabel(/Janelas, sacadas/).check();
    await page.getByLabel('Há outros animais em casa?').fill('Não tenho outros animais.');
    await page
        .getByLabel('Como é sua rotina?')
        .fill('Trabalho em casa e tenho tempo para os cuidados diários.');
    await page.getByLabel(/Autorizo o uso destes dados/).check();
    const adoption = await saveResponse('POST', 'adoptions', () =>
        page.getByRole('button', { name: /Enviar interesse/ }).click(),
    );
    expect(adoption.city).toBe('São Carlos');
    expect(adoption.status).toBe('pending');
    await expect(page.getByRole('heading', { name: /Obrigado por abrir seu lar/ })).toBeVisible();
    report.checks.push('Candidatura recebida pela API com consentimento e cidade livre');

    await page.goto('/voluntariado');
    await page.getByLabel('Lar temporário').check();
    await fillContact(volunteer, 'Ribeirão Preto');
    await page.getByLabel('Disponibilidade').fill('Sábados de manhã');
    await page.getByLabel(/Autorizo o contato/).check();
    const submittedVolunteer = await saveResponse('POST', 'volunteers', () =>
        page.getByRole('button', { name: 'Quero ser voluntário' }).click(),
    );
    expect(submittedVolunteer.message).toBe('');
    await expect(page.getByRole('heading', { name: 'Que bom ter você por perto.' })).toBeVisible();
    report.checks.push('Voluntariado recebido sem mensagem opcional');

    await login();
    const csrfRejected = await context.request.patch(`/api/admin/adoptions/${adoption.id}`, {
        data: { status: 'rejected' },
    });
    expect(csrfRejected.status()).toBe(403);
    await go('Triagens');
    const adoptionRow = page.getByRole('row').filter({ hasText: adopter });
    await expect(adoptionRow).toContainText('São Carlos');
    await saveResponse('PATCH', `admin/adoptions/${adoption.id}`, () =>
        adoptionRow.getByRole('combobox').selectOption('contacted'),
    );
    await page.reload();
    await go('Triagens');
    await expect(
        page.getByRole('row').filter({ hasText: adopter }).getByRole('combobox'),
    ).toHaveValue('contacted');
    await page.screenshot({ path: 'output/qa/api-triage-desktop.png', fullPage: true });
    report.checks.push(
        'Triagem persistida após recarga; acesso anônimo e alteração sem CSRF bloqueados',
    );

    await go('Voluntários');
    const volunteerRow = page.getByRole('row').filter({ hasText: volunteer });
    await expect(volunteerRow).toContainText('Lar temporário');
    await saveResponse('PATCH', `admin/volunteers/${submittedVolunteer.id}`, () =>
        volunteerRow.getByRole('combobox').selectOption('active'),
    );
    await go('Animais');
    await page.getByRole('button', { name: 'Novo animal' }).click();
    await page.getByLabel('Nome', { exact: true }).fill(petName);
    await page.getByLabel('Idade exibida').fill('2 anos');
    await page.getByLabel('Cidade', { exact: true }).fill('São Carlos');
    await page.getByLabel('Descrição').fill('Cadastro de integração com temperamento opcional.');
    await page.getByLabel('URL da imagem').fill('/images/faisca.jpg');
    const pet = await saveResponse('POST', 'admin/pets', () =>
        page.getByRole('button', { name: 'Salvar', exact: true }).click(),
    );
    expect(pet.temperament).toEqual([]);
    const petCard = page.locator('.admin-pet-card').filter({ hasText: petName });
    await petCard.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByLabel('Status').selectOption('treatment');
    await page.getByLabel('Vacinado').check();
    await page.getByLabel('Data da vacinação').fill('2026-09-10');
    await saveResponse('PATCH', `admin/pets/${pet.id}`, () =>
        page.getByRole('button', { name: 'Salvar', exact: true }).click(),
    );
    await page.goto(`/amigos/${pet.id}`);
    await expect(page.getByRole('heading', { name: petName })).toBeVisible();
    await expect(page.getByText('Recebendo cuidados')).toBeVisible();
    await expect(page.getByText('Vacinação em dia')).toBeVisible();
    await page.goto(`/adotar/${pet.id}`);
    await expect(page.getByRole('button', { name: /Enviar interesse/ })).toHaveCount(0);
    await page.goto('/admin');
    await go('Animais');
    const savedCard = page.locator('.admin-pet-card').filter({ hasText: petName });
    await savedCard.getByRole('button', { name: 'Excluir', exact: true }).click();
    await saveResponse('DELETE', `admin/pets/${pet.id}`, () =>
        savedCard
            .locator('.delete-confirm')
            .getByRole('button', { name: 'Excluir', exact: true })
            .click(),
    );
    await expect(savedCard).toHaveCount(0);
    report.checks.push(
        'CRUD de animal com cidade livre, saúde e bloqueio de adoção durante tratamento',
    );

    await go('Campanhas');
    await page.getByRole('button', { name: 'Nova campanha' }).click();
    await page.getByLabel('Título').fill(campaignTitle);
    await page.getByLabel('Descrição').fill('Campanha demonstrativa do teste de integração.');
    await page.getByLabel('Meta (R$)').fill('250');
    await page.getByLabel('Arrecadado (R$)').fill('50');
    await page.getByLabel('Categoria').fill('Tratamento');
    await page.getByLabel('Imagem (URL)').fill('/images/faisca.jpg');
    const campaign = await saveResponse('POST', 'admin/campaigns', () =>
        page.getByRole('button', { name: 'Salvar', exact: true }).click(),
    );
    await page
        .locator('.campaign-admin')
        .filter({ hasText: campaignTitle })
        .getByRole('button', { name: 'Editar' })
        .click();
    await page.getByLabel('Arrecadado (R$)').fill('250');
    await page.getByLabel('Status').selectOption('completed');
    await saveResponse('PATCH', `admin/campaigns/${campaign.id}`, () =>
        page.getByRole('button', { name: 'Salvar', exact: true }).click(),
    );
    await page.goto('/doar');
    await expect(page.locator('.campaign-card').filter({ hasText: campaignTitle })).toContainText(
        'Meta alcançada',
    );
    report.checks.push('Campanha criada, atualizada e publicada com os valores do banco');

    await page.goto('/admin');
    await page.getByRole('button', { name: /Sair/ }).click();
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    expect((await context.request.get('/api/admin/pets')).status()).toBe(401);
    expect(errors).toEqual([]);
    report.checks.push('Logout invalida a sessão; nenhum erro JavaScript');
    console.log(JSON.stringify(report, null, 4));
} catch (error) {
    await page.screenshot({ path: 'output/qa/api-failure.png', fullPage: true });
    throw error;
} finally {
    await writeFile('output/qa/api-browser-report.json', JSON.stringify(report, null, 4));
    await browser.close();
}
