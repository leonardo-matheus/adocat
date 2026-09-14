import { useCallback, useEffect, useState } from 'react';

export function useAsync<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        loader()
            .then((result) => {
                if (active) setData(result);
            })
            .catch((failure: unknown) => {
                if (active)
                    setError(
                        failure instanceof Error
                            ? failure.message
                            : 'Algo deu errado. Tente novamente.',
                    );
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
        // Callers define the resource identity through dependencies.
    }, [...dependencies, attempt]);
    return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}

const FAVORITES_KEY = 'adocat-favorites';
function readFavorites(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === 'string')
            : [];
    } catch {
        return [];
    }
}

export function useFavorites() {
    const [favorites, setFavorites] = useState(readFavorites);
    const [favoriteError, setFavoriteError] = useState('');
    useEffect(() => {
        const update = () => setFavorites(readFavorites());
        window.addEventListener('adocat-favorites-updated', update);
        window.addEventListener('storage', update);
        return () => {
            window.removeEventListener('adocat-favorites-updated', update);
            window.removeEventListener('storage', update);
        };
    }, []);
    const toggleFavorite = useCallback((id: string) => {
        const current = readFavorites();
        const next = current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id];
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
            setFavoriteError('');
            window.dispatchEvent(new Event('adocat-favorites-updated'));
        } catch {
            setFavoriteError('Permita o armazenamento do navegador para salvar favoritos.');
        }
    }, []);
    return { favorites, toggleFavorite, favoriteError };
}

export const currency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
