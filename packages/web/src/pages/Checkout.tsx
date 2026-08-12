import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { publicApi } from '../lib/api';
import { formatCents } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Checkout() {
  const { items, totalCents, clear } = useCart();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { order } = await publicApi.createOrder({
        customerName,
        customerPhone,
        fulfillmentType,
        address: fulfillmentType === 'DELIVERY' ? address : undefined,
        notes: notes || undefined,
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });
      clear();
      navigate(`/pedido/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-neutral-500">Seu carrinho está vazio.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Voltar ao cardápio
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-purple-800">Finalizar pedido</h1>

      <Card className="mb-6 p-4">
        {items.map((item) => (
          <div key={item.product.id} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.product.name}
            </span>
            <span>{formatCents(item.product.priceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatCents(totalCents)}</span>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Seu nome</label>
          <Input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">WhatsApp</label>
          <Input
            required
            placeholder="(11) 99999-9999"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFulfillmentType('DELIVERY')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              fulfillmentType === 'DELIVERY' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-neutral-300'
            }`}
          >
            Entrega
          </button>
          <button
            type="button"
            onClick={() => setFulfillmentType('PICKUP')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              fulfillmentType === 'PICKUP' ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-neutral-300'
            }`}
          >
            Retirada
          </button>
        </div>

        {fulfillmentType === 'DELIVERY' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Endereço</label>
            <Input required value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Observações (opcional)</label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Ir para o pagamento'}
        </Button>
      </form>
    </div>
  );
}
