import { env } from '../../config/env';
import { stubProvider } from './stub.provider';
import { mercadoPagoProvider } from './mercadopago.provider';
import type { PaymentProvider } from './payment-provider';

export const paymentProvider: PaymentProvider = env.PAYMENT_PROVIDER === 'mercadopago' ? mercadoPagoProvider : stubProvider;

export type { PaymentProvider, CreatePixPaymentInput, CreatePixPaymentResult, PaymentStatusResult } from './payment-provider';
