import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Heart, Mail, MapPin, Menu, PawPrint, X } from 'lucide-react';
import Brand from './Brand';
import { isDemoMode } from '../lib/api';
import { SiteLink, useSiteContent } from '../lib/site-content';
import { defaultNavigation } from '../data/contentFields';

export default function Layout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { content, text } = useSiteContent();
    const navigation = content.navigation || defaultNavigation;
    const email = content.integrations.email;
    const whatsapp = content.integrations.whatsapp;
    const whatsappHref = whatsapp.startsWith('http')
        ? whatsapp
        : `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
    useEffect(() => {
        setMenuOpen(false);
        if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
        else
            window.setTimeout(
                () =>
                    document
                        .getElementById(location.hash.slice(1))
                        ?.scrollIntoView({ behavior: 'smooth' }),
                100,
            );
        const names: Record<string, string> = {
            '/': 'Todo amor merece um lar',
            '/adotar': 'Encontre seu novo amigo',
            '/doar': 'Ajude a transformar vidas',
            '/sobre': 'Nossa história',
            '/voluntariado': 'Faça parte',
            '/conteudos': 'Cuidado que se aprende',
            '/privacidade': 'Privacidade',
            '/admin': 'Painel de gestão',
            '/admin/entrar': 'Acesso da equipe',
        };
        document.title = `AdoCat — ${names[location.pathname] || (location.pathname.startsWith('/amigos/') ? 'Conheça seu novo amigo' : 'Cada vida importa')}`;
    }, [location.pathname, location.hash]);
    useEffect(() => {
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, []);

    return (
        <>
            <a
                href="#main-content"
                className="skip-link"
                onClick={(event) => {
                    event.preventDefault();
                    const main = document.getElementById('main-content');
                    main?.focus({ preventScroll: true });
                    main?.scrollIntoView({ behavior: 'smooth' });
                }}
            >
                Pular para o conteúdo
            </a>
            <div className="utility-bar">
                <div className="container utility-inner">
                    <span>
                        <MapPin size={13} /> {text('site.location', 'Araraquara e Matão, SP')}
                    </span>
                    <span>
                        {text('site.utilityMessage', 'Pequenas patas. Grandes recomeços.')}{' '}
                        <Heart size={12} />
                    </span>
                </div>
            </div>
            <header className="site-header">
                <div className="container header-inner">
                    <Brand />
                    <nav
                        aria-label="Navegação principal"
                        id="main-navigation"
                        className={`main-nav${menuOpen ? ' is-open' : ''}`}
                    >
                        {navigation
                            .filter((item) => item.visible)
                            .map((item) => (
                                <SiteLink
                                    key={item.id}
                                    href={item.href}
                                    newTab={item.newTab}
                                    className={
                                        item.href === location.pathname ||
                                        (item.href !== '/' &&
                                            location.pathname.startsWith(item.href))
                                            ? 'active'
                                            : undefined
                                    }
                                >
                                    {item.label}
                                </SiteLink>
                            ))}
                    </nav>
                    <SiteLink
                        href={text('site.donateHref', '/doar')}
                        className="button button-primary header-donate"
                    >
                        <Heart size={16} /> {text('site.donateLabel', 'Quero ajudar')}
                    </SiteLink>
                    <button
                        className="menu-toggle icon-button"
                        aria-expanded={menuOpen}
                        aria-controls="main-navigation"
                        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </header>
            <main id="main-content" tabIndex={-1}>
                <Outlet />
            </main>
            <footer className="site-footer">
                <div className="container footer-top">
                    <div className="footer-brand-block">
                        <Brand inverse />
                        <p>
                            {text(
                                'footer.tagline',
                                'Todo amor merece um lar.\nE todo recomeço merece uma chance.',
                            )
                                .split('\n')
                                .map((line, index) => (
                                    <span key={line}>
                                        {index > 0 && <br />}
                                        {line}
                                    </span>
                                ))}
                        </p>
                        <span className="footer-location">
                            <MapPin size={15} /> {text('site.location', 'Araraquara e Matão, SP')}
                        </span>
                    </div>
                    <div className="footer-links">
                        <h3>{text('footer.linksTitle', 'Encontre seu caminho')}</h3>
                        {navigation
                            .filter((item) => item.visible && item.href !== '/')
                            .slice(0, 4)
                            .map((item) => (
                                <SiteLink key={item.id} href={item.href} newTab={item.newTab}>
                                    {item.label}
                                </SiteLink>
                            ))}
                    </div>
                    <div className="footer-links">
                        <h3>{text('footer.contactTitle', 'Vamos conversar?')}</h3>
                        {email && (
                            <a href={`mailto:${email}`}>
                                <Mail size={15} /> {email}
                            </a>
                        )}
                        {whatsapp && (
                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                                WhatsApp <ArrowUpRight size={14} />
                            </a>
                        )}
                        {content.integrations.instagram && (
                            <a
                                href={content.integrations.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Instagram <ArrowUpRight size={14} />
                            </a>
                        )}
                        {content.integrations.facebook && (
                            <a
                                href={content.integrations.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Facebook <ArrowUpRight size={14} />
                            </a>
                        )}
                        <SiteLink href={text('footer.tipsHref', '/conteudos')}>
                            {text('footer.tipsLabel', 'Dicas para cuidar com amor')}{' '}
                            <ArrowUpRight size={14} />
                        </SiteLink>
                    </div>
                </div>
                <div className="container footer-bottom">
                    <span>
                        © {new Date().getFullYear()}{' '}
                        {text('footer.copyright', 'AdoCat. Feito com cuidado')}{' '}
                        <PawPrint size={13} />
                    </span>
                    <div>
                        <SiteLink href={text('footer.privacyHref', '/privacidade')}>
                            {text('footer.privacyLabel', 'Privacidade')}
                        </SiteLink>
                        <SiteLink href={text('footer.teamHref', '/admin')}>
                            {text('footer.teamLabel', 'Área da equipe')} <ArrowUpRight size={13} />
                        </SiteLink>
                    </div>
                </div>
                {isDemoMode && (
                    <div className="demo-notice">
                        <span className="demo-dot" /> Versão de demonstração · Animais, fotos e
                        valores ilustrativos. Cadastros ficam somente neste navegador.
                    </div>
                )}
            </footer>
        </>
    );
}
