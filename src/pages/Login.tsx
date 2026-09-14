import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, PawPrint } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isDemoMode } from '../lib/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        api.getSession()
            .then((session) => {
                if (active && session.authenticated) navigate('/admin', { replace: true });
            })
            .catch(() => {})
            .finally(() => active && setChecking(false));
        return () => {
            active = false;
        };
    }, [navigate]);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await api.login(email, password);
            navigate('/admin', { replace: true });
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : isDemoMode
                      ? 'Credenciais inválidas. Use o acesso de demonstração indicado abaixo.'
                      : 'E-mail ou senha incorretos.',
            );
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="login-page">
            <section className="login-brand">
                <Link to="/" className="login-logo">
                    <PawPrint /> AdoCat
                </Link>
                <div>
                    <span className="eyebrow">Gestão que cuida</span>
                    <h1>Organização para acolher cada vez melhor.</h1>
                    <p>Animais, triagens, voluntários e campanhas em um só lugar.</p>
                </div>
            </section>
            <section className="login-panel">
                <div className="login-box">
                    <div className="login-icon">
                        <LockKeyhole />
                    </div>
                    <span className="eyebrow">Área restrita</span>
                    <h2>Bem-vindo de volta</h2>
                    <p>Entre com sua conta da equipe AdoCat.</p>
                    {checking ? (
                        <p>Verificando acesso…</p>
                    ) : (
                        <form onSubmit={submit} className="adocat-form">
                            <label className="field" htmlFor="login-email">
                                <span>E-mail</span>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="equipe@adocat.org"
                                />
                            </label>
                            <label className="field" htmlFor="login-password">
                                <span>Senha</span>
                                <div className="password-input">
                                    <input
                                        id="login-password"
                                        type={show ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow(!show)}
                                        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {show ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                            </label>
                            {error && (
                                <p className="form-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <button className="button button-primary submit-button" disabled={busy}>
                                {busy ? 'Entrando…' : 'Entrar no painel'}
                            </button>
                        </form>
                    )}
                    {isDemoMode && (
                        <div className="demo-access">
                            <strong>Acesso de demonstração</strong>
                            <span>demo@adocat.org</span>
                            <span>Senha: adocat-demo</span>
                        </div>
                    )}
                    <Link to="/" className="back-link">
                        ← Voltar ao site
                    </Link>
                </div>
            </section>
        </div>
    );
}
