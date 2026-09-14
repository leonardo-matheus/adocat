import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Copy,
    Eye,
    ImagePlus,
    Link2,
    LoaderCircle,
    Plus,
    RefreshCcw,
    Save,
    Search,
    Send,
    Trash2,
    Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, isDemoMode } from '../../lib/api';
import { publicAsset } from '../../lib/assets';
import { defaultContent } from '../../lib/content';
import type {
    ContentArticle,
    ContentState,
    IntegrationStatus,
    MediaItem,
    NavigationItem,
    SiteContent,
} from '../../lib/content';
import { contentGroups } from '../../data/contentFields';

export type CmsSection = 'content' | 'articles' | 'media' | 'navigation' | 'integrations';

type Props = {
    section: CmsSection;
    onDirtyChange?: (dirty: boolean) => void;
};

const sectionTitles: Record<CmsSection, [string, string]> = {
    content: ['Conteúdo do site', 'Edite os textos e imagens por página, sem mexer em código.'],
    articles: ['Artigos', 'Crie orientações e publique cada conteúdo quando estiver pronto.'],
    media: ['Mídias', 'Envie imagens uma vez e reutilize-as em qualquer parte do site.'],
    navigation: [
        'Menus e botões',
        'Organize a navegação e ajuste os destinos dos principais botões.',
    ],
    integrations: ['Integrações', 'Centralize os canais de contato, doação e publicação do site.'],
};

const newArticle = (): ContentArticle => ({
    slug: '',
    category: 'CUIDADOS',
    title: '',
    excerpt: '',
    image: '',
    readTime: '4 min de leitura',
    sections: [{ title: '', text: '' }],
    status: 'draft',
});

const cloneContent = (content: SiteContent): SiteContent => JSON.parse(JSON.stringify(content));

const friendlyDate = (date: string | null) =>
    date
        ? new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
          }).format(new Date(date))
        : 'ainda não';

