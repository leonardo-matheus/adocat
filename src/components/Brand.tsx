import { Link } from 'react-router-dom';
import { publicAsset } from '../lib/assets';

export default function Brand({ inverse = false }: { inverse?: boolean }) {
    return (
        <Link
            to="/"
            className={`brand${inverse ? ' brand-inverse' : ''}`}
            aria-label="AdoCat, página inicial"
        >
            <img src={publicAsset('/icons/cat-mark.svg')} width="44" height="44" alt="" />
            <span>
                AdoCat<span className="brand-dot">.</span>
            </span>
        </Link>
    );
}
