import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseOrThrow } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import {
  listPublicCatalog,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './catalog.service';

const categorySchema = z.object({
  name: z.string().min(1),
  position: z.number().int().optional(),
});

const categoryUpdateSchema = categorySchema.partial();

const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  available: z.boolean().optional(),
  position: z.number().int().optional(),
});

const productUpdateSchema = productSchema.partial();

const idParamSchema = z.object({ id: z.string().uuid() });

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/public/catalog', async (_request, reply) => {
    const categories = await listPublicCatalog();
    return reply.send(categories);
  });

  app.get('/admin/categories', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send(await listCategories());
  });

  app.post('/admin/categories', { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(categorySchema, request.body);
    return reply.status(201).send(await createCategory(body));
  });

  app.patch('/admin/categories/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    const body = parseOrThrow(categoryUpdateSchema, request.body);
    return reply.send(await updateCategory(id, body));
  });

  app.delete('/admin/categories/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    await deleteCategory(id);
    return reply.status(204).send();
  });

  app.get('/admin/products', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send(await listProducts());
  });

  app.post('/admin/products', { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(productSchema, request.body);
    return reply.status(201).send(await createProduct(body));
  });

  app.patch('/admin/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    const body = parseOrThrow(productUpdateSchema, request.body);
    return reply.send(await updateProduct(id, body));
  });

  app.delete('/admin/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parseOrThrow(idParamSchema, request.params);
    await deleteProduct(id);
    return reply.status(204).send();
  });
}
