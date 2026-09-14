import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, HeartHandshake, PawPrint, Truck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, isDemoMode } from '../lib/api';

const interestOptions = [
    { value: 'temporary-home', label: 'Lar temporário', icon: PawPrint },
    { value: 'transport', label: 'Carona solidária', icon: Truck },
    { value: 'events', label: 'Feiras e eventos', icon: Users },
    { value: 'online', label: 'Apoio à distância', icon: HeartHandshake },
];

export default function Volunteer() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        interests: [] as string[],
        availability: '',
        message: '',
        consent: false,
    });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const toggleInterest = (value: string) =>
        setForm((old) => ({
            ...old,
            interests: old.interests.includes(value)
                ? old.interests.filter((item) => item !== value)
                : [...old.interests, value],
        }));
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (!form.interests.length) {
            setError('Escolha ao menos uma forma de ajudar.');
            return;
        }
        setSending(true);
        try {
            await api.submitVolunteer(form);
            setSuccess(true);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Não foi possível enviar agora. Tente novamente em instantes.',
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="volunteer-page">
            <section className="volunteer-hero">
                <div className="container">
                    <span className="eyebrow">Faça parte da rede</span>
                    <h1>
                        Seu tempo também
                        <br />
                        transforma vidas.
                    </h1>
                    <p>
                        Há muitas maneiras de ajudar a AdoCat em Araraquara, Matão e região.
                        Encontre a que cabe na sua rotina.
                    </p>
                </div>
            </section>
            <div className="container volunteer-shell">
                {success ? (
                    <section className="form-success">
                        <CheckCircle2 size={52} />
                        <span className="eyebrow">Cadastro recebido</span>
                        <h2>Que bom ter você por perto.</h2>
                        <p>
                            {isDemoMode
                                ? 'Cadastro salvo nesta demonstração. Nenhuma mensagem foi enviada à ONG.'
                                : 'A equipe vai conhecer seu perfil e entrar em contato quando houver uma oportunidade compatível.'}
                        </p>
                        <Link to="/" className="button button-primary">
                            Voltar ao início
                        </Link>
                    </section>
                ) : (
                    <section className="form-panel volunteer-form-panel">
                        <div className="form-heading">
                            <span className="eyebrow">Cadastro voluntário</span>
                            <h2>Como você gostaria de ajudar?</h2>
                            <p>Você pode selecionar mais de uma opção.</p>
                        </div>
                        <form className="adocat-form" onSubmit={submit}>
                            <div className="interest-grid">
                                {interestOptions.map(({ value, label, icon: Icon }) => (
                                    <label
                                        key={value}
                                        htmlFor={`interest-${value}`}
                                        className={`interest-card ${form.interests.includes(value) ? 'selected' : ''}`}
                                    >
                                        <input
                                            id={`interest-${value}`}
                                            type="checkbox"
                                            checked={form.interests.includes(value)}
                                            onChange={() => toggleInterest(value)}
                                        />
                                        <Icon />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="form-section">
                                <h3>Sobre você</h3>
                                <div className="form-grid">
                                    <label className="field field-wide" htmlFor="volunteer-name">
                                        <span>Nome completo</span>
                                        <input
                                            id="volunteer-name"
                                            required
                                            minLength={3}
                                            autoComplete="name"
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm({ ...form, name: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label className="field" htmlFor="volunteer-email">
                                        <span>E-mail</span>
                                        <input
                                            id="volunteer-email"
                                            required
                                            type="email"
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                setForm({ ...form, email: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label className="field" htmlFor="volunteer-phone">
                                        <span>WhatsApp</span>
                                        <input
                                            id="volunteer-phone"
                                            required
                                            type="tel"
                                            autoComplete="tel"
                                            inputMode="tel"
                                            value={form.phone}
                                            onChange={(e) =>
                                                setForm({ ...form, phone: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label className="field field-wide" htmlFor="volunteer-city">
                                        <span>Cidade</span>
                                        <input
                                            id="volunteer-city"
                                            required
                                            value={form.city}
                                            onChange={(e) =>
                                                setForm({ ...form, city: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label
                                        className="field field-wide"
                                        htmlFor="volunteer-availability"
                                    >
                                        <span>Disponibilidade</span>
                                        <input
                                            id="volunteer-availability"
                                            required
                                            value={form.availability}
                                            onChange={(e) =>
                                                setForm({ ...form, availability: e.target.value })
                                            }
                                            placeholder="Ex.: sábados à tarde ou 4 horas por mês"
                                        />
                                    </label>
                                    <label className="field field-wide" htmlFor="volunteer-message">
                                        <span>Quer contar mais alguma coisa?</span>
                                        <textarea
                                            id="volunteer-message"
                                            rows={4}
                                            value={form.message}
                                            onChange={(e) =>
                                                setForm({ ...form, message: e.target.value })
                                            }
                                        />
                                    </label>
                                </div>
                            </div>
                            <label className="check-field consent" htmlFor="volunteer-consent">
                                <input
                                    id="volunteer-consent"
                                    required
                                    type="checkbox"
                                    checked={form.consent}
                                    onChange={(e) =>
                                        setForm({ ...form, consent: e.target.checked })
                                    }
                                />
                                <span>
                                    Autorizo o contato e o uso destes dados conforme a{' '}
                                    <Link to="/privacidade">Política de Privacidade</Link>.
                                </span>
                            </label>
                            {error && (
                                <p className="form-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <button
                                className="button button-primary submit-button"
                                disabled={sending}
                            >
                                {sending ? 'Enviando…' : 'Quero ser voluntário'}
                            </button>
                        </form>
                    </section>
                )}
            </div>
        </div>
    );
}
