import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, Order } from '../lib/api';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { formatCents } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const POLL_INTERVAL_MS = 4000;

export function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await publicApi.getOrder(id);
      setOrder(data);
    } catch {
      setError('Pedido não encontrado.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!order || order.status !== 'AWAITING_PAYMENT') return;
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, load]);

  async function copyPixCode() {
    if (!order?.payment) return;
    await navigator.clipboard.writeText(order.payment.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;
  if (!order) return <p className="p-8 text-center text-neutral-500">Carregando pedido…</p>;

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-2 text-xl font-bold text-purple-800">Pedido #{order.id.slice(0, 8)}</h1>
      <div className="mb-6">
        <OrderStatusBadge status={order.status} />
      </div>

      <Card className="mb-6 p-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.productName}
            </span>
            <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </Card>

      {order.status === 'AWAITING_PAYMENT' && order.payment && (
        <Card className="p-4 text-center">
          <p className="mb-3 text-sm text-neutral-600">Escaneie o QR Code no app do seu banco:</p>
          {order.payment.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${order.payment.qrCodeBase64}`}
              alt="QR Code Pix"
              className="mx-auto mb-4 h-48 w-48"
            />
          )}
          <Button onClick={copyPixCode} className="w-full">
            {copied ? 'Código copiado!' : 'Copiar código Pix'}
          </Button>
          <p className="mt-3 text-xs text-neutral-400">
            Esta página atualiza sozinha assim que o pagamento for confirmado.
          </p>
        </Card>
      )}

      {order.status === 'PAID' && (
        <p className="text-center text-green-700">Pagamento confirmado! Seu pedido já entrou na fila de preparo.</p>
      )}
      {order.status === 'PREPARING' && <p className="text-center text-amber-700">Seu pedido está sendo preparado.</p>}
      {order.status === 'READY' && <p className="text-center text-green-700">Seu pedido está pronto!</p>}
      {order.status === 'COMPLETED' && <p className="text-center text-neutral-600">Pedido concluído. Obrigado!</p>}
      {order.status === 'CANCELED' && <p className="text-center text-red-600">Este pedido foi cancelado.</p>}
    </div>
  );
}
