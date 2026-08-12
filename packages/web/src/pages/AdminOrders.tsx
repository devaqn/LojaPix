import { useEffect, useState, useCallback } from 'react';
import { adminRequest } from '../lib/auth';
import type { Order, OrderStatus } from '../lib/api';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { formatCents } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: 'Iniciar preparo',
  PREPARING: 'Marcar como pronto',
  READY: 'Concluir pedido',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await adminRequest<Order[]>('/admin/orders');
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await adminRequest(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function confirmStubPayment(orderId: string) {
    await adminRequest(`/admin/payments/${orderId}/confirm-stub`, { method: 'POST' });
    load();
  }

  async function cancelOrder(orderId: string) {
    await adminRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELED' }),
    });
    load();
  }

  if (loading) return <p className="text-neutral-500">Carregando pedidos…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-neutral-900">Pedidos</h1>
      {orders.length === 0 && <p className="text-neutral-500">Nenhum pedido ainda.</p>}
      {orders.map((order) => (
        <Card key={order.id} className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="font-semibold">{order.customerName}</p>
              <p className="text-xs text-neutral-500">{order.customerPhone}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <ul className="mb-3 text-sm text-neutral-600">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.quantity}x {item.productName}
              </li>
            ))}
          </ul>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>
              {order.fulfillmentType === 'DELIVERY' ? `Entrega: ${order.address ?? ''}` : 'Retirada no local'}
            </span>
            <span className="font-semibold">{formatCents(order.totalCents)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.status === 'AWAITING_PAYMENT' && order.payment?.provider === 'stub' && (
              <Button onClick={() => confirmStubPayment(order.id)}>Confirmar pagamento (stub)</Button>
            )}
            {NEXT_STATUS[order.status] && (
              <Button variant="secondary" onClick={() => advanceStatus(order)}>
                {NEXT_STATUS_LABEL[order.status]}
              </Button>
            )}
            {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && (
              <Button variant="danger" onClick={() => cancelOrder(order.id)}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
