import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../errors/AppError';

export async function listPublicCatalog() {
  const categories = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    include: {
      products: {
        where: { available: true },
        orderBy: { position: 'asc' },
      },
    },
  });
  return categories.filter((category) => category.products.length > 0);
}

export interface CategoryInput {
  name: string;
  position?: number;
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { position: 'asc' } });
}

export async function createCategory(input: CategoryInput) {
  return prisma.category.create({ data: { name: input.name, position: input.position ?? 0 } });
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Categoria não encontrada');
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id }, include: { products: true } });
  if (!existing) throw AppError.notFound('Categoria não encontrada');
  if (existing.products.length > 0) {
    throw AppError.conflict('Remova ou mova os produtos desta categoria antes de excluí-la');
  }
  await prisma.category.delete({ where: { id } });
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string;
  available?: boolean;
  position?: number;
}

export async function listProducts() {
  return prisma.product.findMany({ orderBy: [{ categoryId: 'asc' }, { position: 'asc' }] });
}

export async function createProduct(input: ProductInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw AppError.notFound('Categoria não encontrada');

  return prisma.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      imageUrl: input.imageUrl,
      available: input.available ?? true,
      position: input.position ?? 0,
    },
  });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Produto não encontrado');

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw AppError.notFound('Categoria não encontrada');
  }

  return prisma.product.update({ where: { id }, data: input });
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Produto não encontrado');

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    // P2003 = violação de chave estrangeira — o produto já tem pedidos (OrderItem)
    // referenciando ele. Sem isso, tentar excluir um produto com histórico vira
    // um 500 cru pro admin, sem explicar o que de fato aconteceu.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw AppError.conflict(
        'Não é possível excluir um produto que já tem pedidos — pause a disponibilidade em vez de excluir'
      );
    }
    throw error;
  }
}
