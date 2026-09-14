function field(id: string, value: string) {
    const length = new TextEncoder().encode(value).length;
    if (length > 99) throw new Error('Um dos dados do PIX excede o limite permitido.');
    return `${id}${String(length).padStart(2, '0')}${value}`;
}

export function crc16(value: string) {
    let crc = 0xffff;
    for (const byte of new TextEncoder().encode(value)) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalize(value: string, max: number) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 .-]/g, '')
        .toUpperCase()
        .slice(0, max)
        .trim();
}

export function createPixPayload({
    key,
    recipient,
    city,
    amount,
}: {
    key: string;
    recipient: string;
    city: string;
    amount: number;
}) {
    if (
        !key.trim() ||
        !recipient.trim() ||
        !city.trim() ||
        !Number.isFinite(amount) ||
        amount < 1 ||
        amount > 100000
    ) {
        throw new Error('Confira os dados do favorecido e o valor da contribuição.');
    }
    const name = normalize(recipient, 25);
    const location = normalize(city, 15);
    if (!name || !location) throw new Error('Nome e cidade do favorecido inválidos.');
    const payload =
        field('00', '01') +
        field('26', field('00', 'br.gov.bcb.pix') + field('01', key.trim())) +
        field('52', '0000') +
        field('53', '986') +
        field('54', amount.toFixed(2)) +
        field('58', 'BR') +
        field('59', name) +
        field('60', location) +
        field('62', field('05', '***')) +
        '6304';
    return payload + crc16(payload);
}
