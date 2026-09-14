import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Heart, Mail, MapPin, Menu, PawPrint, X } from 'lucide-react';
import Brand from './Brand';
import { isDemoMode } from '../lib/api';

export default function Layout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
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
                        <MapPin size={13} /> Araraquara e Matão, SP
                    </span>
                    <span>
                        Pequenas patas. Grandes recomeços. <Heart size={12} />
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
                        <NavLink to="/" end>
                            Início
                        </NavLink>
                        <NavLink to="/adotar">Quero adotar</NavLink>
                        <NavLink to="/sobre">Sobre a AdoCat</NavLink>
                        <NavLink to="/voluntariado">Faça parte</NavLink>
                        <NavLink to="/conteudos">Dicas e cuidados</NavLink>
                    </nav>
                    <Link to="/doar" className="button button-primary header-donate">
                        <Heart size={16} /> Quero ajudar
                    </Link>
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
                            Todo amor merece um lar.
                            <br />E todo recomeço merece uma chance.
                        </p>
                        <span className="footer-location">
                            <MapPin size={15} /> Araraquara e Matão · SP
                        </span>
                    </div>
                    <div className="footer-links">
                        <h3>Encontre seu caminho</h3>
                        <Link to="/adotar">Quero adotar</Link>
                        <Link to="/doar">Faça uma doação</Link>
                        <Link to="/voluntariado">Seja voluntário</Link>
                        <Link to="/sobre">Conheça a AdoCat</Link>
                    </div>
                    <div className="footer-links">
                        <h3>Vamos conversar?</h3>
                        <a href="mailto:adocat.adocao@gmail.com">
                            <Mail size={15} /> adocat.adocao@gmail.com
                        </a>
                        <a
                            href="https://wa.me/5516997587596"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            WhatsApp: (16) 99758-7596 <ArrowUpRight size={14} />
                        </a>
                        <Link to="/conteudos">
                            Dicas para cuidar com amor <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="container footer-bottom">
                    <span>
                        © {new Date().getFullYear()} AdoCat. Feito com cuidado{' '}
                        <PawPrint size={13} />
                    </span>
                    <div>
                        <Link to="/privacidade">Privacidade</Link>
                        <Link to="/admin">
                            Área da equipe <ArrowUpRight size={13} />
                        </Link>
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
