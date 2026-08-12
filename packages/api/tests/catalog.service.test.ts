import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const {
  categoryFindManyMock,
  categoryFindUniqueMock,
  categoryCreateMock,
  categoryDeleteMock,
  productFindUniqueMock,
  productCreateMock,
  productDeleteMock,
} = vi.hoisted(() => ({
  categoryFindManyMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  categoryCreateMock: vi.fn(),
  categoryDeleteMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  productCreateMock: vi.fn(),
  productDeleteMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: categoryFindManyMock,
      findUnique: categoryFindUniqueMock,
      create: categoryCreateMock,
      delete: categoryDeleteMock,
    },
    product: {
      findUnique: productFindUniqueMock,
      create: productCreateMock,
      delete: productDeleteMock,
    },
  },
}));

import { listPublicCatalog, createProduct, deleteCategory, deleteProduct } from '../src/modules/catalog/catalog.service';

describe('listPublicCatalog', () => {
  it('filters out categories with no available products', async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: 'c1', name: 'Açaí', products: [{ id: 'p1', available: true }] },
      { id: 'c2', name: 'Vazia', products: [] },
    ]);

    const result = await listPublicCatalog();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });
});

describe('createProduct', () => {
  beforeEach(() => {
    categoryFindUniqueMock.mockReset();
    productCreateMock.mockReset();
  });

  it('rejects when the category does not exist', async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(createProduct({ categoryId: 'missing', name: 'X', priceCents: 100 })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(productCreateMock).not.toHaveBeenCalled();
  });

  it('creates the product when the category exists', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 'c1' });
    productCreateMock.mockResolvedValue({ id: 'p1' });

    await createProduct({ categoryId: 'c1', name: 'Açaí 300ml', priceCents: 1500 });

    expect(productCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Açaí 300ml', priceCents: 1500 }) })
    );
  });
});

describe('deleteCategory', () => {
  it('blocks deletion when the category still has products', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 'c1', products: [{ id: 'p1' }] });

    await expect(deleteCategory('c1')).rejects.toMatchObject({ statusCode: 409 });
    expect(categoryDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes when there are no products left', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 'c1', products: [] });

    await deleteCategory('c1');

    expect(categoryDeleteMock).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});

describe('deleteProduct', () => {
  beforeEach(() => {
    productFindUniqueMock.mockReset();
    productDeleteMock.mockReset();
  });

  it('rejects when the product does not exist', async () => {
    productFindUniqueMock.mockResolvedValue(null);
    await expect(deleteProduct('missing')).rejects.toMatchObject({ statusCode: 404 });
    expect(productDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes the product when there is no order history', async () => {
    productFindUniqueMock.mockResolvedValue({ id: 'p1' });
    productDeleteMock.mockResolvedValue({ id: 'p1' });

    await deleteProduct('p1');

    expect(productDeleteMock).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  // Regressão: excluir um produto que já apareceu em algum pedido violava a FK
  // (OrderItem -> Product) e vazava um erro 500 cru do Prisma pro admin, em vez
  // de uma mensagem explicando que existe histórico de pedido no caminho.
  it('converts a foreign-key violation (product has order history) into a friendly conflict', async () => {
    productFindUniqueMock.mockResolvedValue({ id: 'p1' });
    productDeleteMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: '6.19.3',
      })
    );

    await expect(deleteProduct('p1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rethrows any other unexpected error as-is', async () => {
    productFindUniqueMock.mockResolvedValue({ id: 'p1' });
    productDeleteMock.mockRejectedValue(new Error('conexão caiu'));

    await expect(deleteProduct('p1')).rejects.toThrow('conexão caiu');
  });
});
