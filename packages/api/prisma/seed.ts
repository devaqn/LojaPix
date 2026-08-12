import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_ADMIN_EMAIL = 'admin@lojapix.demo';
const DEMO_ADMIN_PASSWORD = 'admin123';

const CATALOG: Array<{ name: string; products: Array<{ name: string; description: string; priceCents: number }> }> = [
  {
    name: 'Açaí',
    products: [
      { name: 'Açaí 300ml', description: 'Copo de 300ml, puro ou batido com banana', priceCents: 1500 },
      { name: 'Açaí 500ml', description: 'Copo de 500ml, puro ou batido com banana', priceCents: 2000 },
      { name: 'Açaí 700ml', description: 'Copo de 700ml, puro ou batido com banana', priceCents: 2500 },
    ],
  },
  {
    name: 'Complementos',
    products: [
      { name: 'Granola', description: 'Porção extra de granola crocante', priceCents: 300 },
      { name: 'Leite em pó', description: 'Porção extra de leite em pó', priceCents: 200 },
      { name: 'Morango picado', description: 'Porção extra de morango fresco', priceCents: 400 },
      { name: 'Paçoca esfarelada', description: 'Porção extra de paçoca', priceCents: 250 },
    ],
  },
  {
    name: 'Bebidas',
    products: [
      { name: 'Água mineral 500ml', description: 'Sem gás, gelada', priceCents: 400 },
      { name: 'Suco natural 300ml', description: 'Sabor do dia — pergunte ao atendente', priceCents: 800 },
    ],
  },
  {
    name: 'Sobremesas',
    products: [
      { name: 'Brownie', description: 'Brownie de chocolate meio amargo', priceCents: 900 },
      { name: 'Copo da felicidade', description: 'Açaí, morango, granola, leite em pó e mel', priceCents: 1800 },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);
  await prisma.adminUser.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {},
    create: { email: DEMO_ADMIN_EMAIL, passwordHash },
  });

  for (let categoryIndex = 0; categoryIndex < CATALOG.length; categoryIndex += 1) {
    const categoryData = CATALOG[categoryIndex];

    const existing = await prisma.category.findFirst({ where: { name: categoryData.name } });
    const category =
      existing ??
      (await prisma.category.create({ data: { name: categoryData.name, position: categoryIndex } }));

    for (let productIndex = 0; productIndex < categoryData.products.length; productIndex += 1) {
      const productData = categoryData.products[productIndex];
      const existingProduct = await prisma.product.findFirst({
        where: { categoryId: category.id, name: productData.name },
      });

      if (!existingProduct) {
        await prisma.product.create({
          data: {
            categoryId: category.id,
            name: productData.name,
            description: productData.description,
            priceCents: productData.priceCents,
            position: productIndex,
          },
        });
      }
    }
  }

  console.log('✅ Seed concluído.');
  console.log(`   Admin: ${DEMO_ADMIN_EMAIL} / senha: ${DEMO_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
