import { describe, it, expect, vi, beforeEach } from 'vitest';

const { productFindManyMock, orderCreateMock, orderFindUniqueMock, createPaymentForOrderMock } = vi.hoisted(() => ({
  productFindManyMock: vi.fn(),
  orderCreateMock: vi.fn(),
  orderFindUniqueMock: vi.fn(),
  createPaymentForOrderMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    product: { findMany: productFindManyMock },
    order: { create: orderCreateMock, findUnique: orderFindUniqueMock },
  },
}));

vi.mock('../src/modules/payments/payments.service', () => ({
  createPaymentForOrder: createPaymentForOrderMock,
}));

import { createPublicOrder, updateOrderStatus } from '../src/modules/orders/orders.service';

const products = [
  { id: 'p1', name: 'Açaí 300ml', priceCents: 1500, available: true },
  { id: 'p2', name: 'Granola', priceCents: 300, available: true },
];

describe('createPublicOrder', () => {
  beforeEach(() => {
    productFindManyMock.mockReset();
    orderCreateMock.mockReset();
    createPaymentForOrderMock.mockReset();
  });

  it('requires an address for delivery', async () => {
    await expect(
      createPublicOrder({
        customerName: 'Fulano',
        customerPhone: '11999998888',
        fulfillmentType: 'DELIVERY',
        items: [{ productId: 'p1', quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(productFindManyMock).not.toHaveBeenCalled();
  });

  it('rejects an order referencing a product that does not exist', async () => {
    productFindManyMock.mockResolvedValue([products[0]]);

    await expect(
      createPublicOrder({
        customerName: 'Fulano',
        customerPhone: '11999998888',
        fulfillmentType: 'PICKUP',
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'does-not-exist', quantity: 1 },
        ],
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an order with an unavailable product', async () => {
    productFindManyMock.mockResolvedValue([{ ...products[0], available: false }]);

    await expect(
      createPublicOrder({
        customerName: 'Fulano',
        customerPhone: '11999998888',
        fulfillmentType: 'PICKUP',
        items: [{ productId: 'p1', quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('computes the total in cents and creates a payment for the order', async () => {
    productFindManyMock.mockResolvedValue(products);
    orderCreateMock.mockResolvedValue({ id: 'order-1', totalCents: 1800, items: [] });
    createPaymentForOrderMock.mockResolvedValue({ id: 'payment-1', qrCode: '000201...' });

    const { order, payment } = await createPublicOrder({
      customerName: 'Fulano',
      customerPhone: '11999998888',
      fulfillmentType: 'PICKUP',
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    });

    expect(orderCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalCents: 1800 }) })
    );
    expect(createPaymentForOrderMock).toHaveBeenCalledWith('order-1');
    expect(order.id).toBe('order-1');
    expect(payment.id).toBe('payment-1');
  });
});

describe('updateOrderStatus', () => {
  it('rejects when the order does not exist', async () => {
    orderFindUniqueMock.mockResolvedValue(null);
    await expect(updateOrderStatus('missing', 'PAID')).rejects.toMatchObject({ statusCode: 404 });
  });
});
