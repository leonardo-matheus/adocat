import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    Heart,
    House,
    MapPin,
    PawPrint,
    Share2,
    ShieldCheck,
    Syringe,
} from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { publicAsset } from '../lib/assets';
import { useAsync, useFavorites } from '../lib/hooks';
import { ErrorState, LoadingState } from '../components/Shared';
import PetCard from '../components/PetCard';
import { SiteLink, useSiteContent } from '../lib/site-content';

export default function PetDetail() {
    const { text } = useSiteContent();
    const { petId = '' } = useParams();
    const { data: pet, loading, error, retry } = useAsync(() => api.getPet(petId), [petId]);
    const others = useAsync(api.getPets);
    const { favorites, toggleFavorite, favoriteError } = useFavorites();
    const [shareMessage, setShareMessage] = useState('');
    const share = async () => {
        if (!pet) return;
        try {
            if (navigator.share)
                await navigator.share({
                    title: `Conheça ${pet.name} — AdoCat`,
                    text: `Um novo começo para ${pet.name}. Conheça essa história!`,
                    url: window.location.href,
                });
            else {
                await navigator.clipboard.writeText(window.location.href);
                setShareMessage('Link copiado! Compartilhe essa história.');
            }
        } catch (cause) {
            if (!(cause instanceof DOMException && cause.name === 'AbortError'))
                setShareMessage('Copie o endereço desta página para compartilhar.');
        }
    };
    if (loading) return <LoadingState />;
    if (error || !pet)
        return (
            <div className="container">
                <ErrorState message={error || 'Perfil indisponível.'} retry={retry} />
                <Link className="button button-secondary" to="/adotar">
                    Voltar aos animais
                </Link>
            </div>
        );
    const favorite = favorites.includes(pet.id);
    return (
        <div className="detail-page container">
            <Link to="/adotar" className="back-link">
                <ArrowLeft size={16} /> {text('petDetail.backLabel', 'Todos os amigos')}
            </Link>
            <div className="pet-detail-grid">
                <div className="detail-photo">
                    <img
                        src={publicAsset(pet.image)}
                        alt={`${pet.name}, ${pet.species === 'cat' ? 'gato' : 'cão'} em busca de um lar`}
                    />
                    <span className="detail-photo-note">
                        <PawPrint size={15} />{' '}
                        {text('petDetail.photoCaption', 'Uma vida inteira de carinho pela frente.')}
                    </span>
                </div>
                <div className="detail-copy">
                    <span
                        className={`pet-status static-status ${pet.status === 'treatment' ? 'in-treatment' : ''}`}
                    >
                        <i />
                        {pet.status === 'available'
                            ? 'Pronto para um lar'
                            : pet.status === 'treatment'
                              ? 'Recebendo cuidados'
                              : 'Já encontrou um lar'}
                    </span>
                    <span className="eyebrow">{text('petDetail.eyebrow', 'OI, EU SOU')}</span>
                    <h1>
                        {pet.name}
                        <Heart size={34} strokeWidth={1.3} />
                    </h1>
                    <p className="detail-location">
                        <MapPin size={16} /> {pet.city}, SP
                    </p>
                    <div className="detail-facts">
                        <div>
                            <span>Idade</span>
                            <strong>{pet.ageLabel}</strong>
                        </div>
                        <div>
                            <span>Sexo</span>
                            <strong>{pet.sex === 'female' ? 'Fêmea' : 'Macho'}</strong>
                        </div>
                        <div>
                            <span>Porte</span>
                            <strong>
                                {{ small: 'Pequeno', medium: 'Médio', large: 'Grande' }[pet.size]}
                            </strong>
                        </div>
                    </div>
                    <h2>{text('petDetail.storyTitle', 'Um pouquinho de mim')}</h2>
                    <p className="pet-story">{pet.description}</p>
                    <div className="detail-tags">
                        {pet.temperament.map((trait) => (
                            <span key={trait}>{trait}</span>
                        ))}
                    </div>
                    <div className="health-indicators">
                        <span>
                            <Syringe size={17} />
                            {pet.vaccinated ? 'Vacinação em dia' : 'Vacinação a avaliar'}
                            {pet.vaccinated && <Check size={14} />}
                        </span>
                        <span>
                            <ShieldCheck size={17} />
                            {pet.neutered ? 'Castrado' : 'Castração a avaliar'}
                            {pet.neutered && <Check size={14} />}
                        </span>
                    </div>
                    <div className="detail-actions">
                        {pet.status === 'available' ? (
                            <Link className="button button-primary" to={`/adotar/${pet.id}`}>
                                {text('petDetail.adoptLabel', 'Quero adotar')} {pet.name}{' '}
                                <ArrowUpRight size={18} />
                            </Link>
                        ) : (
                            <Link
                                className="button button-primary"
                                to={pet.status === 'treatment' ? '/doar' : '/adotar'}
                            >
                                {pet.status === 'treatment'
                                    ? text('petDetail.treatmentLabel', 'Ajudar com os cuidados')
                                    : text('petDetail.othersLabel', 'Conhecer outros amigos')}
                                <Heart size={17} />
                            </Link>
                        )}
                        <button
                            className={`button button-secondary ${favorite ? 'is-favorite' : ''}`}
                            onClick={() => toggleFavorite(pet.id)}
                            aria-pressed={favorite}
                            aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${pet.name} ${favorite ? 'dos' : 'aos'} favoritos`}
                        >
                            <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            className="button button-secondary"
                            onClick={share}
                            aria-label={`Compartilhar ${pet.name}`}
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                    {shareMessage && (
                        <p className="share-message" role="status">
                            {shareMessage}
                        </p>
                    )}
                    {favoriteError && (
                        <p role="alert" className="inline-error">
                            {favoriteError}
                        </p>
                    )}
                    <div className="adoption-reminder">
                        <House size={24} />
                        <p>
                            {text(
                                'petDetail.reminder',
                                'Um lar seguro e um compromisso para a vida.',
                            )}
                            <br />
                            <SiteLink
                                href={text(
                                    'petDetail.reminderHref',
                                    '/conteudos/primeiros-dias-em-casa',
                                )}
                            >
                                {text(
                                    'petDetail.reminderLabel',
                                    'Saiba como se preparar para a adoção.',
                                )}
                            </SiteLink>
                        </p>
                    </div>
                    {isDemoMode && (
                        <small className="demo-detail">
                            Este é um perfil demonstrativo com fotografia ilustrativa.
                        </small>
                    )}
                </div>
            </div>
            <section className="more-friends">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">
                            {text('petDetail.relatedEyebrow', 'MAIS OLHARES, MAIS HISTÓRIAS')}
                        </span>
                        <h2>{text('petDetail.relatedTitle', 'Você também pode se encantar.')}</h2>
                    </div>
                    <SiteLink className="text-link" href={text('petDetail.relatedHref', '/adotar')}>
                        {text('petDetail.relatedLabel', 'Ver todos')} <ArrowUpRight size={18} />
                    </SiteLink>
                </div>
                <div className="pet-grid">
                    {others.data
                        ?.filter((item) => item.id !== pet.id && item.status === 'available')
                        .slice(0, 4)
                        .map((item, index) => (
                            <PetCard pet={item} key={item.id} index={index} />
                        ))}
                </div>
            </section>
        </div>
    );
}
