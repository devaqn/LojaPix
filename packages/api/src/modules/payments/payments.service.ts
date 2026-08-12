import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';
import { paymentProvider } from './index';

export async function createPaymentForOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw AppError.notFound('Pedido não encontrado');

  const result = await paymentProvider.createPixPayment({
    orderId: order.id,
    amountCents: order.totalCents,
    description: `Pedido ${order.id.slice(0, 8)}`,
  });

  return prisma.payment.create({
    data: {
      orderId: order.id,
      provider: paymentProvider.name,
      providerPaymentId: result.providerPaymentId,
      amountCents: order.totalCents,
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
      ticketUrl: result.ticketUrl,
      expiresAt: result.expiresAt,
    },
  });
}

export async function confirmStubPayment(orderId: string) {
  if (env.PAYMENT_PROVIDER !== 'stub') {
    throw AppError.forbidden('Confirmação manual só é permitida quando PAYMENT_PROVIDER=stub');
  }

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw AppError.notFound('Pagamento não encontrado para este pedido');

  await prisma.$transaction([
    prisma.payment.update({ where: { orderId }, data: { status: 'APPROVED' } }),
    prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } }),
  ]);
}

export async function handleMercadoPagoWebhook(providerPaymentId: string) {
  // Nunca confiar no corpo/query do webhook em si — o valor que importa é sempre
  // buscado de volta na API do Mercado Pago antes de aprovar qualquer coisa. Mesmo
  // princípio usado no client da Pluggy no GranaZap: dado externo não autentica nada
  // sozinho, só a chamada de volta autenticada com nosso próprio access token conta.
  const status = await paymentProvider.getPaymentStatus(providerPaymentId);

  const payment = await prisma.payment.findFirst({ where: { providerPaymentId } });
  if (!payment || payment.status === status) {
    return;
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status } });

  if (status === 'APPROVED') {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } });
  } else if (status === 'REJECTED' || status === 'EXPIRED') {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELED' } });
  }
}
