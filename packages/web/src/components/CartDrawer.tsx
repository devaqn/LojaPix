import { Link } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { formatCents } from '../lib/format';
import { Button } from './ui/Button';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, setQuantity, removeItem, totalCents } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seu carrinho</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900" aria-label="Fechar carrinho">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">Seu carrinho está vazio.</p>
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-neutral-500">{formatCents(item.product.priceCents)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-6 w-6 rounded border border-neutral-300 text-sm"
                    onClick={() => setQuantity(item.product.id, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm">{item.quantity}</span>
                  <button
                    className="h-6 w-6 rounded border border-neutral-300 text-sm"
                    onClick={() => setQuantity(item.product.id, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
                <button className="text-xs text-red-600" onClick={() => removeItem(item.product.id)}>
                  remover
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <div className="mb-3 flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{formatCents(totalCents)}</span>
          </div>
          <Link to="/checkout" onClick={onClose}>
            <Button className="w-full" disabled={items.length === 0}>
              Finalizar pedido
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
