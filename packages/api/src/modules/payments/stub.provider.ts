import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { env } from '../../config/env';
import { buildStaticPixCode } from './pix-emv';
import type { PaymentProvider, CreatePixPaymentInput, CreatePixPaymentResult, PaymentStatusResult } from './payment-provider';

/**
 * Provider que funciona 100% offline, sem nenhuma conta em gateway de pagamento —
 * gera um Pix "copia e cola" de verdade (BR Code/EMV válido, escaneável por
 * qualquer banco) com o valor exato do pedido. A diferença pro provider real é que
 * ninguém avisa a API quando o cliente paga: por isso a confirmação é manual, via
 * POST /admin/payments/:orderId/confirm-stub (ver payments.service.ts).
 */
export const stubProvider: PaymentProvider = {
  name: 'stub',

  async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
    const providerPaymentId = `stub_${randomUUID()}`;
    const qrCode = buildStaticPixCode({
      pixKey: env.PIX_STATIC_KEY,
      merchantName: env.PIX_MERCHANT_NAME,
      merchantCity: env.PIX_MERCHANT_CITY,
      amountCents: input.amountCents,
      txid: providerPaymentId,
    });
    const qrCodeBase64 = (await QRCode.toDataURL(qrCode)).split(',')[1];

    return { providerPaymentId, qrCode, qrCodeBase64 };
  },

  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentStatusResult> {
    return 'PENDING';
  },
};