const safeSlug = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export default function CmsPanel({ section, onDirtyChange }: Props) {
    const navigate = useNavigate();
    const [state, setState] = useState<ContentState | null>(null);
    const [draft, setDraft] = useState<SiteContent | null>(null);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [dirty, setDirty] = useState(false);
    const loadGeneration = useRef(0);

    const load = async () => {
        const generation = ++loadGeneration.current;
        setLoading(true);
        setError('');
        try {
            const [content, library, integrations] = await Promise.all([
                api.getAdminContent(),
                api.getMedia(),
                api.getIntegrationStatus(),
            ]);
            if (generation !== loadGeneration.current) return;
            setState(content);
            setDraft(cloneContent(content.draft));
            setMedia(library);
            setStatus(integrations);
            setDirty(false);
        } catch (cause) {
            if (generation !== loadGeneration.current) return;
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível carregar o conteúdo.',
            );
        } finally {
            if (generation === loadGeneration.current) setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        return () => {
            loadGeneration.current += 1;
        };
    }, []);

    useEffect(() => {
        onDirtyChange?.(dirty);
        const warn = (event: BeforeUnloadEvent) => {
            if (!dirty) return;
            event.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => {
            window.removeEventListener('beforeunload', warn);
            onDirtyChange?.(false);
        };
    }, [dirty, onDirtyChange]);

    const change = (next: SiteContent) => {
        setDraft(next);
        setDirty(true);
        setNotice('');
    };

    const save = async (message = 'Rascunho salvo.') => {
        if (!draft || !state) return null;
        setBusy('save');
        setError('');
        try {
            const updated = await api.saveContent(draft, state.revision);
            setState(updated);
            setDraft(cloneContent(updated.draft));
            setDirty(false);
            setNotice(message);
            return updated;
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível salvar o rascunho.',
            );
            return null;
        } finally {
            setBusy('');
        }
    };

    const publish = async () => {
        const current = dirty ? await save('Rascunho salvo para publicação.') : state;
        if (!current) return;
        setBusy('publish');
        setError('');
        try {
            const published = await api.publishContent(current.revision);
            setState(published);
            setDraft(cloneContent(published.draft));
            setDirty(false);
            setNotice(
                isDemoMode
                    ? 'Publicação atualizada neste navegador.'
                    : 'Alterações publicadas no site.',
            );
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível publicar.');
        } finally {
            setBusy('');
        }
    };

    const preview = async () => {
        const saved = dirty ? await save('Rascunho salvo. Abrindo prévia…') : state;
        if (saved) navigate('/?preview=1');
    };

    const discard = async () => {
        if (!state || !window.confirm('Descartar todas as alterações do rascunho?')) return;
        setBusy('discard');
        setError('');
        try {
            const updated = await api.discardContent(state.revision);
            setState(updated);
            setDraft(cloneContent(updated.draft));
            setDirty(false);
            setNotice('Rascunho restaurado com o conteúdo publicado.');
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível descartar o rascunho.',
            );
        } finally {
            setBusy('');
        }
    };

    if (loading)
        return (
            <div className="cms-loading">
                <LoaderCircle /> Carregando área editorial…
            </div>
        );
    if (!draft || !state) {
        return (
            <div className="cms-empty-state">
                <p>{error || 'O conteúdo não está disponível.'}</p>
                <button className="button button-secondary" onClick={() => void load()}>
                    <RefreshCcw /> Tentar novamente
                </button>
            </div>
        );
    }

    const title = sectionTitles[section];
    return (
        <section className="cms-panel">
            <header className="cms-heading">
                <div>
                    <span className="eyebrow">Central de conteúdo</span>
                    <h1>{title[0]}</h1>
                    <p>{title[1]}</p>
                </div>
                <div className="cms-heading-actions">
                    <button
                        className="button button-secondary"
                        disabled={Boolean(busy)}
                        onClick={() => void preview()}
                    >
                        <Eye /> Ver prévia
                    </button>
                    <button
                        className="button button-secondary"
                        disabled={!dirty || Boolean(busy)}
                        onClick={() => void save()}
                    >
                        <Save /> Salvar rascunho
                    </button>
                    <button
                        className="button button-primary"
                        disabled={Boolean(busy)}
                        onClick={() => void publish()}
                    >
                        <Send /> Publicar alterações
                    </button>
                </div>
            </header>

            <div className="cms-status-bar">
                <span className={dirty ? 'cms-dot is-dirty' : 'cms-dot'} />
                <strong>{dirty ? 'Há alterações não salvas' : 'Rascunho salvo'}</strong>
                <span>Última edição: {friendlyDate(state.updatedAt)}</span>
                <span>Publicado: {friendlyDate(state.publishedAt)}</span>
                <button disabled={Boolean(busy)} onClick={() => void discard()}>
                    Descartar rascunho
                </button>
            </div>
            {error && (
                <div className="cms-message is-error" role="alert">
                    {error}
                </div>
            )}
            {notice && (
                <div className="cms-message is-success" role="status">
                    <CheckCircle2 /> {notice}
                </div>
            )}
            {isDemoMode && (
                <div className="cms-demo-note">
                    <strong>Você está no modo demonstração.</strong>
                    <span>As edições ficam somente neste navegador até a API ser conectada.</span>
                </div>
            )}

            {section === 'content' && (
                <fieldset className="cms-busy-fieldset" disabled={Boolean(busy)}>
                    <ContentEditor draft={draft} media={media} onChange={change} />
                </fieldset>
            )}
            {section === 'articles' && (
                <fieldset className="cms-busy-fieldset" disabled={Boolean(busy)}>
                    <ArticlesEditor draft={draft} media={media} onChange={change} />
                </fieldset>
            )}
            {section === 'media' && (
                <MediaLibrary media={media} onChange={setMedia} setError={setError} />
            )}
            {section === 'navigation' && (
                <fieldset className="cms-busy-fieldset" disabled={Boolean(busy)}>
                    <NavigationEditor draft={draft} onChange={change} />
                </fieldset>
            )}
            {section === 'integrations' && (
                <fieldset className="cms-busy-fieldset" disabled={Boolean(busy)}>
                    <IntegrationsEditor draft={draft} status={status} onChange={change} />
                </fieldset>
            )}
        </section>
    );
}

