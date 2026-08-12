import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseOrThrow } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { confirmStubPayment, handleMercadoPagoWebhook } from './payments.service';

const webhookQuerySchema = z.object({
  type: z.string().optional(),
  'data.id': z.string().optional(),
});

const orderIdParamSchema = z.object({ orderId: z.string().uuid() });

export async function paymentsRoutes(app: FastifyInstance) {
  // Mercado Pago manda type=payment&data.id=<id> na query string do webhook.
  // Sempre respondemos 200 rápido (mesmo se ignorarmos o evento) — é o esperado
  // pelo lado deles pra não ficar reenviando o mesmo webhook.
  app.post('/webhooks/mercadopago', async (request, reply) => {
    const query = parseOrThrow(webhookQuerySchema, request.query);
    const paymentId = query['data.id'];

    if (query.type === 'payment' && paymentId) {
      await handleMercadoPagoWebhook(paymentId);
    }

    return reply.status(200).send({ received: true });
  });

  app.post('/admin/payments/:orderId/confirm-stub', { preHandler: authenticate }, async (request, reply) => {
    const { orderId } = parseOrThrow(orderIdParamSchema, request.params);
    await confirmStubPayment(orderId);
    return reply.status(204).send();
  });
}
