import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`LojaPix API rodando em ${env.APP_BASE_URL} (provedor de pagamento: ${env.PAYMENT_PROVIDER})`);
}

main().catch((error) => {
  logger.error({ err: error }, 'Falha ao iniciar o servidor');
  process.exit(1);
});
