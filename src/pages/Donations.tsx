import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    Copy,
    Heart,
    HeartHandshake,
    MessageCircle,
    Package,
    QrCode,
    ShieldCheck,
    X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api, isDemoMode } from '../lib/api';
import { publicAsset } from '../lib/assets';
import { currency, useAsync } from '../lib/hooks';
import { createPixPayload } from '../lib/pix';
import type { Campaign } from '../lib/types';
import { ErrorState, LoadingState, PageHeading } from '../components/Shared';

export default function Donations() {
    const campaigns = useAsync(api.getCampaigns);
    const config = useAsync(api.getConfig);
    const [params] = useSearchParams();
    const [selected, setSelected] = useState<Campaign | 'general' | null>(null);
    const [amount, setAmount] = useState(30);
    const [qrCode, setQrCode] = useState('');
    const [pix, setPix] = useState('');
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);
    useEffect(() => {
        if (campaigns.data && params.get('campanha')) {
            const requested = campaigns.data.find(
                (campaign) => campaign.id === params.get('campanha'),
            );
            if (requested && requested.status === 'active') setSelected(requested);
        }
    }, [campaigns.data, params]);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (selected && dialog) {
            previousFocus.current = document.activeElement as HTMLElement;
            dialog.showModal();
            const previous = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                dialog.close();
                document.body.style.overflow = previous;
                previousFocus.current?.focus();
            };
        }
    }, [selected]);
    useEffect(() => {
        setMessage('');
        setPix('');
        setQrCode('');
        let active = true;
        if (selected && config.data?.pixConfigured) {
            try {
                const value = createPixPayload({
                    key: config.data.pixKey || '',
                    recipient: config.data.donationRecipient || '',
                    city: config.data.donationCity || '',
                    amount,
                });
                setPix(value);
                QRCode.toDataURL(value, {
                    width: 240,
                    margin: 2,
                    color: { dark: '#173b50', light: '#ffffff' },
                })
                    .then((image) => {
                        if (active) setQrCode(image);
                    })
                    .catch(() => {
                        if (active)
                            setMessage(
                                'Não foi possível gerar o QR Code. Use o código copia e cola.',
                            );
                    });
            } catch (cause) {
                setMessage(cause instanceof Error ? cause.message : 'Confira o valor informado.');
            }
        }
        return () => {
            active = false;
        };
    }, [amount, selected, config.data]);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(pix);
            setMessage('Código PIX copiado. Confira o favorecido no aplicativo do banco.');
        } catch {
            setMessage(
                'Não conseguimos copiar automaticamente. Selecione e copie o código abaixo.',
            );
        }
    };
    const campaignName =
        selected && selected !== 'general' ? selected.title : 'os cuidados da AdoCat';
    const whatsApp = `https://wa.me/5516997587596?text=${encodeURIComponent(`Olá, AdoCat! Gostaria de contribuir com ${campaignName}. Podem me informar como ajudar?`)}`;

    return (
        <div className="donations-page">
            <PageHeading
                eyebrow="AMOR QUE SE TRANSFORMA EM CUIDADO"
                title="Toda ajuda conta uma nova história."
                description="Sua contribuição pode virar uma refeição, uma consulta ou a chance de um novo começo. Escolha como fazer parte."
            />
            <section className="container donation-intro">
                <div>
                    <div className="donation-icon">
                        <HeartHandshake size={34} />
                    </div>
                    <h2>
                        Um pouco de você.
                        <br />
                        Um mundo de diferença.
                    </h2>
                    <p>
                        Ajude a manter os cuidados de quem ainda espera por um lar. Você escolhe o
                        valor da sua contribuição.
                    </p>
                    <button
                        className="button button-primary"
                        onClick={() => setSelected('general')}
                    >
                        <Heart size={17} /> Quero contribuir <ArrowUpRight size={17} />
                    </button>
                </div>
                <div className="donation-purpose">
                    <article>
                        <span>
                            <Package size={22} />
                        </span>
                        <div>
                            <h3>Barriguinhas cheias</h3>
                            <p>Alimentação e itens de higiene para o dia a dia.</p>
                        </div>
                    </article>
                    <article>
                        <span>
                            <ShieldCheck size={22} />
                        </span>
                        <div>
                            <h3>Saúde em primeiro lugar</h3>
                            <p>Consultas, vacinas, castrações e tratamentos.</p>
                        </div>
                    </article>
                    <article>
                        <span>
                            <Heart size={22} />
                        </span>
                        <div>
                            <h3>Recomeços possíveis</h3>
                            <p>Acolhimento seguro até o encontro com uma família.</p>
                        </div>
                    </article>
                </div>
            </section>
            <section className="container campaigns-section">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">JUNTOS, A GENTE CONSEGUE</span>
                        <h2>Campanhas que precisam de você.</h2>
                    </div>
                    {isDemoMode && <span className="mode-pill">Valores de demonstração</span>}
                </div>
                {campaigns.loading ? (
                    <LoadingState />
                ) : campaigns.error ? (
                    <ErrorState message={campaigns.error} retry={campaigns.retry} />
                ) : (
                    <div className="campaign-grid">
                        {campaigns.data?.map((campaign) => (
                            <article className="campaign-card" key={campaign.id}>
                                <div className="campaign-photo">
                                    <img
                                        src={publicAsset(campaign.image)}
                                        alt={`Imagem ilustrativa: ${campaign.title}`}
                                        loading="lazy"
                                    />
                                    <span className={`campaign-state ${campaign.status}`}>
                                        {campaign.status === 'completed' ? (
                                            <>
                                                <Check size={14} /> Meta alcançada
                                            </>
                                        ) : (
                                            <>
                                                <Heart size={13} /> Vamos juntos
                                            </>
                                        )}
                                    </span>
                                </div>
                                <div className="campaign-body">
                                    <span className="eyebrow">{campaign.category}</span>
                                    <h3>{campaign.title}</h3>
                                    <p>{campaign.description}</p>
                                    <div
                                        className="progress-track"
                                        role="progressbar"
                                        aria-valuenow={Math.round(
                                            Math.min(
                                                100,
                                                (campaign.raised / campaign.target) * 100,
                                            ),
                                        )}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`Arrecadação de ${campaign.title}`}
                                    >
                                        <span
                                            style={{
                                                width: `${Math.min(100, (campaign.raised / campaign.target) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="campaign-amounts">
                                        <strong>{currency(campaign.raised)}</strong>
                                        <span>de {currency(campaign.target)}</span>
                                    </div>
                                    {campaign.status === 'active' ? (
                                        <button
                                            className="button button-secondary"
                                            onClick={() => setSelected(campaign)}
                                        >
                                            Ajudar essa história <ArrowUpRight size={17} />
                                        </button>
                                    ) : (
                                        <p className="completed-message">
                                            <Check size={16} /> Um passo a mais, graças a cada
                                            gesto.
                                        </p>
                                    )}
                                    {campaign.externalUrl &&
                                        /^https:\/\//.test(campaign.externalUrl) && (
                                            <a
                                                className="text-link campaign-external"
                                                href={campaign.externalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Ver campanha oficial <ArrowUpRight size={14} />
                                            </a>
                                        )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
                {isDemoMode && (
                    <p className="demo-caption">
                        Campanhas, valores e fotografias ilustram o funcionamento da plataforma.
                        Nenhuma doação é processada nesta demonstração.
                    </p>
                )}
            </section>
            <section className="container transparency-note">
                <ShieldCheck size={31} />
                <div>
                    <h2>Cuidado também é transparência.</h2>
                    <p>
                        Os valores são atualizados pela equipe da ONG após a confirmação das
                        contribuições. Para comprovantes, prestação de contas ou doação de
                        materiais, converse com a AdoCat.
                    </p>
                    <a
                        className="text-link"
                        href="https://wa.me/5516997587596"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Falar com a equipe <ArrowUpRight size={16} />
                    </a>
                </div>
            </section>
            <section className="container donation-other">
                <h2>Seu tempo também transforma.</h2>
                <p>
                    Uma carona solidária, um lar temporário ou uma mão nas feiras. Tem um lugar para
                    você nessa rede.
                </p>
                <Link to="/voluntariado" className="button button-dark">
                    Conheça o voluntariado <ArrowRight size={17} />
                </Link>
            </section>
            <dialog
                ref={dialogRef}
                className="donation-dialog"
                aria-labelledby="donation-dialog-title"
                onCancel={() => setSelected(null)}
                onClick={(event) => {
                    if (event.target === event.currentTarget) setSelected(null);
                }}
            >
                <button
                    className="dialog-close icon-button"
                    aria-label="Fechar doação"
                    onClick={() => setSelected(null)}
                >
                    <X size={21} />
                </button>
                <span className="dialog-heart">
                    <Heart size={26} />
                </span>
                <span className="eyebrow">UM GESTO DE CARINHO</span>
                <h2 id="donation-dialog-title">Quanto amor cabe num gesto?</h2>
                <p>Você está ajudando {campaignName}.</p>
                <div className="amount-options">
                    {[15, 30, 50, 100].map((value) => (
                        <button
                            className={amount === value ? 'active' : ''}
                            key={value}
                            onClick={() => setAmount(value)}
                            aria-pressed={amount === value}
                        >
                            {currency(value)}
                        </button>
                    ))}
                </div>
                <label className="field donation-custom">
                    <span>Outro valor (R$)</span>
                    <input
                        type="number"
                        min="1"
                        max="100000"
                        step="0.01"
                        value={amount || ''}
                        onChange={(event) => setAmount(Number(event.target.value))}
                    />
                </label>
                {config.loading ? (
                    <LoadingState label="Consultando opções de contribuição…" />
                ) : config.error ? (
                    <ErrorState message={config.error} retry={config.retry} />
                ) : config.data?.pixConfigured ? (
                    <div className="pix-ready">
                        <h3>
                            <QrCode size={19} /> Doar com PIX
                        </h3>
                        {qrCode && (
                            <img
                                src={qrCode}
                                width="240"
                                height="240"
                                alt="QR Code PIX para a contribuição selecionada"
                            />
                        )}
                        <p>
                            Favorecido: <strong>{config.data.donationRecipient}</strong>
                        </p>
                        <label className="field">
                            <span>PIX copia e cola</span>
                            <textarea readOnly value={pix} rows={3} />
                        </label>
                        <button disabled={!pix} onClick={copy} className="button button-primary">
                            <Copy size={16} /> Copiar código PIX
                        </button>
                        <small>
                            Confira o nome e o valor no seu banco antes de confirmar. O pagamento
                            será conferido pela equipe.
                        </small>
                    </div>
                ) : (
                    <div className="pix-pending">
                        <MessageCircle size={24} />
                        <h3>Vamos combinar sua contribuição?</h3>
                        <p>
                            {isDemoMode
                                ? 'Esta é uma demonstração. Para doar de verdade, confirme os dados de pagamento diretamente com a AdoCat.'
                                : 'Para contribuir, fale com a equipe e confirme os dados de pagamento da AdoCat.'}
                        </p>
                        <a
                            className="button button-primary"
                            href={whatsApp}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Falar com a AdoCat <ArrowUpRight size={16} />
                        </a>
                    </div>
                )}
                {message && (
                    <p className="copy-message" role="status">
                        {message}
                    </p>
                )}
            </dialog>
        </div>
    );
}
