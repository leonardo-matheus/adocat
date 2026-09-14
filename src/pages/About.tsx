import {
    ArrowRight,
    ArrowUpRight,
    Heart,
    House,
    MapPin,
    PawPrint,
    ShieldCheck,
} from 'lucide-react';
import { JoinBanner, PageHeading } from '../components/Shared';
import { publicAsset } from '../lib/assets';
import { SiteLink, useSiteContent } from '../lib/site-content';

export default function About() {
    const { content, text } = useSiteContent();
    const whatsapp = content.integrations.whatsapp;
    const whatsappHref = whatsapp.startsWith('http')
        ? whatsapp
        : `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
    return (
        <div className="about-page">
            <PageHeading
                eyebrow={text('about.eyebrow', 'MUITO MAIS QUE UM RESGATE')}
                title={text('about.title', 'Acreditamos em novos começos.')}
                description={text(
                    'about.description',
                    'Somos uma rede de cuidado que conecta animais, pessoas e a chance de uma vida melhor.',
                )}
            />
            <section className="container about-story">
                <div className="about-photo">
                    <img
                        src={publicAsset(text('about.image', '/images/community.jpg'))}
                        alt={text(
                            'about.imageAlt',
                            'Gato recebendo carinho, fotografia ilustrativa',
                        )}
                    />
                    <span>
                        <PawPrint size={17} /> {text('about.photoCaption', 'Cada vida importa.')}
                    </span>
                </div>
                <div>
                    <span className="eyebrow">{text('about.storyEyebrow', 'ESSA É A ADOCAT')}</span>
                    <h2>{text('about.storyTitle', 'Onde há cuidado, há uma nova chance.')}</h2>
                    <p>
                        {text(
                            'about.story',
                            'A AdoCat atua na proteção, no resgate e na adoção responsável de animais em Araraquara e Matão, no interior de São Paulo.',
                        )}
                    </p>
                    <p>
                        {text(
                            'about.storyCare',
                            'Nosso cuidado começa antes da adoção: acolhimento temporário, acompanhamento veterinário e a busca por famílias que estejam prontas para um compromisso para a vida. O foco são os felinos, mas nosso carinho também alcança cães.',
                        )}
                    </p>
                    <p>
                        {text(
                            'about.storyCommunity',
                            'Esse trabalho ganha força com a comunidade. Voluntários, lares temporários, doadores e adotantes fazem parte de cada recomeço.',
                        )}
                    </p>
                    {whatsapp && (
                        <SiteLink href={whatsappHref} newTab className="text-link">
                            {text('about.contactLabel', 'Converse com a gente')}{' '}
                            <ArrowUpRight size={17} />
                        </SiteLink>
                    )}
                </div>
            </section>
            <section className="container about-values">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">
                            {text('about.valuesEyebrow', 'O QUE MOVE A GENTE')}
                        </span>
                        <h2>{text('about.valuesTitle', 'Cuidar em cada etapa.')}</h2>
                    </div>
                </div>
                <div className="about-value-grid">
                    <article>
                        <Heart size={29} />
                        <h3>{text('about.valueOneTitle', 'Resgatar e acolher')}</h3>
                        <p>
                            {text(
                                'about.valueOneText',
                                'Uma rede de apoio para animais em situação de vulnerabilidade, com atenção ao que cada um precisa.',
                            )}
                        </p>
                    </article>
                    <article>
                        <ShieldCheck size={29} />
                        <h3>{text('about.valueTwoTitle', 'Recuperar e proteger')}</h3>
                        <p>
                            {text(
                                'about.valueTwoText',
                                'Acompanhamento veterinário, cuidados preventivos e suporte durante a recuperação.',
                            )}
                        </p>
                    </article>
                    <article>
                        <House size={29} />
                        <h3>{text('about.valueThreeTitle', 'Encontrar um lar')}</h3>
                        <p>
                            {text(
                                'about.valueThreeText',
                                'Adoção responsável, com triagem e orientação para construir vínculos que durem.',
                            )}
                        </p>
                    </article>
                </div>
            </section>
            <section className="local-section">
                <div className="container local-inner">
                    <div>
                        <span className="eyebrow">
                            {text('about.localEyebrow', 'DE PERTINHO, COM CARINHO')}
                        </span>
                        <h2>
                            {text('about.localTitle', 'Uma rede que começa na nossa comunidade.')}
                        </h2>
                        <p>
                            {text(
                                'about.localDescription',
                                'Atuamos em Araraquara e Matão. Para adoções, entregas de doações ou informações sobre ações da ONG, combine os detalhes diretamente com a equipe.',
                            )}
                        </p>
                        <SiteLink
                            href={text('about.localCtaHref', '/voluntariado')}
                            className="button button-primary"
                        >
                            {text('about.localCtaLabel', 'Faça parte dessa rede')}{' '}
                            <ArrowRight size={17} />
                        </SiteLink>
                    </div>
                    <div className="local-cities">
                        <img
                            className="about-original-logo"
                            src={publicAsset(text('about.localLogo', '/images/adocat-logo.png'))}
                            width="122"
                            height="110"
                            alt={text('about.localLogoAlt', 'Ado Cat')}
                            loading="lazy"
                        />
                        <div>
                            <MapPin size={23} />
                            <h3>{text('about.cityOne', 'Araraquara')}</h3>
                            <span>{text('about.stateOne', 'São Paulo')}</span>
                        </div>
                        <div>
                            <MapPin size={23} />
                            <h3>{text('about.cityTwo', 'Matão')}</h3>
                            <span>{text('about.stateTwo', 'São Paulo')}</span>
                        </div>
                        <p>
                            {text('about.localNote', 'Duas cidades. O mesmo amor pelos animais.')}
                        </p>
                    </div>
                </div>
            </section>
            <JoinBanner />
        </div>
    );
}
