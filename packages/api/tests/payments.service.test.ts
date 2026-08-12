import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({ mockEnv: { PAYMENT_PROVIDER: 'stub' as string } }));

const {
  paymentFindUniqueMock,
  paymentUpdateMock,
  paymentCreateMock,
  paymentFindFirstMock,
  orderFindUniqueMock,
  orderUpdateMock,
  transactionMock,
  createPixPaymentMock,
  getPaymentStatusMock,
} = vi.hoisted(() => ({
  paymentFindUniqueMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  paymentCreateMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  orderFindUniqueMock: vi.fn(),
  orderUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  createPixPaymentMock: vi.fn(),
  getPaymentStatusMock: vi.fn(),
}));

vi.mock('../src/config/env', () => ({ env: mockEnv }));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: paymentFindUniqueMock,
      update: paymentUpdateMock,
      create: paymentCreateMock,
      findFirst: paymentFindFirstMock,
    },
    order: { findUnique: orderFindUniqueMock, update: orderUpdateMock },
    $transaction: transactionMock,
  },
}));

vi.mock('../src/modules/payments/index', () => ({
  paymentProvider: {
    name: 'stub',
    createPixPayment: createPixPaymentMock,
    getPaymentStatus: getPaymentStatusMock,
  },
}));

import { createPaymentForOrder, confirmStubPayment, handleMercadoPagoWebhook } from '../src/modules/payments/payments.service';

describe('createPaymentForOrder', () => {
  beforeEach(() => {
    orderFindUniqueMock.mockReset();
    createPixPaymentMock.mockReset();
    paymentCreateMock.mockReset();
  });

  it('rejects when the order does not exist', async () => {
    orderFindUniqueMock.mockResolvedValue(null);
    await expect(createPaymentForOrder('missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('creates a payment using the order total', async () => {
    orderFindUniqueMock.mockResolvedValue({ id: 'order-1', totalCents: 1500 });
    createPixPaymentMock.mockResolvedValue({ providerPaymentId: 'stub_123', qrCode: '000201...' });
    paymentCreateMock.mockResolvedValue({ id: 'payment-1' });

    await createPaymentForOrder('order-1');

    expect(createPixPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', amountCents: 1500 })
    );
    expect(paymentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderId: 'order-1', provider: 'stub' }) })
    );
  });
});

describe('confirmStubPayment', () => {
  beforeEach(() => {
    mockEnv.PAYMENT_PROVIDER = 'stub';
    paymentFindUniqueMock.mockReset();
    transactionMock.mockReset();
  });

  it('rejects when the active provider is not stub', async () => {
    mockEnv.PAYMENT_PROVIDER = 'mercadopago';
    await expect(confirmStubPayment('order-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects when there is no payment for the order', async () => {
    paymentFindUniqueMock.mockResolvedValue(null);
    await expect(confirmStubPayment('order-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('marks the payment approved and the order paid', async () => {
    paymentFindUniqueMock.mockResolvedValue({ id: 'payment-1', orderId: 'order-1' });
    transactionMock.mockResolvedValue(undefined);

    await confirmStubPayment('order-1');

    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});

describe('handleMercadoPagoWebhook', () => {
  beforeEach(() => {
    getPaymentStatusMock.mockReset();
    paymentFindFirstMock.mockReset();
    paymentUpdateMock.mockReset();
    orderUpdateMock.mockReset();
  });

  it('ignores a payment id that is not in our database', async () => {
    getPaymentStatusMock.mockResolvedValue('APPROVED');
    paymentFindFirstMock.mockResolvedValue(null);

    await handleMercadoPagoWebhook('unknown-id');

    expect(paymentUpdateMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the status has not changed', async () => {
    getPaymentStatusMock.mockResolvedValue('PENDING');
    paymentFindFirstMock.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', status: 'PENDING' });

    await handleMercadoPagoWebhook('mp-123');

    expect(paymentUpdateMock).not.toHaveBeenCalled();
  });

  it('approves the order when Mercado Pago confirms the payment', async () => {
    getPaymentStatusMock.mockResolvedValue('APPROVED');
    paymentFindFirstMock.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', status: 'PENDING' });

    await handleMercadoPagoWebhook('mp-123');

    expect(paymentUpdateMock).toHaveBeenCalledWith({ where: { id: 'payment-1' }, data: { status: 'APPROVED' } });
    expect(orderUpdateMock).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'PAID' } });
  });

  it('cancels the order when the payment is rejected', async () => {
    getPaymentStatusMock.mockResolvedValue('REJECTED');
    paymentFindFirstMock.mockResolvedValue({ id: 'payment-1', orderId: 'order-1', status: 'PENDING' });

    await handleMercadoPagoWebhook('mp-123');

    expect(orderUpdateMock).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: 'CANCELED' } });
  });
});
