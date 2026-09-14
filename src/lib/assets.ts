const publicAssetPrefixes = ['/images/', '/icons/', '/fonts/'];

export function publicAsset(source: string): string {
    if (!source || /^(?:https?:|data:|blob:)/i.test(source)) {
        return source;
    }

    const base = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;

    if (base !== '/' && source.startsWith(base)) {
        return source;
    }

    const prefix = publicAssetPrefixes.find((candidate) => source.startsWith(candidate));
    return prefix ? `${base}${source.slice(1)}` : source;
}
