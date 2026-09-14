import { ArrowUpRight, Heart, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../lib/hooks';
import { publicAsset } from '../lib/assets';
import type { Pet } from '../lib/types';

export default function PetCard({ pet, index = 0 }: { pet: Pet; index?: number }) {
    const { favorites, toggleFavorite, favoriteError } = useFavorites();
    const favorite = favorites.includes(pet.id);
    return (
        <article className={`pet-card pet-tint-${index % 4}`}>
            <div className="pet-card-photo">
                <Link to={`/amigos/${pet.id}`} tabIndex={-1} aria-hidden="true">
                    <img
                        src={publicAsset(pet.image)}
                        alt=""
                        loading="lazy"
                        width="440"
                        height="450"
                    />
                </Link>
                <span className={`pet-status${pet.status === 'treatment' ? ' in-treatment' : ''}`}>
                    <i />
                    {pet.status === 'treatment' ? 'Recebendo cuidados' : 'Pronto para um lar'}
                </span>
                <button
                    className={`favorite-button${favorite ? ' is-favorite' : ''}`}
                    onClick={() => toggleFavorite(pet.id)}
                    aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${pet.name} ${favorite ? 'dos' : 'aos'} favoritos`}
                    aria-pressed={favorite}
                >
                    <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
                </button>
            </div>
            <div className="pet-card-body">
                <div className="pet-card-name">
                    <Link to={`/amigos/${pet.id}`}>
                        <h3>{pet.name}</h3>
                    </Link>
                    <span className="pet-sex" aria-label={pet.sex === 'female' ? 'Fêmea' : 'Macho'}>
                        {pet.sex === 'female' ? '♀' : '♂'}
                    </span>
                </div>
                <p className="pet-meta">
                    {pet.ageLabel}
                    <span>·</span>
                    {pet.size === 'small'
                        ? 'Porte pequeno'
                        : pet.size === 'medium'
                          ? 'Porte médio'
                          : 'Porte grande'}
                </p>
                <p className="pet-city">
                    <MapPin size={13} />
                    {pet.city}
                </p>
                <div className="pet-tags">
                    {pet.temperament.slice(0, 2).map((tag) => (
                        <span key={tag}>{tag}</span>
                    ))}
                </div>
                {favoriteError && (
                    <p className="inline-error" role="alert">
                        {favoriteError}
                    </p>
                )}
                <Link className="pet-card-link" to={`/amigos/${pet.id}`}>
                    Quero conhecer <ArrowUpRight size={18} />
                </Link>
            </div>
        </article>
    );
}
