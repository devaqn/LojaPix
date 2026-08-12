import { describe, it, expect } from 'vitest';
import { stubProvider } from '../src/modules/payments/stub.provider';

describe('stubProvider', () => {
  it('creates a pix payment with a valid EMV code and a base64 QR image', async () => {
    const result = await stubProvider.createPixPayment({
      orderId: 'order-1',
      amountCents: 1500,
      description: 'Pedido de teste',
    });

    expect(result.providerPaymentId).toMatch(/^stub_/);
    expect(result.qrCode).toContain('br.gov.bcb.pix');
    expect(result.qrCodeBase64).toBeTruthy();
  });

  it('always reports pending status — confirmation is manual', async () => {
    await expect(stubProvider.getPaymentStatus('anything')).resolves.toBe('PENDING');
  });
});
