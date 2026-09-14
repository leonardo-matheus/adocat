import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Heart, ShieldCheck } from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { publicAsset } from '../lib/assets';
import type { Pet } from '../lib/types';

type FormState = {
    name: string;
    email: string;
    phone: string;
    city: string;
    homeType: 'house' | 'apartment';
    screened: boolean;
    otherPets: string;
    routine: string;
    consent: boolean;
};

const initialForm: FormState = {
    name: '',
    email: '',
    phone: '',
    city: '',
    homeType: 'house',
    screened: false,
    otherPets: '',
    routine: '',
    consent: false,
};

export default function Adoption() {
    const { petId = '' } = useParams();
    const [pet, setPet] = useState<Pet | null>(null);
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        let active = true;
        api.getPet(petId)
            .then((data) => active && setPet(data))
            .catch(() => active && setError('Não foi possível carregar este animal.'))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [petId]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((old) => ({ ...old, [key]: value }));
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        if (!form.consent) {
            setError('Confirme o consentimento para enviar sua inscrição.');
            return;
        }
        setSending(true);
        try {
            await api.submitAdoption({ ...form, petId });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Não foi possível enviar agora. Revise os dados e tente novamente.',
            );
        } finally {
            setSending(false);
        }
    };

    if (loading)
        return (
            <div className="adoption-page">
                <div className="container form-state">Carregando informações…</div>
            </div>
        );
    if (!pet)
        return (
            <div className="adoption-page">
                <div className="container form-state">
                    <h1>Animal não encontrado</h1>
                    <p>{error || 'Este perfil pode não estar mais disponível.'}</p>
                    <Link className="button button-primary" to="/adotar">
                        Ver animais
                    </Link>
                </div>
            </div>
        );
    if (success)
        return (
            <div className="adoption-page">
                <div className="container form-success">
                    <CheckCircle2 size={52} />
                    <span className="eyebrow">Inscrição recebida</span>
                    <h1>Obrigado por abrir seu lar para {pet.name}.</h1>
                    <p>
                        {isDemoMode
                            ? 'Cadastro salvo nesta demonstração. Nenhuma mensagem foi enviada à ONG.'
                            : 'A equipe da AdoCat recebeu seus dados e entrará em contato após a triagem.'}
                    </p>
                    <Link className="button button-primary" to="/adotar">
                        Conhecer outros animais
                    </Link>
                </div>
            </div>
        );

    if (pet.status !== 'available')
        return (
            <div className="adoption-page">
                <div className="container form-state">
                    <h1>{pet.name} não está disponível para adoção agora</h1>
                    <p>
                        {pet.status === 'treatment'
                            ? 'Este animal está em tratamento e ainda não pode receber inscrições.'
                            : 'Este animal já encontrou uma família.'}
                    </p>
                    <Link className="button button-primary" to="/adotar">
                        Ver animais disponíveis
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="adoption-page">
            <div className="container form-layout">
                <aside className="form-pet-card">
                    <Link to="/adotar" className="back-link">
                        <ArrowLeft size={17} /> Voltar para adoção
                    </Link>
                    <img src={publicAsset(pet.image)} alt={pet.name} />
                    <div>
                        <span className="eyebrow">Quero adotar</span>
                        <h1>{pet.name}</h1>
                        <p>
                            {pet.ageLabel} · {pet.city}
                        </p>
                    </div>
                    <div className="trust-note">
                        <ShieldCheck />
                        <p>
                            <strong>Adoção responsável</strong>
                            <br />A triagem ajuda a encontrar um lar seguro e compatível.
                        </p>
                    </div>
                </aside>
                <section className="form-panel">
                    <div className="form-heading">
                        <span className="eyebrow">Formulário de interesse</span>
                        <h2>Conte um pouco sobre você</h2>
                        <p>
                            Leva cerca de 4 minutos. A inscrição não garante a adoção e será
                            avaliada com carinho pela equipe.
                        </p>
                    </div>
                    <form onSubmit={submit} className="adocat-form">
                        <div className="form-section">
                            <h3>Seus dados</h3>
                            <div className="form-grid">
                                <label className="field field-wide" htmlFor="adoption-name">
                                    <span>Nome completo</span>
                                    <input
                                        id="adoption-name"
                                        required
                                        minLength={3}
                                        autoComplete="name"
                                        value={form.name}
                                        onChange={(e) => update('name', e.target.value)}
                                    />
                                </label>
                                <label className="field" htmlFor="adoption-email">
                                    <span>E-mail</span>
                                    <input
                                        id="adoption-email"
                                        required
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={(e) => update('email', e.target.value)}
                                    />
                                </label>
                                <label className="field" htmlFor="adoption-phone">
                                    <span>WhatsApp</span>
                                    <input
                                        id="adoption-phone"
                                        required
                                        type="tel"
                                        autoComplete="tel"
                                        inputMode="tel"
                                        value={form.phone}
                                        onChange={(e) => update('phone', e.target.value)}
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="adoption-city">
                                    <span>Cidade</span>
                                    <input
                                        id="adoption-city"
                                        required
                                        value={form.city}
                                        onChange={(e) => update('city', e.target.value)}
                                        placeholder="Araraquara, Matão ou região"
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="form-section">
                            <h3>O futuro lar</h3>
                            <div className="form-grid">
                                <label className="field" htmlFor="adoption-home">
                                    <span>Tipo de moradia</span>
                                    <select
                                        id="adoption-home"
                                        value={form.homeType}
                                        onChange={(e) =>
                                            update(
                                                'homeType',
                                                e.target.value as FormState['homeType'],
                                            )
                                        }
                                    >
                                        <option value="house">Casa</option>
                                        <option value="apartment">Apartamento</option>
                                    </select>
                                </label>
                                <label className="check-field" htmlFor="adoption-screened">
                                    <input
                                        id="adoption-screened"
                                        type="checkbox"
                                        checked={form.screened}
                                        onChange={(e) => update('screened', e.target.checked)}
                                    />
                                    <span>
                                        Janelas, sacadas e áreas de risco são teladas ou protegidas.
                                    </span>
                                </label>
                                <label className="field field-wide" htmlFor="adoption-pets">
                                    <span>Há outros animais em casa?</span>
                                    <textarea
                                        id="adoption-pets"
                                        required
                                        rows={3}
                                        value={form.otherPets}
                                        onChange={(e) => update('otherPets', e.target.value)}
                                        placeholder="Conte quantos são e como convivem."
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="adoption-routine">
                                    <span>Como é sua rotina?</span>
                                    <textarea
                                        id="adoption-routine"
                                        required
                                        minLength={10}
                                        rows={4}
                                        value={form.routine}
                                        onChange={(e) => update('routine', e.target.value)}
                                        placeholder="Quem mora com você, tempo fora de casa e como será o cuidado diário."
                                    />
                                </label>
                            </div>
                        </div>
                        <label className="check-field consent" htmlFor="adoption-consent">
                            <input
                                id="adoption-consent"
                                required
                                type="checkbox"
                                checked={form.consent}
                                onChange={(e) => update('consent', e.target.checked)}
                            />
                            <span>
                                Autorizo o uso destes dados para a triagem de adoção, conforme a{' '}
                                <Link to="/privacidade">Política de Privacidade</Link>.
                            </span>
                        </label>
                        {error && (
                            <p className="form-error" role="alert">
                                {error}
                            </p>
                        )}
                        <button className="button button-primary submit-button" disabled={sending}>
                            {sending ? (
                                'Enviando…'
                            ) : (
                                <>
                                    Enviar interesse <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </section>
            </div>
            <div className="form-heart" aria-hidden="true">
                <Heart />
            </div>
        </div>
    );
}
