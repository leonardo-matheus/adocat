import { initialCampaigns, initialPets } from '../data/seed';
import { defaultContent, resolveContent, validateContent, isSafeImage } from './content';
import type { ContentState, IntegrationStatus, MediaItem, SiteContent } from './content';
import type {
    AdoptionApplication,
    AdoptionPayload,
    Campaign,
    Pet,
    PublicConfig,
    Session,
    VolunteerApplication,
    VolunteerPayload,
} from './types';

export const isDemoMode = import.meta.env.VITE_DATA_MODE !== 'api';
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const STORAGE_KEY = 'adocat-demo-v1';
const SESSION_KEY = 'adocat-demo-session';
const CONTENT_KEY = 'adocat-content-v1';
const MEDIA_KEY = 'adocat-media-v1';
let csrfToken: string | undefined;

type DemoDatabase = {
    pets: Pet[];
    campaigns: Campaign[];
    adoptions: AdoptionApplication[];
    volunteers: VolunteerApplication[];
};

function readDatabase(): DemoDatabase {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value) {
            const parsed = JSON.parse(value) as DemoDatabase;
            if (
                !Array.isArray(parsed.pets) ||
                !Array.isArray(parsed.campaigns) ||
                !Array.isArray(parsed.adoptions) ||
                !Array.isArray(parsed.volunteers)
            ) {
                throw new Error('Invalid storage');
            }
            return parsed;
        }
        return structuredClone({
            pets: initialPets,
            campaigns: initialCampaigns,
            adoptions: [],
            volunteers: [],
        });
    } catch {
        throw new Error(
            'Não foi possível ler a demonstração neste navegador. Verifique as permissões de armazenamento.',
        );
    }
}

function saveDatabase(database: DemoDatabase) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
        window.dispatchEvent(new Event('adocat-data-updated'));
    } catch {
        throw new Error(
            'Não foi possível salvar. O armazenamento do navegador pode estar cheio ou bloqueado.',
        );
    }
}

function requireDemoSession() {
    if (sessionStorage.getItem(SESSION_KEY) !== 'authenticated') {
        throw new Error('Entre no painel para continuar.');
    }
}

function readContentState(): ContentState {
    const stored = localStorage.getItem(CONTENT_KEY);
    if (stored) {
        const state = JSON.parse(stored) as ContentState;
        return {
            ...state,
            draft: resolveContent(state.draft),
            published: resolveContent(state.published),
        };
    }
    return {
        draft: structuredClone(defaultContent),
        published: structuredClone(defaultContent),
        revision: 0,
        updatedAt: null,
        publishedAt: null,
    };
}

function saveLocalContent(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        throw new Error(
            'Não foi possível salvar. O armazenamento do navegador está cheio ou bloqueado. Use imagens menores ou conecte a API.',
        );
    }
}

function updateLocalContent(revision: number, update: (state: ContentState) => void): ContentState {
    requireDemoSession();
    const state = readContentState();
    if (revision !== state.revision)
        throw new Error(
            'O conteúdo foi alterado em outra aba. Recarregue o painel antes de continuar.',
        );
    update(state);
    state.revision += 1;
    state.updatedAt = new Date().toISOString();
    saveLocalContent(CONTENT_KEY, state);
    window.dispatchEvent(new Event('adocat-content-updated'));
    return structuredClone(state);
}

function readMedia(): MediaItem[] {
    const stored = localStorage.getItem(MEDIA_KEY);
    if (stored) return JSON.parse(stored) as MediaItem[];
    return [
        ...new Set([
            ...initialPets.map((pet) => pet.image),
            ...initialCampaigns.map((campaign) => campaign.image),
        ]),
    ].map((url, index) => ({
        id: `original-${index}`,
        url,
        name: url.split('/').at(-1) || 'Imagem do site',
        alt: '',
        createdAt: new Date(0).toISOString(),
    }));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body && !(options.body instanceof FormData))
        headers.set('Content-Type', 'application/json');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    try {
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(
                payload?.error?.message ||
                    `Não foi possível concluir a operação (${response.status}).`,
            );
        }
        if (!payload || !('data' in payload))
            throw new Error('O servidor retornou uma resposta inválida.');
        return payload.data as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('O servidor demorou para responder. Tente novamente.');
        }
        if (error instanceof TypeError)
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}

