import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import type { PaymentProvider, CreatePixPaymentInput, CreatePixPaymentResult, PaymentStatusResult } from './payment-provider';

const MERCADOPAGO_API = 'https://api.mercadopago.com';

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

function mapStatus(mpStatus: string): PaymentStatusResult {
  switch (mpStatus) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'EXPIRED';
    default:
      return 'PENDING'; // pending, in_process, in_mediation, etc.
  }
}

/**
 * Integração com a API clássica de pagamentos do Mercado Pago (POST /v1/payments).
 * Chamado via fetch puro (sem SDK) pelo mesmo motivo do client da Pluggy no
 * GranaZap: mantém o contrato HTTP visível e auditável, sem depender de uma
 * versão de SDK que pode mudar de comportamento silenciosamente. Se a Mercado
 * Pago aposentar essa API em favor da Orders API (/v1/orders), só este arquivo
 * precisa mudar — o resto do sistema depende apenas da interface PaymentProvider.
 */
export const mercadoPagoProvider: PaymentProvider = {
  name: 'mercadopago',

  async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
    const response = await fetch(`${MERCADOPAGO_API}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': input.orderId,
      },
      body: JSON.stringify({
        transaction_amount: Number((input.amountCents / 100).toFixed(2)),
        description: input.description,
        payment_method_id: 'pix',
        payer: { email: input.payerEmail ?? 'cliente@lojapix.demo' },
        external_reference: input.orderId,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`Mercado Pago recusou a criação do pagamento Pix (${response.status})`, 502, body);
    }

    const data = (await response.json()) as MercadoPagoPaymentResponse;
    const transactionData = data.point_of_interaction?.transaction_data;

    if (!transactionData?.qr_code) {
      throw new AppError('Mercado Pago não retornou o QR code do Pix', 502);
    }

    return {
      providerPaymentId: String(data.id),
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64,
      ticketUrl: transactionData.ticket_url,
      expiresAt: data.date_of_expiration ? new Date(data.date_of_expiration) : undefined,
    };
  },

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const response = await fetch(`${MERCADOPAGO_API}/v1/payments/${providerPaymentId}`, {
      headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}` },
    });

    if (!response.ok) {
      throw new AppError(`Falha ao consultar pagamento no Mercado Pago (${response.status})`, 502);
    }

    const data = (await response.json()) as MercadoPagoPaymentResponse;
    return mapStatus(data.status);
  },
};
