import { OrderStatus, FulfillmentType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { createPaymentForOrder } from '../payments/payments.service';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  address?: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export async function createPublicOrder(input: CreateOrderInput) {
  if (input.fulfillmentType === 'DELIVERY' && !input.address) {
    throw AppError.unprocessable('Endereço é obrigatório para entrega');
  }

  const productIds = input.items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== new Set(productIds).size) {
    throw AppError.notFound('Um ou mais produtos do pedido não foram encontrados');
  }

  const unavailable = products.find((product) => !product.available);
  if (unavailable) {
    throw AppError.conflict(`"${unavailable.name}" não está mais disponível`);
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  let totalCents = 0;
  const itemsData = input.items.map((item) => {
    const product = productById.get(item.productId)!;
    totalCents += product.priceCents * item.quantity;
    return {
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    };
  });

  const order = await prisma.order.create({
    data: {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      fulfillmentType: input.fulfillmentType,
      address: input.address,
      notes: input.notes,
      totalCents,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  const payment = await createPaymentForOrder(order.id);

  return { order, payment };
}

export async function getPublicOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });
  if (!order) throw AppError.notFound('Pedido não encontrado');
  return order;
}

export async function listOrdersForAdmin(status?: OrderStatus, page = 1, limit = 200) {
  return prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { items: true, payment: true },
    take: limit,
    skip: (page - 1) * limit,
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Pedido não encontrado');
  return prisma.order.update({ where: { id }, data: { status } });
}
