import { describe, expect, it } from 'vitest';
import { crc16, createPixPayload } from './pix';

describe('BR Code PIX', () => {
    it('usa o vetor de referência CRC-16/CCITT-FALSE', () => {
        expect(crc16('123456789')).toBe('29B1');
    });

    it('gera TLV válido, valor exato e CRC para os dados configurados', () => {
        const code = createPixPayload({
            key: 'teste@example.org',
            recipient: 'Associação AdoCat',
            city: 'Matão',
            amount: 30.5,
        });
        const fields: Record<string, string> = {};
        let offset = 0;
        while (offset < code.length) {
            const id = code.slice(offset, offset + 2);
            const size = Number(code.slice(offset + 2, offset + 4));
            fields[id] = code.slice(offset + 4, offset + 4 + size);
            offset += 4 + size;
        }
        expect(fields['26']).toContain('br.gov.bcb.pix');
        expect(fields['26']).toContain('teste@example.org');
        expect(fields['54']).toBe('30.50');
        expect(fields['59']).toBe('ASSOCIACAO ADOCAT');
        expect(fields['60']).toBe('MATAO');
        expect(fields['63']).toBe(crc16(code.slice(0, -4)));
        expect(offset).toBe(code.length);
    });

    it.each([0, -1, NaN, Infinity, 100001])('recusa um valor inválido: %s', (amount) => {
        expect(() =>
            createPixPayload({
                key: 'teste@example.org',
                recipient: 'AdoCat',
                city: 'Matao',
                amount,
            }),
        ).toThrow();
    });

    it('não inventa destinatário quando os dados estão ausentes', () => {
        expect(() => createPixPayload({ key: '', recipient: '', city: '', amount: 30 })).toThrow();
    });
});
