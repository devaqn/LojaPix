import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseOrThrow } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { validateCredentials, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from './auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function toPublicAdmin(admin: { id: string; email: string }) {
  return { id: admin.id, email: admin.email };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/admin/auth/login', async (request, reply) => {
    const body = parseOrThrow(loginSchema, request.body);
    const admin = await validateCredentials(body.email, body.password);
    const accessToken = app.jwt.sign({ sub: admin.id }, { expiresIn: env.JWT_ACCESS_EXPIRES });
    const refreshToken = await issueRefreshToken(admin.id);
    return reply.send({ accessToken, refreshToken, admin: toPublicAdmin(admin) });
  });

  app.post('/admin/auth/refresh', async (request, reply) => {
    const body = parseOrThrow(refreshSchema, request.body);
    const { adminUserId, refreshToken } = await rotateRefreshToken(body.refreshToken);
    const accessToken = app.jwt.sign({ sub: adminUserId }, { expiresIn: env.JWT_ACCESS_EXPIRES });
    return reply.send({ accessToken, refreshToken });
  });

  app.post('/admin/auth/logout', async (request, reply) => {
    const body = parseOrThrow(refreshSchema, request.body);
    await revokeRefreshToken(body.refreshToken);
    return reply.status(204).send();
  });

  app.get('/admin/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const admin = await prisma.adminUser.findUnique({ where: { id: request.adminUserId } });
    if (!admin) throw AppError.notFound('Conta não encontrada');
    return reply.send(toPublicAdmin(admin));
  });
}
