import { useEffect, useState } from 'react';
import { publicApi, Category } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { CartDrawer } from '../components/CartDrawer';
import { useCart } from '../lib/cart';

export function Storefront() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { items } = useCart();

  useEffect(() => {
    publicApi
      .getCatalog()
      .then(setCategories)
      .catch(() => setError('Não foi possível carregar o cardápio agora.'))
      .finally(() => setLoading(false));
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-purple-800">🍇 Açaí da Serra</h1>
          <p className="text-sm text-neutral-500">Peça pra entrega ou retirada — pagamento por Pix</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-full bg-purple-700 p-3 text-white shadow-md"
          aria-label="Abrir carrinho"
        >
          🛒
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold">
              {itemCount}
            </span>
          )}
        </button>
      </header>

      {loading && <p className="text-neutral-500">Carregando cardápio…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading &&
        !error &&
        categories.map((category) => (
          <section key={category.id} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-neutral-800">{category.name}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {category.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))}

      {!loading && !error && categories.length === 0 && (
        <p className="text-neutral-500">Nenhum produto disponível no momento.</p>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