function ContentEditor({
    draft,
    media,
    onChange,
}: {
    draft: SiteContent;
    media: MediaItem[];
    onChange: (value: SiteContent) => void;
}) {
    const [groupId, setGroupId] = useState(contentGroups[0]?.id ?? '');
    const [query, setQuery] = useState('');
    const group = contentGroups.find((item) => item.id === groupId) ?? contentGroups[0];
    const fields = (group?.fields ?? []).filter((field) =>
        `${field.label} ${field.help ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    );
    return (
        <div className="cms-workspace">
            <aside className="cms-subnav" aria-label="Páginas do site">
                <strong>Escolha uma página</strong>
                {contentGroups.map((item) => (
                    <button
                        key={item.id}
                        className={group?.id === item.id ? 'active' : ''}
                        onClick={() => setGroupId(item.id)}
                    >
                        <span>{item.label}</span>
                        <small>{item.fields.length} campos</small>
                    </button>
                ))}
            </aside>
            <div className="cms-editor-card">
                <div className="cms-card-head">
                    <div>
                        <h2>{group?.label}</h2>
                        <p>{group?.description}</p>
                    </div>
                    <label className="cms-search">
                        <Search />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar campo"
                            aria-label="Buscar campo"
                        />
                    </label>
                </div>
                <div className="cms-field-list">
                    {fields.map((field) => {
                        const value = draft.values[field.key] ?? field.defaultValue;
                        const fieldId = `content-${field.key.replace(/[^a-z0-9]/gi, '-')}`;
                        return (
                            <div className="cms-field" key={field.key}>
                                <label htmlFor={fieldId}>{field.label}</label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={fieldId}
                                        rows={4}
                                        value={value}
                                        onChange={(event) =>
                                            onChange({
                                                ...draft,
                                                values: {
                                                    ...draft.values,
                                                    [field.key]: event.target.value,
                                                },
                                            })
                                        }
                                    />
                                ) : (
                                    <input
                                        id={fieldId}
                                        type={field.type === 'link' ? 'url' : 'text'}
                                        value={value}
                                        onChange={(event) =>
                                            onChange({
                                                ...draft,
                                                values: {
                                                    ...draft.values,
                                                    [field.key]: event.target.value,
                                                },
                                            })
                                        }
                                    />
                                )}
                                {field.help && <small>{field.help}</small>}
                                {field.type === 'image' && (
                                    <MediaPicker
                                        media={media}
                                        value={value}
                                        onPick={(url) =>
                                            onChange({
                                                ...draft,
                                                values: { ...draft.values, [field.key]: url },
                                            })
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}
                    {!fields.length && <p className="cms-no-results">Nenhum campo encontrado.</p>}
                </div>
            </div>
        </div>
    );
}

function MediaPicker({
    media,
    value,
    onPick,
}: {
    media: MediaItem[];
    value: string;
    onPick: (url: string) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="cms-media-picker">
            {value && <img src={publicAsset(value)} alt="Prévia do campo" />}
            <button
                type="button"
                className="button button-secondary"
                onClick={() => setOpen(!open)}
            >
                <ImagePlus /> {open ? 'Fechar biblioteca' : 'Escolher da biblioteca'}
            </button>
            {open && (
                <div className="cms-picker-grid">
                    {media.map((item) => (
                        <button
                            type="button"
                            key={item.id}
                            title={item.name}
                            onClick={() => {
                                onPick(item.url);
                                setOpen(false);
                            }}
                        >
                            <img src={publicAsset(item.url)} alt={item.alt || item.name} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ArticlesEditor({
    draft,
    media,
    onChange,
}: {
    draft: SiteContent;
    media: MediaItem[];
    onChange: (value: SiteContent) => void;
}) {
    const articles = draft.articles ?? defaultContent.articles ?? [];
    const [selected, setSelected] = useState(0);
    const article = articles[selected];
    const setArticles = (next: ContentArticle[]) => onChange({ ...draft, articles: next });
    const update = (changes: Partial<ContentArticle>) =>
        setArticles(
            articles.map((item, index) => (index === selected ? { ...item, ...changes } : item)),
        );
    const add = () => {
        setArticles([...articles, newArticle()]);
        setSelected(articles.length);
    };
    const remove = () => {
        if (!article || !window.confirm(`Excluir o artigo “${article.title || 'sem título'}”?`))
            return;
        setArticles(articles.filter((_, index) => index !== selected));
        setSelected(Math.max(0, selected - 1));
    };
    return (
        <div className="cms-workspace">
            <aside className="cms-subnav cms-article-list">
                <button className="cms-add-row" onClick={add}>
                    <Plus /> Novo artigo
                </button>
                {articles.map((item, index) => (
                    <button
                        key={`${item.slug}-${index}`}
                        className={selected === index ? 'active' : ''}
                        onClick={() => setSelected(index)}
                    >
                        <span>{item.title || 'Artigo sem título'}</span>
                        <small>{item.status === 'published' ? 'Visível' : 'Rascunho'}</small>
                    </button>
                ))}
            </aside>
            <div className="cms-editor-card">
                {!article ? (
                    <div className="cms-empty-state">
                        <h2>Comece um artigo</h2>
                        <p>
                            Crie conteúdo educativo para quem está adotando ou cuidando de um
                            animal.
                        </p>
                        <button className="button button-primary" onClick={add}>
                            <Plus /> Novo artigo
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="cms-card-head">
                            <div>
                                <h2>{article.title || 'Novo artigo'}</h2>
                                <p>Preencha as informações e os blocos de leitura.</p>
                            </div>
                            <button
                                className="cms-icon-danger"
                                aria-label="Excluir artigo"
                                onClick={remove}
                            >
                                <Trash2 />
                            </button>
                        </div>
                        <div className="cms-form-grid">
                            <Field
                                label="Título"
                                value={article.title}
                                onChange={(value) =>
                                    update({ title: value, slug: article.slug || safeSlug(value) })
                                }
                                wide
                            />
                            <Field
                                label="Endereço (slug)"
                                value={article.slug}
                                onChange={(value) => update({ slug: safeSlug(value) })}
                                help="Ex.: primeiros-dias-em-casa"
                            />
                            <Field
                                label="Categoria"
                                value={article.category}
                                onChange={(value) => update({ category: value })}
                            />
                            <Field
                                label="Tempo de leitura"
                                value={article.readTime}
                                onChange={(value) => update({ readTime: value })}
                            />
                            <div className="cms-field">
                                <label htmlFor="article-visibility">Visibilidade</label>
                                <select
                                    id="article-visibility"
                                    aria-describedby="article-visibility-help"
                                    value={article.status}
                                    onChange={(event) =>
                                        update({
                                            status: event.target.value as ContentArticle['status'],
                                        })
                                    }
                                >
                                    <option value="draft">Rascunho</option>
                                    <option value="published">Publicado</option>
                                </select>
                                <small id="article-visibility-help">
                                    O artigo só aparece no site depois de publicar as alterações
                                    gerais.
                                </small>
                            </div>
                            <Field
                                label="Resumo"
                                value={article.excerpt}
                                onChange={(value) => update({ excerpt: value })}
                                textarea
                                wide
                            />
                            <div className="cms-field cms-field-wide">
                                <label htmlFor="article-cover">Imagem de capa</label>
                                <input
                                    id="article-cover"
                                    value={article.image}
                                    onChange={(event) => update({ image: event.target.value })}
                                />
                                <MediaPicker
                                    media={media}
                                    value={article.image}
                                    onPick={(image) => update({ image })}
                                />
                            </div>
                        </div>
                        <div className="cms-blocks">
                            <div className="cms-blocks-head">
                                <div>
                                    <h3>Blocos do artigo</h3>
                                    <p>Organize a leitura em seções curtas.</p>
                                </div>
                                <button
                                    className="button button-secondary"
                                    onClick={() =>
                                        update({
                                            sections: [
                                                ...article.sections,
                                                { title: '', text: '' },
                                            ],
                                        })
                                    }
                                >
                                    <Plus /> Adicionar bloco
                                </button>
                            </div>
                            {article.sections.map((block, index) => (
                                <div className="cms-content-block" key={index}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <div>
                                        <Field
                                            label="Título do bloco"
                                            value={block.title}
                                            onChange={(value) =>
                                                update({
                                                    sections: article.sections.map((item, i) =>
                                                        i === index
                                                            ? { ...item, title: value }
                                                            : item,
                                                    ),
                                                })
                                            }
                                        />
                                        <Field
                                            label="Texto"
                                            value={block.text}
                                            onChange={(value) =>
                                                update({
                                                    sections: article.sections.map((item, i) =>
                                                        i === index
                                                            ? { ...item, text: value }
                                                            : item,
                                                    ),
                                                })
                                            }
                                            textarea
                                        />
                                    </div>
                                    <button
                                        aria-label={`Excluir bloco ${index + 1}`}
                                        disabled={article.sections.length === 1}
                                        onClick={() =>
                                            update({
                                                sections: article.sections.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            })
                                        }
                                    >
                                        <Trash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function NavigationEditor({
    draft,
    onChange,
}: {
    draft: SiteContent;
    onChange: (value: SiteContent) => void;
}) {
    const items = draft.navigation ?? defaultContent.navigation ?? [];
    const update = (next: NavigationItem[]) => onChange({ ...draft, navigation: next });
    const move = (index: number, offset: number) => {
        const target = index + offset;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        update(next);
    };
    return (
        <div className="cms-editor-card cms-wide-card">
            <div className="cms-card-head">
                <div>
                    <h2>Menu principal</h2>
                    <p>A ordem abaixo é a mesma exibida no cabeçalho.</p>
                </div>
                <button
                    className="button button-primary"
                    onClick={() =>
                        update([
                            ...items,
                            {
                                id:
                                    typeof crypto.randomUUID === 'function'
                                        ? crypto.randomUUID()
                                        : `menu-${Date.now()}`,
                                label: 'Novo item',
                                href: '/',
                                visible: true,
                                newTab: false,
                            },
                        ])
                    }
                >
                    <Plus /> Adicionar item
                </button>
            </div>
            <div className="cms-nav-list">
                {items.map((item, index) => (
                    <div className="cms-nav-row" key={item.id}>
                        <div className="cms-order">
                            <button
                                aria-label="Mover para cima"
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp />
                            </button>
                            <button
                                aria-label="Mover para baixo"
                                disabled={index === items.length - 1}
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown />
                            </button>
                        </div>
                        <label>
                            <span>Nome</span>
                            <input
                                value={item.label}
                                onChange={(event) =>
                                    update(
                                        items.map((value) =>
                                            value.id === item.id
                                                ? { ...value, label: event.target.value }
                                                : value,
                                        ),
                                    )
                                }
                            />
                        </label>
                        <label className="cms-nav-url">
                            <span>Destino</span>
                            <div>
                                <Link2 />
                                <input
                                    value={item.href}
                                    onChange={(event) =>
                                        update(
                                            items.map((value) =>
                                                value.id === item.id
                                                    ? { ...value, href: event.target.value }
                                                    : value,
                                            ),
                                        )
                                    }
                                />
                            </div>
                        </label>
                        <label className="cms-switch">
                            <input
                                type="checkbox"
                                checked={item.visible}
                                onChange={(event) =>
                                    update(
                                        items.map((value) =>
                                            value.id === item.id
                                                ? { ...value, visible: event.target.checked }
                                                : value,
                                        ),
                                    )
                                }
                            />
                            <span>Visível</span>
                        </label>
                        <label className="cms-switch">
                            <input
                                type="checkbox"
                                checked={item.newTab}
                                onChange={(event) =>
                                    update(
                                        items.map((value) =>
                                            value.id === item.id
                                                ? { ...value, newTab: event.target.checked }
                                                : value,
                                        ),
                                    )
                                }
                            />
                            <span>Nova aba</span>
                        </label>
                        <button
                            className="cms-icon-danger"
                            aria-label={`Excluir ${item.label}`}
                            onClick={() =>
                                window.confirm(`Excluir “${item.label}” do menu?`) &&
                                update(items.filter((value) => value.id !== item.id))
                            }
                        >
                            <Trash2 />
                        </button>
                    </div>
                ))}
            </div>
            <div className="cms-tip">
                <strong>E os botões das páginas?</strong>
                <span>
                    Os textos e destinos dos botões ficam em “Conteúdo do site”, dentro de cada
                    página.
                </span>
            </div>
        </div>
    );
}

function MediaLibrary({
    media,
    onChange,
    setError,
}: {
    media: MediaItem[];
    onChange: (items: MediaItem[]) => void;
    setError: (value: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [alt, setAlt] = useState('');
    const [query, setQuery] = useState('');
    const filtered = useMemo(
        () =>
            media.filter((item) =>
                `${item.name} ${item.alt}`.toLowerCase().includes(query.toLowerCase()),
            ),
        [media, query],
    );
    const register = async (itemUrl: string, itemName: string, itemAlt: string) => {
        if (!itemUrl.trim() || !itemName.trim())
            throw new Error('Informe a imagem e um nome para identificá-la.');
        setAdding(true);
        try {
            const item = await api.addMedia({
                url: itemUrl.trim(),
                name: itemName.trim(),
                alt: itemAlt.trim(),
            });
            onChange([item, ...media]);
            setUrl('');
            setName('');
            setAlt('');
        } finally {
            setAdding(false);
        }
    };
    const upload = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            const image = await api.uploadImage(file);
            await register(image, name || file.name.replace(/\.[^.]+$/, ''), alt);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mídia.');
        } finally {
            setUploading(false);
        }
    };
    return (
        <>
            <div className="cms-media-toolbar">
                <div className="cms-upload-card">
                    <Upload />
                    <div>
                        <h2>Enviar nova imagem</h2>
                        <p>JPG, PNG ou WebP de até 3 MB.</p>
                    </div>
                    <label className="button button-primary">
                        {uploading ? 'Enviando…' : 'Escolher arquivo'}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploading || adding}
                            onChange={(event) => void upload(event.target.files?.[0])}
                        />
                    </label>
                </div>
                <div className="cms-import-card">
                    <h2>Importar por endereço</h2>
                    <div>
                        <input
                            aria-label="Nome da mídia"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Nome para identificar"
                        />
                        <input
                            aria-label="Texto alternativo"
                            value={alt}
                            onChange={(event) => setAlt(event.target.value)}
                            placeholder="Descrição acessível"
                        />
                        <input
                            aria-label="Endereço da imagem"
                            type="url"
                            value={url}
                            onChange={(event) => setUrl(event.target.value)}
                            placeholder="https://…"
                        />
                        <button
                            className="button button-secondary"
                            disabled={adding || uploading}
                            onClick={() =>
                                void register(url, name, alt).catch((cause) =>
                                    setError(
                                        cause instanceof Error
                                            ? cause.message
                                            : 'Não foi possível adicionar a mídia.',
                                    ),
                                )
                            }
                        >
                            <Plus /> {adding ? 'Adicionando…' : 'Adicionar'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="cms-library-head">
                <div>
                    <h2>Biblioteca</h2>
                    <p>{media.length} imagens disponíveis</p>
                </div>
                <label className="cms-search">
                    <Search />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar mídia"
                        aria-label="Buscar mídia"
                    />
                </label>
            </div>
            <div className="cms-media-note">
                Excluir um item remove sua referência da biblioteca. O arquivo original no
                armazenamento não é apagado automaticamente.
            </div>
            {filtered.length ? (
                <div className="cms-media-grid">
                    {filtered.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            onUpdate={(updated) =>
                                onChange(
                                    media.map((value) =>
                                        value.id === updated.id ? updated : value,
                                    ),
                                )
                            }
                            onDelete={() => onChange(media.filter((value) => value.id !== item.id))}
                            setError={setError}
                        />
                    ))}
                </div>
            ) : (
                <div className="cms-empty-state">
                    <ImagePlus />
                    <h2>Nenhuma imagem encontrada</h2>
                    <p>Envie uma imagem ou limpe a busca.</p>
                </div>
            )}
        </>
    );
}

function MediaCard({
    item,
    onUpdate,
    onDelete,
    setError,
}: {
    item: MediaItem;
    onUpdate: (item: MediaItem) => void;
    onDelete: () => void;
    setError: (value: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [alt, setAlt] = useState(item.alt);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        try {
            onUpdate(await api.updateMedia(item.id, { name, alt }));
            setEditing(false);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível editar a mídia.');
        } finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!window.confirm(`Excluir “${item.name}” da biblioteca?`)) return;
        setBusy(true);
        try {
            await api.deleteMedia(item.id);
            onDelete();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a mídia.');
        } finally {
            setBusy(false);
        }
    };
    const copy = async () => {
        try {
            if (!navigator.clipboard) throw new Error();
            await navigator.clipboard.writeText(item.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setError(`Não foi possível copiar automaticamente. Selecione o endereço: ${item.url}`);
        }
    };
    return (
        <article className="cms-media-card">
            <img src={publicAsset(item.url)} alt={item.alt || item.name} />
            <div>
                {editing ? (
                    <>
                        <label>
                            Nome
                            <input value={name} onChange={(event) => setName(event.target.value)} />
                        </label>
                        <label>
                            Texto alternativo
                            <input value={alt} onChange={(event) => setAlt(event.target.value)} />
                        </label>
                        <button
                            className="button button-primary"
                            disabled={busy}
                            onClick={() => void save()}
                        >
                            Salvar
                        </button>
                    </>
                ) : (
                    <>
                        <strong>{item.name}</strong>
                        <p>{item.alt || 'Sem texto alternativo'}</p>
                        <div>
                            <button disabled={busy} onClick={() => setEditing(true)}>
                                Editar
                            </button>
                            <button disabled={busy} onClick={() => void copy()}>
                                <Copy /> {copied ? 'Copiado' : 'Copiar URL'}
                            </button>
                            <button
                                disabled={busy}
                                className="danger-link"
                                onClick={() => void remove()}
                            >
                                <Trash2 /> Excluir
                            </button>
                        </div>
                    </>
                )}
            </div>
        </article>
    );
}

function IntegrationsEditor({
    draft,
    status,
    onChange,
}: {
    draft: SiteContent;
    status: IntegrationStatus | null;
    onChange: (value: SiteContent) => void;
}) {
    const change = (key: keyof SiteContent['integrations'], value: string) =>
        onChange({ ...draft, integrations: { ...draft.integrations, [key]: value } });
    return (
        <div className="cms-integrations">
            <div className="cms-editor-card">
                <div className="cms-card-head">
                    <div>
                        <h2>Canais públicos</h2>
                        <p>Esses dados alimentam botões de contato e doação.</p>
                    </div>
                </div>
                <div className="cms-form-grid">
                    <Field
                        label="WhatsApp"
                        value={draft.integrations.whatsapp}
                        onChange={(value) => change('whatsapp', value)}
                        help="Somente DDI, DDD e número. Ex.: 5516999999999"
                    />
                    <Field
                        label="E-mail"
                        type="email"
                        value={draft.integrations.email}
                        onChange={(value) => change('email', value)}
                    />
                    <Field
                        label="Instagram"
                        value={draft.integrations.instagram}
                        onChange={(value) => change('instagram', value)}
                        help="Endereço completo do perfil"
                    />
                    <Field
                        label="Facebook"
                        value={draft.integrations.facebook}
                        onChange={(value) => change('facebook', value)}
                        help="Endereço completo da página"
                    />
                    <Field
                        label="Chave PIX"
                        value={draft.integrations.pixKey}
                        onChange={(value) => change('pixKey', value)}
                    />
                    <Field
                        label="Nome do recebedor"
                        value={draft.integrations.donationRecipient}
                        onChange={(value) => change('donationRecipient', value)}
                    />
                    <Field
                        label="Cidade do recebedor"
                        value={draft.integrations.donationCity}
                        onChange={(value) => change('donationCity', value)}
                    />
                </div>
            </div>
            <div className="cms-readiness">
                <h2>Estado dos serviços</h2>
                <p>
                    Uma visão segura da infraestrutura. Senhas e chaves privadas continuam apenas no
                    servidor.
                </p>
                <StatusCard
                    label="Ambiente"
                    ok={status?.mode === 'api'}
                    text={status?.mode === 'api' ? 'API conectada' : 'Demonstração local'}
                />
                <StatusCard
                    label="Envio de e-mail"
                    ok={Boolean(status?.smtp)}
                    text={
                        status?.smtp
                            ? 'SMTP configurado'
                            : 'Configure SMTP_HOST e credenciais no servidor'
                    }
                />
                <StatusCard
                    label="Armazenamento"
                    ok={Boolean(status?.storage)}
                    text={
                        status?.storage
                            ? 'Upload externo configurado'
                            : 'Configure o bucket R2 no servidor'
                    }
                />
                <StatusCard
                    label="Doações"
                    ok={Boolean(status?.pix || draft.integrations.pixKey)}
                    text={
                        status?.pix || draft.integrations.pixKey
                            ? 'PIX informado'
                            : 'Informe a chave PIX acima'
                    }
                />
                {status?.origin && (
                    <div className="cms-origin">
                        <span>Origem autorizada</span>
                        <code>{status.origin}</code>
                    </div>
                )}
                {isDemoMode && (
                    <div className="cms-tip">
                        <strong>Modo demonstração</strong>
                        <span>
                            As alterações ficam neste navegador. Ao conectar a API, passam a ser
                            compartilhadas pela equipe.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusCard({ label, ok, text }: { label: string; ok: boolean; text: string }) {
    return (
        <div className={`cms-service ${ok ? 'is-ready' : ''}`}>
            <span>{ok ? <CheckCircle2 /> : <RefreshCcw />}</span>
            <div>
                <strong>{label}</strong>
                <small>{text}</small>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    help,
    textarea,
    wide,
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    help?: string;
    textarea?: boolean;
    wide?: boolean;
    type?: string;
}) {
    const generatedId = useId();
    const id = `cms-field-${generatedId.replace(/:/g, '')}`;
    const helpId = `${id}-help`;
    return (
        <div className={`cms-field ${wide ? 'cms-field-wide' : ''}`}>
            <label htmlFor={id}>{label}</label>
            {textarea ? (
                <textarea
                    id={id}
                    aria-describedby={help ? helpId : undefined}
                    rows={4}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <input
                    id={id}
                    aria-describedby={help ? helpId : undefined}
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            {help && <small id={helpId}>{help}</small>}
        </div>
    );
}
