import { articles, type Article } from '../data/articles';
import { contentGroups, defaultNavigation } from '../data/contentFields';

export type ContentArticle = Article & { status: 'draft' | 'published' };
export type NavigationItem = {
    id: string;
    label: string;
    href: string;
    visible: boolean;
    newTab: boolean;
};
export type SiteContent = {
    values: Record<string, string>;
    articles: ContentArticle[] | null;
    navigation: NavigationItem[] | null;
    integrations: {
        whatsapp: string;
        email: string;
        instagram: string;
        facebook: string;
        pixKey: string;
        donationRecipient: string;
        donationCity: string;
    };
};
export type ContentState = {
    draft: SiteContent;
    published: SiteContent;
    revision: number;
    updatedAt: string | null;
    publishedAt: string | null;
};
export type MediaItem = {
    id: string;
    name: string;
    url: string;
    alt: string;
    createdAt: string;
};
export type IntegrationStatus = {
    mode: 'demo' | 'api';
    smtp: boolean;
    storage: boolean;
    pix: boolean;
    origin: string;
};

export const defaultContent: SiteContent = {
    values: {},
    articles: articles.map((article) => ({ ...article, status: 'published' })),
    navigation: defaultNavigation,
    integrations: {
        whatsapp: '5516997587596',
        email: 'adocat.adocao@gmail.com',
        instagram: '',
        facebook: '',
        pixKey: '',
        donationRecipient: '',
        donationCity: '',
    },
};

export function resolveContent(document?: Partial<SiteContent> | null): SiteContent {
    return {
        values: { ...document?.values },
        articles: document?.articles ?? structuredClone(defaultContent.articles),
        navigation: document?.navigation ?? structuredClone(defaultContent.navigation),
        integrations: { ...defaultContent.integrations, ...document?.integrations },
    };
}

export function isSafeLink(value: string): boolean {
    if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
    if (/^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return true;
    if (/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|tel:\+?[\d()-]+)$/i.test(value)) return true;
    try {
        const url = new URL(value);
        return (
            ['https:', 'http:'].includes(url.protocol) &&
            !!url.hostname &&
            !url.username &&
            !url.password
        );
    } catch {
        return false;
    }
}

export function isSafeImage(value: string, allowData = false): boolean {
    if (allowData && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
        return value.length <= 4.2 * 1024 * 1024;
    }
    return isSafeLink(value) && (/^\/(images|icons)\//.test(value) || /^https?:\/\//i.test(value));
}

export function validateContent(document: SiteContent, allowData = false): void {
    if (!document || typeof document !== 'object' || !document.values || !document.integrations) {
        throw new Error('O conteúdo está incompleto. Recarregue o painel.');
    }
    if (Object.keys(document.values).length > 1000)
        throw new Error('O limite de campos foi excedido.');
    for (const [key, value] of Object.entries(document.values)) {
        if (
            !/^[a-zA-Z0-9_.-]{1,150}$/.test(key) ||
            typeof value !== 'string' ||
            value.length > 4.2 * 1024 * 1024
        ) {
            throw new Error('Há um campo de conteúdo inválido.');
        }
    }
    for (const group of contentGroups) {
        for (const field of group.fields) {
            const value = document.values[field.key];
            if (value === undefined) continue;
            if (field.type === 'image' && value && !isSafeImage(value, allowData)) {
                throw new Error(`${group.label}: informe uma imagem válida em “${field.label}”.`);
            }
            if (field.type === 'link' && !isSafeLink(value)) {
                throw new Error(`${group.label}: informe um destino válido em “${field.label}”.`);
            }
            if (field.type !== 'image' && value.length > 20000)
                throw new Error(`${field.label}: texto muito longo.`);
        }
    }
    if (document.navigation && document.navigation.length > 12)
        throw new Error('Use até 12 itens no menu.');
    const navigationIds = new Set<string>();
    for (const item of document.navigation || []) {
        if (
            !item.id ||
            item.id.length > 80 ||
            navigationIds.has(item.id) ||
            !item.label.trim() ||
            item.label.length > 80 ||
            item.href.length > 2048 ||
            !isSafeLink(item.href) ||
            typeof item.visible !== 'boolean' ||
            typeof item.newTab !== 'boolean'
        ) {
            throw new Error(
                'Revise os nomes e destinos do menu. Cada item precisa de um identificador único.',
            );
        }
        navigationIds.add(item.id);
    }
    if (document.articles && document.articles.length > 100)
        throw new Error('Use até 100 artigos.');
    const slugs = new Set<string>();
    for (const article of document.articles || []) {
        if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) ||
            article.slug.length > 150 ||
            slugs.has(article.slug)
        ) {
            throw new Error(
                'Cada artigo precisa de um endereço único, com letras minúsculas, números e hífens.',
            );
        }
        slugs.add(article.slug);
        if (
            !article.title.trim() ||
            !article.excerpt.trim() ||
            !isSafeImage(article.image, allowData)
        ) {
            throw new Error(
                `Preencha título, resumo e imagem do artigo “${article.title || 'Novo artigo'}”.`,
            );
        }
        if (!['draft', 'published'].includes(article.status) || article.sections.length > 50) {
            throw new Error('Revise o status e os blocos do artigo.');
        }
        const texts: [string, string, number][] = [
            ['Título', article.title, 250],
            ['Categoria', article.category, 100],
            ['Resumo', article.excerpt, 1000],
            ['Tempo de leitura', article.readTime, 80],
            ...article.sections.flatMap((section): [string, string, number][] => [
                ['Título do bloco', section.title, 250],
                ['Texto do bloco', section.text, 20000],
            ]),
        ];
        for (const [label, value, limit] of texts) {
            if (typeof value !== 'string' || !value.trim() || value.length > limit)
                throw new Error(
                    `${label} do artigo: preencha o campo com até ${limit} caracteres.`,
                );
        }
        if (!article.image.startsWith('data:') && article.image.length > 2048)
            throw new Error('O endereço da imagem do artigo aceita até 2048 caracteres.');
    }
    const settings = document.integrations;
    if (Object.values(settings).some((value) => typeof value !== 'string' || value.length > 500))
        throw new Error('Revise os dados das integrações.');
    if (settings.whatsapp && !/^\d{10,15}$/.test(settings.whatsapp))
        throw new Error(
            'No WhatsApp, use apenas números com código do país e DDD. Exemplo: 5516997587596.',
        );
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email))
        throw new Error('Informe um e-mail válido para contato.');
    for (const network of ['instagram', 'facebook'] as const) {
        if (
            settings[network] &&
            (!isSafeLink(settings[network]) || !/^https?:\/\//i.test(settings[network]))
        )
            throw new Error(`Informe o endereço completo do ${network}.`);
    }
    if (settings.pixKey && (!settings.donationRecipient.trim() || !settings.donationCity.trim()))
        throw new Error('Para ativar o PIX, preencha também o beneficiário e a cidade.');
    if (
        settings.pixKey.length > 77 ||
        settings.donationRecipient.length > 25 ||
        settings.donationCity.length > 15
    )
        throw new Error(
            'O PIX aceita chave de até 77 caracteres, beneficiário de até 25 e cidade de até 15.',
        );
}
