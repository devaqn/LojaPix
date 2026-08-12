import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4500),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Nome não pode ser BASE_URL — Vite/Vitest reserva esse nome e injeta seu próprio
  // valor ("/") em process.env, o que quebraria a validação de URL aqui.
  APP_BASE_URL: z.string().url().default('http://localhost:4500'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY é obrigatório — rode npm run keys:generate'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY é obrigatório — rode npm run keys:generate'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(30),

  PAYMENT_PROVIDER: z.enum(['stub', 'mercadopago']).default('stub'),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_URL: z.string().optional(),

  PIX_STATIC_KEY: z.string().default('00000000000'),
  PIX_MERCHANT_NAME: z.string().max(25).default('LOJAPIX DEMO'),
  PIX_MERCHANT_CITY: z.string().max(15).default('SAO PAULO'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.PAYMENT_PROVIDER === 'mercadopago' && !parsed.data.MERCADOPAGO_ACCESS_TOKEN) {
  console.error('❌ PAYMENT_PROVIDER=mercadopago exige MERCADOPAGO_ACCESS_TOKEN configurado.');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
