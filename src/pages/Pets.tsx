import { useSearchParams } from 'react-router-dom';
import { Cat, Dog, Heart, PawPrint, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { useAsync, useFavorites } from '../lib/hooks';
import PetCard from '../components/PetCard';
import { ErrorState, JoinBanner, LoadingState, PageHeading } from '../components/Shared';

export default function Pets() {
    const { data: pets, loading, error, retry } = useAsync(api.getPets);
    const [params, setParams] = useSearchParams();
    const { favorites } = useFavorites();
    const query = params.get('busca') || '';
    const species = params.get('especie') || 'all';
    const age = params.get('idade') || 'all';
    const city = params.get('cidade') || 'all';
    const status = params.get('status') || 'all';
    const onlyFavorites = params.get('favoritos') === 'sim';
    const change = (key: string, value: string) => {
        // History updates immediately; React Router may still be rendering the last change.
        const currentLocation =
            import.meta.env.VITE_ROUTER_MODE === 'hash'
                ? new URL(window.location.hash.slice(1), window.location.origin)
                : window.location;
        const next = new URLSearchParams(currentLocation.search);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        setParams(next, { replace: true, preventScrollReset: true });
    };
    const normalize = (text: string) =>
        text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    const hasNoFavorites = onlyFavorites && favorites.length === 0;
    const filtered = (pets || []).filter(
        (pet) =>
            (!onlyFavorites || favorites.includes(pet.id)) &&
            (species === 'all' || pet.species === species) &&
            (age === 'all' || pet.ageGroup === age) &&
            (city === 'all' || pet.city === city) &&
            (status === 'all' || pet.status === status) &&
            normalize(`${pet.name} ${pet.description} ${pet.temperament.join(' ')}`).includes(
                normalize(query),
            ),
    );

    return (
        <div className="pets-page">
            <PageHeading
                eyebrow="UM ENCONTRO PODE MUDAR TUDO"
                title="Quem vai ganhar seu coração?"
                description="Cada olhar guarda uma história. Encontre um amigo para escrever o próximo capítulo com você."
            />
            <section className="container catalog-section">
                <div className="catalog-toolbar">
                    <div className="filter-tabs">
                        <button
                            className={species === 'all' ? 'active' : ''}
                            onClick={() => change('especie', 'all')}
                            aria-pressed={species === 'all'}
                        >
                            <PawPrint size={17} /> Todos
                        </button>
                        <button
                            className={species === 'cat' ? 'active' : ''}
                            onClick={() => change('especie', 'cat')}
                            aria-pressed={species === 'cat'}
                        >
                            <Cat size={18} /> Gatos
                        </button>
                        <button
                            className={species === 'dog' ? 'active' : ''}
                            onClick={() => change('especie', 'dog')}
                            aria-pressed={species === 'dog'}
                        >
                            <Dog size={18} /> Cães
                        </button>
                    </div>
                    <button
                        className={`button favorites-filter ${onlyFavorites ? 'selected' : ''}`}
                        onClick={() => change('favoritos', onlyFavorites ? '' : 'sim')}
                        aria-pressed={onlyFavorites}
                    >
                        <Heart size={17} fill={onlyFavorites ? 'currentColor' : 'none'} /> Meus
                        favoritos <span>{favorites.length}</span>
                    </button>
                </div>
                <div className="catalog-filters">
                    <label className="search-field">
                        <Search size={19} />
                        <input
                            type="search"
                            aria-label="Buscar por nome ou personalidade"
                            placeholder="Um nome, uma personalidade…"
                            value={query}
                            onChange={(event) => change('busca', event.target.value)}
                        />
                    </label>
                    <label>
                        <span>Idade</span>
                        <select
                            value={age}
                            onChange={(event) => change('idade', event.target.value)}
                        >
                            <option value="all">Todas as idades</option>
                            <option value="kitten">Filhotes</option>
                            <option value="adult">Adultos</option>
                            <option value="senior">Idosos</option>
                        </select>
                    </label>
                    <label>
                        <span>Cidade</span>
                        <select
                            value={city}
                            onChange={(event) => change('cidade', event.target.value)}
                        >
                            <option value="all">Todas as cidades</option>
                            {[...new Set((pets || []).map((pet) => pet.city))]
                                .sort()
                                .map((name) => (
                                    <option value={name} key={name}>
                                        {name}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label>
                        <span>Momento</span>
                        <select
                            value={status}
                            onChange={(event) => change('status', event.target.value)}
                        >
                            <option value="all">Todos os amigos</option>
                            <option value="available">Prontos para adoção</option>
                            <option value="treatment">Em tratamento</option>
                        </select>
                    </label>
                </div>
                <div className="results-heading">
                    <p aria-live="polite">
                        <SlidersHorizontal size={15} /> <strong>{filtered.length}</strong>{' '}
                        {filtered.length === 1 ? 'amigo encontrado' : 'amigos encontrados'}
                    </p>
                    {params.size > 0 && (
                        <button className="text-link" onClick={() => setParams({})}>
                            Limpar filtros <X size={14} />
                        </button>
                    )}
                </div>
                {loading ? (
                    <LoadingState label="Encontrando seus novos amigos…" />
                ) : error ? (
                    <ErrorState message={error} retry={retry} />
                ) : filtered.length ? (
                    <div className="pet-grid">
                        {filtered.map((pet, index) => (
                            <PetCard key={pet.id} pet={pet} index={index} />
                        ))}
                    </div>
                ) : (
                    <div className="state-box empty-pets">
                        <PawPrint size={38} />
                        <h2>
                            {hasNoFavorites
                                ? 'Seu coração ainda tem espaço.'
                                : 'Nenhum amigo com esses filtros.'}
                        </h2>
                        <p>
                            {hasNoFavorites
                                ? 'Toque no coração de um perfil para guardar seus encontros favoritos.'
                                : 'Experimente outra combinação. Seu novo amigo pode estar logo ali.'}
                        </p>
                        <button className="button button-primary" onClick={() => setParams({})}>
                            Ver todos os amigos
                        </button>
                    </div>
                )}
                {isDemoMode && (
                    <p className="demo-caption">
                        Catálogo de demonstração. Perfis, idades e condições de saúde são
                        ilustrativos.
                    </p>
                )}
            </section>
            <JoinBanner />
        </div>
    );
}
