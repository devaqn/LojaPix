import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { env } from './config/env';
import { registerErrorHandler } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'production'
        ? true
        : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } },
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  await app.register(jwt, {
    secret: { private: env.JWT_PRIVATE_KEY, public: env.JWT_PUBLIC_KEY },
    sign: { algorithm: 'RS256' },
  });
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(catalogRoutes);
  await app.register(ordersRoutes);
  await app.register(paymentsRoutes);

  return app;
}
