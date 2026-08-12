import { describe, it, expect, vi, afterEach } from 'vitest';

describe('env PAYMENT_PROVIDER guard', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('defaults to stub when unset', async () => {
    delete process.env.PAYMENT_PROVIDER;
    vi.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.PAYMENT_PROVIDER).toBe('stub');
  });

  it('accepts mercadopago when an access token is present', async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-fake-token';
    vi.resetModules();
    const { env } = await import('../src/config/env');
    expect(env.PAYMENT_PROVIDER).toBe('mercadopago');
  });

  // Regressão: sem token, o provider mercadopago não teria como criar cobrança
  // nenhuma — melhor falhar alto e claro na inicialização do que só na primeira
  // tentativa de checkout de um cliente de verdade.
  it('exits the process when mercadopago is selected without an access token', async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.resetModules();

    await import('../src/config/env');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
