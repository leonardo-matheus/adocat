import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import {
    defaultContent,
    isSafeImage,
    isSafeLink,
    resolveContent,
    validateContent,
} from './content';

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    };
}

describe('endereços do conteúdo', () => {
    it.each([
        'javascript:alert(1)',
        '//evil.example',
        '/\\evil.example',
        'data:text/html,hello',
        'https://user:pass@example.org',
        ' https://example.org',
        'java\nscript:alert(1)',
    ])('rejeita %s', (url) => {
        expect(isSafeLink(url)).toBe(false);
    });

    it.each([
        '/adotar',
        '/conteudos/casa-segura-para-gatos',
        'https://wa.me/5516997587596?text=Ol%C3%A1',
        'mailto:equipe@example.org',
        'tel:+5516997587596',
    ])('aceita %s', (url) => {
        expect(isSafeLink(url)).toBe(true);
    });

    it('restringe arquivos locais a imagens raster na demonstração', () => {
        expect(isSafeImage('data:image/png;base64,aGVsbG8=', true)).toBe(true);
        expect(isSafeImage('data:image/svg+xml;base64,aGVsbG8=', true)).toBe(false);
        expect(isSafeImage('data:image/png;base64,aGVsbG8=')).toBe(false);
        expect(isSafeImage('mailto:equipe@example.org')).toBe(false);
    });

    it('valida campos de botão, endereços de artigos e dados completos de PIX', () => {
        const content = structuredClone(defaultContent);
        content.values['home.hero.primaryHref'] = 'javascript:alert(1)';
        expect(() => validateContent(content)).toThrow(/destino válido/);
        content.values = {};
        content.articles = [content.articles![0], content.articles![0]];
        expect(() => validateContent(content)).toThrow(/único/);
        content.articles = [];
        content.integrations.pixKey = 'contato@example.org';
        expect(() => validateContent(content)).toThrow(/beneficiário/);
    });

    it('preserva listas vazias intencionais ao resolver valores iniciais', () => {
        const content = resolveContent({
            articles: [],
            navigation: [],
            values: { 'home.hero.titleLine1': '' },
        });
        expect(content.articles).toEqual([]);
        expect(content.navigation).toEqual([]);
        expect(content.values['home.hero.titleLine1']).toBe('');
    });
});

describe('fluxo de publicação da demonstração', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', memoryStorage());
        vi.stubGlobal('sessionStorage', memoryStorage());
        vi.stubGlobal('window', new EventTarget());
    });
    afterEach(() => vi.unstubAllGlobals());

    it('exige login para gerenciar rascunhos e mídias', async () => {
        await expect(api.getAdminContent()).rejects.toThrow(/Entre no painel/);
        await expect(api.getMedia()).rejects.toThrow(/Entre no painel/);
        await expect(api.publishContent(0)).rejects.toThrow(/Entre no painel/);
    });

    it('mantém o rascunho separado, recusa sobrescrita antiga e publica explicitamente', async () => {
        await api.login('demo@adocat.org', 'adocat-demo');
        const original = await api.getAdminContent();
        const document = structuredClone(original.draft);
        document.values['home.hero.titleLine1'] = 'Novos encontros';
        const saved = await api.saveContent(document, original.revision);
        expect((await api.getContent()).values['home.hero.titleLine1']).toBeUndefined();
        await expect(api.saveContent(original.draft, original.revision)).rejects.toThrow(
            /outra aba/,
        );
        const published = await api.publishContent(saved.revision);
        expect(published.publishedAt).toBeTruthy();
        expect((await api.getContent()).values['home.hero.titleLine1']).toBe('Novos encontros');
        const next = structuredClone(published.draft);
        next.values['home.hero.titleLine1'] = 'Texto descartado';
        const edited = await api.saveContent(next, published.revision);
        const discarded = await api.discardContent(edited.revision);
        expect(discarded.draft).toEqual(discarded.published);
    });

    it('salva descrições das mídias sem alterar a imagem usada no site', async () => {
        await api.login('demo@adocat.org', 'adocat-demo');
        const media = await api.addMedia({
            name: 'Luna',
            alt: 'Gata branca',
            url: '/images/luna.jpg',
        });
        const edited = await api.updateMedia(media.id, {
            name: 'Luna em casa',
            alt: 'Gata em repouso',
        });
        expect(edited.url).toBe(media.url);
        expect((await api.getMedia()).find((item) => item.id === media.id)?.alt).toBe(
            'Gata em repouso',
        );
        await api.deleteMedia(media.id);
        expect((await api.getMedia()).some((item) => item.id === media.id)).toBe(false);
    });
});
