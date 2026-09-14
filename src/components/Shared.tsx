import { ArrowRight, HeartHandshake, LoaderCircle, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LoadingState({ label = 'Preparando tudo para você…' }: { label?: string }) {
    return (
        <div className="state-box" role="status">
            <LoaderCircle className="spin" size={26} />
            <p>{label}</p>
        </div>
    );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
    return (
        <div className="state-box error-state" role="alert">
            <PawPrint size={30} />
            <h3>Não conseguimos carregar agora</h3>
            <p>{message}</p>
            {retry && (
                <button className="button button-secondary" onClick={retry}>
                    Tentar novamente
                </button>
            )}
        </div>
    );
}

export function JoinBanner() {
    return (
        <section className="join-section container">
            <div className="join-icon">
                <HeartHandshake size={42} strokeWidth={1.3} />
            </div>
            <div>
                <span className="eyebrow">TODO GESTO CONTA</span>
                <h2>Tem muitas formas de fazer parte.</h2>
                <p>
                    Uma carona, um lar temporário, um pouco do seu tempo. Juntos, vamos mais longe.
                </p>
            </div>
            <Link to="/voluntariado" className="button button-dark">
                Quero ser voluntário <ArrowRight size={17} />
            </Link>
        </section>
    );
}

export function PageHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="page-heading container">
            <span className="eyebrow">
                <PawPrint size={14} /> {eyebrow}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
        </div>
    );
}
