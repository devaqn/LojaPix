import { useEffect, useState, useCallback, FormEvent } from 'react';
import { adminRequest } from '../lib/auth';
import { formatCents } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  available: boolean;
}

export function AdminProducts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [priceReais, setPriceReais] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');

  const load = useCallback(async () => {
    const [categoriesData, productsData] = await Promise.all([
      adminRequest<Category[]>('/admin/categories'),
      adminRequest<Product[]>('/admin/products'),
    ]);
    setCategories(categoriesData);
    setProducts(productsData);
    setCategoryId((current) => current || categoriesData[0]?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    await adminRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCategoryName, position: categories.length }),
    });
    setNewCategoryName('');
    load();
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const priceCents = Math.round(Number(priceReais.replace(',', '.')) * 100);
    if (!categoryId || !name.trim() || !Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Preencha nome, categoria e um preço válido.');
      return;
    }
    setSubmitting(true);
    try {
      await adminRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify({ categoryId, name, description: description || undefined, priceCents }),
      });
      setName('');
      setPriceReais('');
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o produto.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAvailable(product: Product) {
    await adminRequest(`/admin/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ available: !product.available }),
    });
    load();
  }

  async function removeProduct(productId: string) {
    await adminRequest(`/admin/products/${productId}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <p className="text-neutral-500">Carregando produtos…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-bold text-neutral-900">Produtos</h1>

        <Card className="mb-6 p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Nova categoria</h2>
          <form onSubmit={createCategory} className="flex gap-2">
            <Input
              placeholder="Ex: Sobremesas"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
            <Button type="submit">Adicionar</Button>
          </form>
        </Card>

        <Card className="mb-6 p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Novo produto</h2>
          <form onSubmit={createProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input placeholder="Nome do produto" value={name} onChange={(event) => setName(event.target.value)} />
            <Input
              placeholder="Preço (ex: 15,90)"
              value={priceReais}
              onChange={(event) => setPriceReais(event.target.value)}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button type="submit" disabled={submitting} className="sm:col-span-2">
              {submitting ? 'Criando…' : 'Criar produto'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <Card key={product.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-xs text-neutral-500">{formatCents(product.priceCents)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={product.available ? 'success' : 'neutral'}>
                {product.available ? 'Disponível' : 'Pausado'}
              </Badge>
              <Button variant="secondary" onClick={() => toggleAvailable(product)}>
                {product.available ? 'Pausar' : 'Reativar'}
              </Button>
              <Button variant="danger" onClick={() => removeProduct(product.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
