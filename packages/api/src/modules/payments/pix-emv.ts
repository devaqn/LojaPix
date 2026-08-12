const GUI_PIX = 'br.gov.bcb.pix';

/**
 * CRC-16/CCITT-FALSE — poly 0x1021, init 0xFFFF, sem reflexão, sem XOR final.
 * É a variante exigida pelo BR Code (EMV) do Pix.
 */
export function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

export interface BuildPixCodeInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid?: string;
}

/**
 * Monta um "Pix copia-e-cola" (BR Code / EMV) com valor fixo, offline — sem
 * depender de nenhum banco ou gateway de pagamento. É um Pix estático de verdade,
 * escaneável por qualquer banco, só não tem confirmação automática de recebimento
 * (por isso o modo "stub" exige confirmar manualmente no painel).
 */
export function buildStaticPixCode(input: BuildPixCodeInput): string {
  if (input.amountCents <= 0) {
    throw new Error('amountCents deve ser positivo');
  }

  const amount = (input.amountCents / 100).toFixed(2);
  const txid = (input.txid ?? '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  const merchantAccountInfo = tlv('00', GUI_PIX) + tlv('01', input.pixKey);
  const additionalData = tlv('05', txid);

  const payload =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', amount) +
    tlv('58', 'BR') +
    tlv('59', input.merchantName.slice(0, 25)) +
    tlv('60', input.merchantCity.slice(0, 15)) +
    tlv('62', additionalData);

  const payloadWithCrcTag = `${payload}6304`;
  return `${payloadWithCrcTag}${crc16CcittFalse(payloadWithCrcTag)}`;
}
