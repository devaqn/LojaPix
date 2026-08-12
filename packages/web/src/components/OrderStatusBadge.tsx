import { Badge } from './ui/Badge';
import type { OrderStatus } from '../lib/api';

const STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
};

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  AWAITING_PAYMENT: 'warning',
  PAID: 'success',
  PREPARING: 'warning',
  READY: 'success',
  COMPLETED: 'neutral',
  CANCELED: 'danger',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
