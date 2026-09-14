import { ArrowLeft, ArrowUpRight, Clock, Heart, PawPrint } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { articles } from '../data/articles';
import { publicAsset } from '../lib/assets';
import { JoinBanner, PageHeading } from '../components/Shared';
import { SiteLink, useSiteContent } from '../lib/site-content';

export default function Articles() {
    const { content, text, preview } = useSiteContent();
    const { slug } = useParams();
    const visibleArticles = (content.articles || articles).filter(
        (item) => preview || !('status' in item) || item.status === 'published',
    );
    const article = visibleArticles.find((item) => item.slug === slug);
    if (slug && !article)
        return (
            <div className="container state-box">
                <PawPrint size={42} />
                <h1>Conteúdo não encontrado</h1>
                <Link to="/conteudos" className="button button-primary">
                    Ver todas as dicas
                </Link>
            </div>
        );
    if (article)
        return (
            <article className="article-detail container">
                <Link className="back-link" to="/conteudos">
                    <ArrowLeft size={16} /> Dicas e cuidados
                </Link>
                <div className="article-detail-heading">
                    <span className="eyebrow">{article.category}</span>
                    <h1>{article.title}</h1>
                    <p>{article.excerpt}</p>
                    <span className="reading-time">
                        <Clock size={14} />
                        {article.readTime}
                    </span>
                </div>
                <img
                    className="article-cover"
                    src={publicAsset(article.image)}
                    alt="Fotografia ilustrativa de um gato em um ambiente acolhedor"
                />
                <div className="article-text">
                    {article.sections.map((section) => (
                        <section key={section.title}>
                            <h2>{section.title}</h2>
                            <p>{section.text}</p>
                        </section>
                    ))}
                    <aside>
                        <Heart size={23} />
                        <p>
                            {text(
                                'articles.disclaimer',
                                'Informação também é cuidado. Para orientações sobre a saúde do seu animal, consulte um médico-veterinário.',
                            )}
                        </p>
                    </aside>
                    <SiteLink
                        href={text('articles.ctaHref', '/adotar')}
                        className="button button-primary"
                    >
                        {text('articles.ctaLabel', 'Pronto para um novo amigo?')}{' '}
                        <ArrowUpRight size={17} />
                    </SiteLink>
                </div>
            </article>
        );
    return (
        <div className="articles-page">
            <PageHeading
                eyebrow={text('articles.eyebrow', 'CUIDADO TAMBÉM SE APRENDE')}
                title={text('articles.title', 'Para uma vida boa, juntos.')}
                description={text(
                    'articles.description',
                    'Orientações simples para acolher, proteger e construir uma relação cheia de carinho.',
                )}
            />
            <section className="container article-grid">
                {visibleArticles.map((item) => (
                    <Link to={`/conteudos/${item.slug}`} className="article-card" key={item.slug}>
                        <div className="article-image">
                            <img src={publicAsset(item.image)} alt="" loading="lazy" />
                            <span className="article-arrow">
                                <ArrowUpRight size={23} />
                            </span>
                        </div>
                        <span className="eyebrow">{item.category}</span>
                        <h2>{item.title}</h2>
                        <p>{item.excerpt}</p>
                        <span className="reading-time">
                            <Clock size={13} />
                            {item.readTime}
                        </span>
                    </Link>
                ))}
            </section>
            <JoinBanner />
        </div>
    );
}
