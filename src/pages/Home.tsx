import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    Cat,
    Dog,
    Heart,
    HeartHandshake,
    House,
    MapPin,
    PawPrint,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { publicAsset } from '../lib/assets';
import { currency, useAsync } from '../lib/hooks';
import { articles } from '../data/articles';
import PetCard from '../components/PetCard';
import { ErrorState, JoinBanner, LoadingState } from '../components/Shared';

export default function Home() {
    const [species, setSpecies] = useState('all');
    const pets = useAsync(api.getPets);
    const campaigns = useAsync(api.getCampaigns);
    const featured = (pets.data || [])
        .filter(
            (pet) => pet.status === 'available' && (species === 'all' || pet.species === species),
        )
        .slice(0, 4);
    const campaign = campaigns.data?.find((item) => item.status === 'active');

    return (
        <>
            <section className="hero container">
                <div className="hero-copy">
                    <span className="eyebrow hero-eyebrow">
                        <span /> UM NOVO COMEÇO TEM QUATRO PATAS
                    </span>
                    <h1>
                        Todo amor
                        <br />
                        merece{' '}
                        <span className="highlight-word">
                            um lar.
                            <svg viewBox="0 0 370 18" aria-hidden="true">
                                <path d="M5 12 Q170 -1 365 9" />
                            </svg>
                        </span>
                    </h1>
                    <p>
                        Às vezes, tudo o que falta na sua vida é alguém
                        <br className="desktop-break" /> esperando por você. Dê uma chance a esse
                        encontro.
                    </p>
                    <div className="hero-actions">
                        <Link to="/adotar" className="button button-primary">
                            Encontre seu novo amigo <ArrowUpRight size={18} />
                        </Link>
                        <Link to="/sobre" className="text-link">
                            Nossa história <ArrowRight size={17} />
                        </Link>
                    </div>
                    <div className="hero-footnote">
                        <div className="little-paw">
                            <PawPrint size={21} />
                        </div>
                        <p>
                            Resgatamos histórias.
                            <br />
                            <strong>Juntos, escrevemos novos finais.</strong>
                        </p>
                    </div>
                    <svg
                        className="hero-doodle"
                        viewBox="0 0 100 65"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path d="M8 7C27 43 60 4 49 29S20 54 79 48M69 36l13 12-15 9" />
                    </svg>
                </div>
                <div className="hero-visual">
                    <div className="hero-photo-wrap">
                        <img
                            src={publicAsset('/images/hero-cat.jpg')}
                            alt="Gato laranja olhando com curiosidade para cima"
                            width="1400"
                            height="1800"
                            fetchPriority="high"
                        />
                        <div className="hero-photo-shade" />
                        <span className="photo-caption">
                            <span /> Uma chance muda tudo.
                        </span>
                    </div>
                    <div className="love-stamp">
                        <span>ADOTAR É</span>
                        <Heart size={31} strokeWidth={1.6} />
                        <span>AMAR DE VERDADE</span>
                    </div>
                    <div className="floating-note">
                        <div>
                            <House size={23} strokeWidth={1.7} />
                        </div>
                        <p>
                            Um cantinho no seu lar.
                            <br />
                            <strong>Um mundo inteiro para ele.</strong>
                        </p>
                        <Heart size={19} className="note-heart" />
                    </div>
                    <Sparkles className="hero-sparkles" size={34} strokeWidth={1.5} />
                </div>
            </section>

            <section className="values-strip" aria-label="Nossos valores">
                <div className="container">
                    <span>
                        <HeartHandshake /> Acolher com amor
                    </span>
                    <i />
                    <span>
                        <ShieldCheck /> Cuidar com responsabilidade
                    </span>
                    <i />
                    <span>
                        <House /> Conectar novas famílias
                    </span>
                    <i />
                    <span className="values-location">
                        <MapPin /> Araraquara & Matão
                    </span>
                </div>
            </section>

            <section className="adoption-section container">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">
                            <PawPrint size={14} /> ESPERANDO POR UM ENCONTRO
                        </span>
                        <h2>
                            Seu novo melhor amigo
                            <br className="mobile-break" /> está por aqui.
                        </h2>
                        <p>Personalidades únicas. Um mesmo desejo: fazer parte da sua vida.</p>
                    </div>
                    <Link to="/adotar" className="text-link">
                        Conhecer todos <ArrowUpRight size={18} />
                    </Link>
                </div>
                <div className="pet-filter-row">
                    <div className="filter-tabs" aria-label="Filtrar animais em destaque">
                        <button
                            className={species === 'all' ? 'active' : ''}
                            aria-pressed={species === 'all'}
                            onClick={() => setSpecies('all')}
                        >
                            <PawPrint size={16} /> Todos os amigos
                        </button>
                        <button
                            className={species === 'cat' ? 'active' : ''}
                            aria-pressed={species === 'cat'}
                            onClick={() => setSpecies('cat')}
                        >
                            <Cat size={17} /> Gatos
                        </button>
                        <button
                            className={species === 'dog' ? 'active' : ''}
                            aria-pressed={species === 'dog'}
                            onClick={() => setSpecies('dog')}
                        >
                            <Dog size={17} /> Cães
                        </button>
                    </div>
                    <span className="small-note">
                        O amor não escolhe raça. <Heart size={13} />
                    </span>
                </div>
                {pets.loading ? (
                    <LoadingState />
                ) : pets.error ? (
                    <ErrorState message={pets.error} retry={pets.retry} />
                ) : (
                    <div className="pet-grid">
                        {featured.map((pet, index) => (
                            <PetCard pet={pet} index={index} key={pet.id} />
                        ))}
                    </div>
                )}
                {isDemoMode && (
                    <p className="demo-caption">
                        Conheça a experiência com perfis e fotografias de demonstração.
                    </p>
                )}
            </section>

            <section className="how-section">
                <div className="container how-inner">
                    <div className="how-heading">
                        <span className="eyebrow">DO PRIMEIRO OLHAR AO NOVO LAR</span>
                        <h2>
                            O começo de
                            <br />
                            uma boa história.
                        </h2>
                        <p>
                            A adoção é um compromisso para a vida.
                            <br />A gente te acompanha nesse caminho.
                        </p>
                        <Link className="text-link" to="/adotar">
                            Vamos dar o primeiro passo? <ArrowRight size={17} />
                        </Link>
                    </div>
                    <div className="how-steps">
                        <article>
                            <div className="step-top">
                                <span>01</span>
                                <PawPrint size={23} />
                            </div>
                            <h3>Encontre sua conexão</h3>
                            <p>
                                Conheça os animais, suas histórias e descubra quem combina com você.
                            </p>
                        </article>
                        <article>
                            <div className="step-top">
                                <span>02</span>
                                <HeartHandshake size={25} />
                            </div>
                            <h3>Vamos conversar</h3>
                            <p>
                                Preencha o formulário. Nossa equipe avalia o perfil e combina os
                                próximos passos.
                            </p>
                        </article>
                        <article>
                            <div className="step-top">
                                <span>03</span>
                                <House size={23} />
                            </div>
                            <h3>Abra espaço para o amor</h3>
                            <p>
                                Com tudo pronto e a adoção aprovada, é hora de começar uma vida
                                juntos.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="care-section container">
                <div className="care-copy">
                    <span className="eyebrow">
                        <Heart size={14} /> AMOR QUE VIRA CUIDADO
                    </span>
                    <h2>
                        Você também pode
                        <br />
                        mudar uma história.
                    </h2>
                    <p>
                        Nem sempre dá para adotar. Mas toda ajuda se transforma em alimento,
                        atendimento veterinário e novas chances para quem precisa.
                    </p>
                    <Link to="/doar" className="button button-primary">
                        Conheça nossas campanhas <ArrowUpRight size={17} />
                    </Link>
                    <span className="care-footnote">
                        <ShieldCheck size={16} /> Cuidado e responsabilidade em cada contribuição.
                    </span>
                </div>
                {campaign ? (
                    <Link className="featured-campaign" to={`/doar?campanha=${campaign.id}`}>
                        <div className="featured-campaign-image">
                            <img
                                src={publicAsset(campaign.image)}
                                alt="Gata acolhida, imagem ilustrativa da campanha"
                                loading="lazy"
                            />
                            <span>
                                <Heart size={13} /> UMA CHANCE DE RECOMEÇAR
                            </span>
                        </div>
                        <div className="featured-campaign-info">
                            <span className="eyebrow">{campaign.category}</span>
                            <h3>
                                {campaign.title}
                                <ArrowUpRight size={23} />
                            </h3>
                            <p>{campaign.description}</p>
                            <div className="progress-track">
                                <span
                                    style={{
                                        width: `${Math.min(100, (campaign.raised / campaign.target) * 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="campaign-amounts">
                                <strong>
                                    {currency(campaign.raised)} <span>arrecadados</span>
                                </strong>
                                <span>Meta: {currency(campaign.target)}</span>
                            </div>
                            {isDemoMode && <small>Valores ilustrativos da demonstração</small>}
                        </div>
                    </Link>
                ) : (
                    <div className="care-alternative">
                        <HeartHandshake size={65} />
                        <h3>Pequenos gestos, grandes recomeços.</h3>
                        <Link to="/doar" className="text-link">
                            Veja como contribuir <ArrowRight size={18} />
                        </Link>
                    </div>
                )}
            </section>

            <JoinBanner />

            <section className="articles-section container">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">CUIDADO TAMBÉM SE APRENDE</span>
                        <h2>Para uma vida boa, juntos.</h2>
                    </div>
                    <Link className="text-link" to="/conteudos">
                        Mais dicas e cuidados <ArrowUpRight size={18} />
                    </Link>
                </div>
                <div className="article-grid">
                    {articles.map((article) => (
                        <Link
                            to={`/conteudos/${article.slug}`}
                            className="article-card"
                            key={article.slug}
                        >
                            <div className="article-image">
                                <img src={publicAsset(article.image)} alt="" loading="lazy" />
                                <span className="article-arrow">
                                    <ArrowUpRight size={23} />
                                </span>
                            </div>
                            <span className="eyebrow">{article.category}</span>
                            <h3>{article.title}</h3>
                            <p>{article.excerpt}</p>
                        </Link>
                    ))}
                </div>
            </section>
            <div className="closing-line container">
                <span />
                <PawPrint size={19} />
                <p>O próximo final feliz pode começar com você.</p>
                <ArrowDown size={16} />
                <span />
            </div>
        </>
    );
}
