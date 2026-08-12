import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { parseOrThrow } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { createPublicOrder, getPublicOrder, listOrdersForAdmin, updateOrderStatus } from './orders.service';

const createOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
  address: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'O pedido precisa de ao menos 1 item'),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const statusUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  // Sem isso, uma loja em operação há meses devolveria todo o histórico de
  // pedidos de uma vez só ao carregar o painel sem filtro de status.
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export async function ordersRoutes(app: FastifyInstance) {
  app.post(
    '/public/orders',
    // Rota pública sem autenticação e que dispara uma chamada real à API de
    // pagamento (Pix) a cada pedido — limite mais apertado que o global pra
    // dificultar spam de pedidos falsos e uso indevido da API do provedor.
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = parseOrThrow(createOrderSchema, request.body);
      const { order, payment } = await createPublicOrder(body);
      return reply.status(201).send({ order, payment });
    }
  );

  app.get('/public/orders/:id', async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    return reply.send(await getPublicOrder(id));
  });

  app.get('/admin/orders', { preHandler: authenticate }, async (request, reply) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    return reply.send(await listOrdersForAdmin(query.status, query.page, query.limit));
  });

  app.patch('/admin/orders/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    const body = parseOrThrow(statusUpdateSchema, request.body);
    return reply.send(await updateOrderStatus(id, body.status));
  });
}