async function mutate<T>(path: string, method: string, body?: unknown): Promise<T> {
    if (!csrfToken) await api.getSession();
    return request<T>(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function validateContact(payload: {
    name: string;
    email: string;
    phone: string;
    city: string;
    consent: boolean;
}) {
    if (
        payload.name.trim().length < 3 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
        payload.phone.replace(/\D/g, '').length < 10 ||
        !payload.city.trim()
    ) {
        throw new Error('Revise seu nome, e-mail, telefone com DDD e cidade.');
    }
    if (!payload.consent)
        throw new Error('É necessário autorizar o uso dos dados para este cadastro.');
}

export const api = {
    async getPets(): Promise<Pet[]> {
        return isDemoMode
            ? readDatabase().pets.filter((pet) => pet.status !== 'adopted')
            : request('/pets');
    },
    async getPet(id: string): Promise<Pet> {
        if (!isDemoMode) return request(`/pets/${encodeURIComponent(id)}`);
        const pet = readDatabase().pets.find((item) => item.id === id);
        if (!pet)
            throw new Error('Não encontramos esse amigo. Ele pode ter sido removido do catálogo.');
        return pet;
    },
    async getCampaigns(): Promise<Campaign[]> {
        return isDemoMode ? readDatabase().campaigns : request('/campaigns');
    },
    async getConfig(): Promise<PublicConfig> {
        if (!isDemoMode) return request('/config');
        const settings = readContentState().published.integrations;
        return {
            pixConfigured: Boolean(
                settings.pixKey && settings.donationRecipient && settings.donationCity,
            ),
            pixKey: settings.pixKey || null,
            donationRecipient: settings.donationRecipient || null,
            donationCity: settings.donationCity || null,
        };
    },
    async submitAdoption(payload: AdoptionPayload): Promise<AdoptionApplication> {
        if (!isDemoMode) return mutate('/adoptions', 'POST', payload);
        validateContact(payload);
        if (
            !['house', 'apartment'].includes(payload.homeType) ||
            payload.routine.trim().length < 10
        ) {
            throw new Error('Informe o tipo de moradia e conte um pouco mais sobre sua rotina.');
        }
        const database = readDatabase();
        if (!database.pets.some((pet) => pet.id === payload.petId && pet.status === 'available')) {
            throw new Error('Esse amigo ainda não está disponível para adoção.');
        }
        const application: AdoptionApplication = {
            ...payload,
            id: crypto.randomUUID(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        database.adoptions.unshift(application);
        saveDatabase(database);
        return application;
    },
    async submitVolunteer(payload: VolunteerPayload): Promise<VolunteerApplication> {
        if (!isDemoMode) return mutate('/volunteers', 'POST', payload);
        validateContact(payload);
        if (!payload.interests.length || !payload.availability.trim()) {
            throw new Error('Escolha como você pode ajudar e informe sua disponibilidade.');
        }
        const database = readDatabase();
        const application: VolunteerApplication = {
            ...payload,
            id: crypto.randomUUID(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        database.volunteers.unshift(application);
        saveDatabase(database);
        return application;
    },
    async getSession(): Promise<Session> {
        if (isDemoMode)
            return { authenticated: sessionStorage.getItem(SESSION_KEY) === 'authenticated' };
        const session = await request<Session>('/auth/session');
        csrfToken = session.csrfToken;
        return session;
    },
    async login(email: string, password: string): Promise<Session> {
        if (!isDemoMode) {
            const session = await mutate<Session>('/auth/login', 'POST', { email, password });
            csrfToken = session.csrfToken;
            return session;
        }
        if (email.toLowerCase().trim() !== 'demo@adocat.org' || password !== 'adocat-demo') {
            throw new Error('E-mail ou senha incorretos. Use as credenciais da demonstração.');
        }
        sessionStorage.setItem(SESSION_KEY, 'authenticated');
        return { authenticated: true };
    },
    async logout(): Promise<void> {
        if (isDemoMode) sessionStorage.removeItem(SESSION_KEY);
        else await mutate('/auth/logout', 'POST');
        csrfToken = undefined;
    },
    async getAdminPets(): Promise<Pet[]> {
        if (!isDemoMode) return request('/admin/pets');
        requireDemoSession();
        return readDatabase().pets;
    },
    async savePet(input: Partial<Pet>): Promise<Pet> {
        if (!isDemoMode)
            return mutate(
                input.id ? `/admin/pets/${encodeURIComponent(input.id)}` : '/admin/pets',
                input.id ? 'PATCH' : 'POST',
                input,
            );
        requireDemoSession();
        const database = readDatabase();
        const existing = input.id ? database.pets.find((pet) => pet.id === input.id) : undefined;
        if (input.id && !existing) throw new Error('Animal não encontrado.');
        const pet = { ...existing, ...input, id: existing?.id || crypto.randomUUID() } as Pet;
        if (
            !pet.name?.trim() ||
            !pet.description?.trim() ||
            !pet.city?.trim() ||
            !pet.image?.trim()
        ) {
            throw new Error('Preencha nome, história, cidade e foto do animal.');
        }
        if (existing)
            database.pets = database.pets.map((item) => (item.id === pet.id ? pet : item));
        else database.pets.unshift(pet);
        saveDatabase(database);
        return pet;
    },
    async deletePet(id: string): Promise<void> {
        if (!isDemoMode) {
            await mutate(`/admin/pets/${encodeURIComponent(id)}`, 'DELETE');
            return;
        }
        requireDemoSession();
        const database = readDatabase();
        if (database.adoptions.some((item) => item.petId === id)) {
            throw new Error(
                'Este animal possui candidaturas. Altere seu status para preservar o histórico.',
            );
        }
        database.pets = database.pets.filter((pet) => pet.id !== id);
        saveDatabase(database);
    },
    async getAdoptions(): Promise<AdoptionApplication[]> {
        if (!isDemoMode) return request('/admin/adoptions');
        requireDemoSession();
        return readDatabase().adoptions;
    },
    async updateAdoption(
        id: string,
        status: AdoptionApplication['status'],
    ): Promise<AdoptionApplication> {
        if (!isDemoMode)
            return mutate(`/admin/adoptions/${encodeURIComponent(id)}`, 'PATCH', { status });
        requireDemoSession();
        const database = readDatabase();
        const application = database.adoptions.find((item) => item.id === id);
        if (!application) throw new Error('Candidatura não encontrada.');
        application.status = status;
        saveDatabase(database);
        return application;
    },
    async getVolunteers(): Promise<VolunteerApplication[]> {
        if (!isDemoMode) return request('/admin/volunteers');
        requireDemoSession();
        return readDatabase().volunteers;
    },
    async updateVolunteer(
        id: string,
        status: VolunteerApplication['status'],
    ): Promise<VolunteerApplication> {
        if (!isDemoMode)
            return mutate(`/admin/volunteers/${encodeURIComponent(id)}`, 'PATCH', { status });
        requireDemoSession();
        const database = readDatabase();
        const application = database.volunteers.find((item) => item.id === id);
        if (!application) throw new Error('Cadastro não encontrado.');
        application.status = status;
        saveDatabase(database);
        return application;
    },
    async saveCampaign(input: Partial<Campaign>): Promise<Campaign> {
        if (!isDemoMode)
            return mutate(
                input.id ? `/admin/campaigns/${encodeURIComponent(input.id)}` : '/admin/campaigns',
                input.id ? 'PATCH' : 'POST',
                input,
            );
        requireDemoSession();
        const database = readDatabase();
        const existing = database.campaigns.find((item) => item.id === input.id);
        if (input.id && !existing) throw new Error('Campanha não encontrada.');
        const campaign = {
            ...existing,
            ...input,
            id: existing?.id || crypto.randomUUID(),
        } as Campaign;
        if (
            !campaign.title?.trim() ||
            !campaign.description?.trim() ||
            !Number.isFinite(campaign.target) ||
            campaign.target <= 0 ||
            !Number.isFinite(campaign.raised) ||
            campaign.raised < 0
        ) {
            throw new Error('Informe título, descrição e valores válidos para a campanha.');
        }
        if (existing)
            database.campaigns = database.campaigns.map((item) =>
                item.id === campaign.id ? campaign : item,
            );
        else database.campaigns.unshift(campaign);
        saveDatabase(database);
        return campaign;
    },
    async uploadImage(file: File): Promise<string> {
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 3 * 1024 * 1024
        ) {
            throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 3 MB.');
        }
        if (!isDemoMode) {
            if (!csrfToken) await api.getSession();
            const body = new FormData();
            body.append('image', file);
            const uploaded = await request<{ url: string }>('/admin/uploads', {
                method: 'POST',
                body,
            });
            return uploaded.url;
        }
        requireDemoSession();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
            reader.readAsDataURL(file);
        });
    },
    async getContent(): Promise<SiteContent> {
        const document = isDemoMode
            ? readContentState().published
            : await request<SiteContent>('/content');
        return resolveContent(document);
    },
    async getAdminContent(): Promise<ContentState> {
        if (isDemoMode) {
            requireDemoSession();
            return readContentState();
        }
        const state = await request<ContentState>('/admin/content');
        return {
            ...state,
            draft: resolveContent(state.draft),
            published: resolveContent(state.published),
        };
    },
    async saveContent(document: SiteContent, revision: number): Promise<ContentState> {
        validateContent(document, isDemoMode);
        if (!isDemoMode) {
            const state = await mutate<ContentState>('/admin/content', 'PATCH', {
                document,
                revision,
            });
            return {
                ...state,
                draft: resolveContent(state.draft),
                published: resolveContent(state.published),
            };
        }
        return updateLocalContent(revision, (state) => {
            state.draft = structuredClone(document);
        });
    },
    async publishContent(revision: number): Promise<ContentState> {
        if (!isDemoMode) {
            const state = await mutate<ContentState>('/admin/content/publish', 'POST', {
                revision,
            });
            window.dispatchEvent(new Event('adocat-content-updated'));
            return {
                ...state,
                draft: resolveContent(state.draft),
                published: resolveContent(state.published),
            };
        }
        return updateLocalContent(revision, (state) => {
            validateContent(state.draft, true);
            state.published = structuredClone(state.draft);
            state.publishedAt = new Date().toISOString();
        });
    },
    async discardContent(revision: number): Promise<ContentState> {
        if (!isDemoMode) {
            const state = await mutate<ContentState>('/admin/content/discard', 'POST', {
                revision,
            });
            return {
                ...state,
                draft: resolveContent(state.draft),
                published: resolveContent(state.published),
            };
        }
        return updateLocalContent(revision, (state) => {
            state.draft = structuredClone(state.published);
        });
    },
    async getMedia(): Promise<MediaItem[]> {
        if (!isDemoMode) return request('/admin/media');
        requireDemoSession();
        return readMedia();
    },
    async addMedia(input: Pick<MediaItem, 'url' | 'name' | 'alt'>): Promise<MediaItem> {
        if (
            !isSafeImage(input.url, isDemoMode) ||
            !input.name.trim() ||
            input.name.length > 200 ||
            input.alt.length > 500
        )
            throw new Error(
                'Informe um nome e uma imagem válida. A descrição aceita até 500 caracteres.',
            );
        if (!isDemoMode) return mutate('/admin/media', 'POST', input);
        requireDemoSession();
        const item = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        saveLocalContent(MEDIA_KEY, [item, ...readMedia()]);
        return item;
    },
    async updateMedia(id: string, input: Pick<MediaItem, 'name' | 'alt'>): Promise<MediaItem> {
        if (!input.name.trim() || input.name.length > 200 || input.alt.length > 500)
            throw new Error('Preencha o nome e use até 500 caracteres na descrição.');
        if (!isDemoMode) return mutate(`/admin/media/${encodeURIComponent(id)}`, 'PATCH', input);
        requireDemoSession();
        const library = readMedia();
        const item = library.find((media) => media.id === id);
        if (!item) throw new Error('Imagem não encontrada.');
        Object.assign(item, input);
        saveLocalContent(MEDIA_KEY, library);
        return item;
    },
    async deleteMedia(id: string): Promise<void> {
        if (!isDemoMode) {
            await mutate(`/admin/media/${encodeURIComponent(id)}`, 'DELETE');
            return;
        }
        requireDemoSession();
        saveLocalContent(
            MEDIA_KEY,
            readMedia().filter((item) => item.id !== id),
        );
    },
    async getIntegrationStatus(): Promise<IntegrationStatus> {
        if (!isDemoMode) return request('/admin/integrations');
        requireDemoSession();
        return {
            mode: 'demo',
            smtp: false,
            storage: false,
            pix: Boolean(readContentState().published.integrations.pixKey),
            origin: window.location.origin,
        };
    },
};
