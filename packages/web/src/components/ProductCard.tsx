import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { formatCents } from '../lib/format';
import { useCart } from '../lib/cart';
import type { Product } from '../lib/api';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <Card className="flex flex-col overflow-hidden">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-purple-50 text-4xl">🍇</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-neutral-900">{product.name}</h3>
        {product.description && <p className="text-sm text-neutral-500">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-purple-700">{formatCents(product.priceCents)}</span>
          <Button onClick={() => addItem(product)}>Adicionar</Button>
        </div>
      </div>
    </Card>
  );
}
