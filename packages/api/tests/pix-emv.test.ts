import { describe, it, expect } from 'vitest';
import { crc16CcittFalse, buildStaticPixCode } from '../src/modules/payments/pix-emv';

describe('crc16CcittFalse', () => {
  // Vetor de teste publicado pra CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF,
  // sem reflexão, sem XOR final): CRC("123456789") = 0x29B1.
  it('matches the published CRC-16/CCITT-FALSE check value', () => {
    expect(crc16CcittFalse('123456789')).toBe('29B1');
  });

  it('is deterministic for the same input', () => {
    expect(crc16CcittFalse('qualquer coisa')).toBe(crc16CcittFalse('qualquer coisa'));
  });
});

describe('buildStaticPixCode', () => {
  const baseInput = {
    pixKey: '11144477735',
    merchantName: 'LOJAPIX DEMO',
    merchantCity: 'SAO PAULO',
    amountCents: 2590,
  };

  it('produces a payload whose trailing CRC matches a recomputation over the rest', () => {
    const code = buildStaticPixCode(baseInput);
    const crcFromCode = code.slice(-4);
    const recomputed = crc16CcittFalse(code.slice(0, -4));
    expect(crcFromCode).toBe(recomputed);
  });

  it('embeds the Pix GUI and the fixed amount as a decimal string', () => {
    const code = buildStaticPixCode(baseInput);
    expect(code).toContain('br.gov.bcb.pix');
    expect(code).toContain('540525.90'); // tag 54, tamanho 05, valor "25.90"
  });

  it('embeds merchant name and city', () => {
    const code = buildStaticPixCode(baseInput);
    expect(code).toContain(baseInput.merchantName);
    expect(code).toContain(baseInput.merchantCity);
  });

  it('rejects a non-positive amount', () => {
    expect(() => buildStaticPixCode({ ...baseInput, amountCents: 0 })).toThrow();
  });
});
