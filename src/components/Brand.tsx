import { publicAsset } from '../lib/assets';
import { SiteLink, useSiteContent } from '../lib/site-content';

export default function Brand({ inverse = false }: { inverse?: boolean }) {
    const { text } = useSiteContent();
    return (
        <SiteLink
            href="/"
            className={`brand${inverse ? ' brand-inverse' : ''}`}
            aria-label={`${text('brand.name', 'AdoCat')}, página inicial`}
        >
            <img
                src={publicAsset(text('brand.logo', '/icons/cat-mark.svg'))}
                width="44"
                height="44"
                alt={text('brand.logoAlt', '')}
            />
            <span>
                {text('brand.name', 'AdoCat')}
                <span className="brand-dot">.</span>
            </span>
        </SiteLink>
    );
}
