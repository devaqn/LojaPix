import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';
import { env } from '../../config/env';

const REFRESH_TOKEN_BYTES = 48;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function validateCredentials(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    throw AppError.unauthorized('E-mail ou senha inválidos');
  }
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('E-mail ou senha inválidos');
  }
  return admin;
}

export async function issueRefreshToken(adminUserId: string) {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { adminUserId, tokenHash: hashToken(token), expiresAt },
  });
  return token;
}

export async function rotateRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  // updateMany com revokedAt: null e expiresAt válido no próprio WHERE faz a
  // checagem e a revogação serem atômicas no banco — com findUnique + update
  // separados, duas requisições concorrentes usando o mesmo refresh token (ex.:
  // token roubado sendo usado ao mesmo tempo pelo dono legítimo e por um
  // atacante) podiam ambas passar pela checagem antes de qualquer uma gravar a
  // revogação, e as duas saíam com um refresh token novo válido em vez da
  // segunda ser rejeitada.
  const { count } = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null, expiresAt: { gte: new Date() } },
    data: { revokedAt: new Date() },
  });

  if (count === 0) {
    throw AppError.unauthorized('Refresh token inválido ou expirado');
  }

  const existing = await prisma.refreshToken.findUniqueOrThrow({ where: { tokenHash } });
  const refreshToken = await issueRefreshToken(existing.adminUserId);
  return { adminUserId: existing.adminUserId, refreshToken };
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
