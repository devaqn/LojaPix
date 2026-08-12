export type PaymentStatusResult = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CreatePixPaymentInput {
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail?: string;
}

export interface CreatePixPaymentResult {
  providerPaymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expiresAt?: Date;
}

export interface PaymentProvider {
  readonly name: string;
  createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
}
