import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type AnchorHTMLAttributes,
    type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { defaultContent, isSafeLink, resolveContent, type SiteContent } from './content';

type ContentContextValue = {
    content: SiteContent;
    text: (key: string, fallback: string) => string;
    loading: boolean;
    preview: boolean;
};

const ContentContext = createContext<ContentContextValue>({
    content: defaultContent,
    text: (_key, fallback) => fallback,
    loading: true,
    preview: false,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [content, setContent] = useState<SiteContent>(defaultContent);
    const [preview, setPreview] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const requestedPreview = new URLSearchParams(location.search).get('preview') === '1';
    const isAdmin = location.pathname.startsWith('/admin');
    const showDraft = !isAdmin && (requestedPreview || preview);

    useEffect(() => {
        if (isAdmin) setPreview(false);
    }, [isAdmin]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        (async () => {
            if (showDraft) {
                const session = await api.getSession();
                if (!session.authenticated)
                    throw new Error('Entre no painel da equipe para visualizar o rascunho.');
                const state = await api.getAdminContent();
                if (active) {
                    setContent(resolveContent(state.draft));
                    setPreview(true);
                }
            } else {
                const published = await api.getContent();
                if (active)
                    setContent({
                        ...published,
                        articles:
                            published.articles?.filter(
                                (article) => article.status === 'published',
                            ) || [],
                    });
            }
        })()
            .catch((reason: unknown) => {
                if (active) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Não foi possível carregar o conteúdo.',
                    );
                    setContent(defaultContent);
                    setPreview(false);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [showDraft, refresh]);

    useEffect(() => {
        const update = () => setRefresh((value) => value + 1);
        const storage = (event: StorageEvent) => {
            if (event.key === 'adocat-content-v1') update();
        };
        window.addEventListener('adocat-content-updated', update);
        window.addEventListener('storage', storage);
        return () => {
            window.removeEventListener('adocat-content-updated', update);
            window.removeEventListener('storage', storage);
        };
    }, []);

    const text = useCallback(
        (key: string, fallback: string) => content.values[key] ?? fallback,
        [content.values],
    );

    return (
        <ContentContext.Provider value={{ content, text, loading, preview }}>
            {preview && !isAdmin && (
                <div className="content-preview-bar" role="status">
                    <span>
                        <strong>Prévia do rascunho</strong> · As mudanças ainda não foram
                        publicadas.
                    </span>
                    <div>
                        <button type="button" onClick={() => navigate('/admin')}>
                            Voltar ao painel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPreview(false);
                                const query = new URLSearchParams(location.search);
                                query.delete('preview');
                                navigate(
                                    {
                                        pathname: location.pathname,
                                        search: query.toString(),
                                        hash: location.hash,
                                    },
                                    { replace: true },
                                );
                            }}
                        >
                            Ver site publicado
                        </button>
                    </div>
                </div>
            )}
            {error && !isAdmin && (
                <div className="content-load-error" role="alert">
                    {error}{' '}
                    <button type="button" onClick={() => setRefresh((value) => value + 1)}>
                        Tentar novamente
                    </button>
                </div>
            )}
            {children}
        </ContentContext.Provider>
    );
}

export function useSiteContent() {
    return useContext(ContentContext);
}

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    newTab?: boolean;
    children: ReactNode;
};

export function SiteLink({ href, newTab = false, children, target, rel, ...props }: SiteLinkProps) {
    const destination = isSafeLink(href) ? href : '/';
    const openNewTab = newTab || target === '_blank';
    if (destination.startsWith('/') || destination.startsWith('#')) {
        return (
            <Link
                to={destination}
                {...props}
                target={openNewTab ? '_blank' : target}
                rel={openNewTab ? 'noopener noreferrer' : rel}
            >
                {children}
            </Link>
        );
    }
    return (
        <a
            {...props}
            href={destination}
            target={openNewTab ? '_blank' : target}
            rel={openNewTab ? 'noopener noreferrer' : rel}
        >
            {children}
        </a>
    );
}
