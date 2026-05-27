import prisma from './utils/prisma';

async function seed() {
  console.log('🌱 Populando banco com dados de exemplo...');

  // Criar usuário 1
  const user1 = await prisma.user.upsert({
    where: { email: 'joao@casalfinan.com' },
    update: {},
    create: {
      id: 'seed-user-1',
      name: 'João',
      email: 'joao@casalfinan.com',
      // Senha: 123456
      password: '$2a$12$GGLfMZh7mQ0mpnqyn2N71.h8DVDecOHC3s9c.7TOeJqm4cF4tpCu.',
    },
  });

  // Criar usuário 2
  const user2 = await prisma.user.upsert({
    where: { email: 'maria@casalfinan.com' },
    update: {},
    create: {
      id: 'seed-user-2',
      name: 'Maria',
      email: 'maria@casalfinan.com',
      // Senha: 123456
      password: '$2a$12$EIEOzXPiNZ9U94e9Yvag9OvqPYLx.jn4vLNxuAvmPsqezFSyV2Xgu',
    },
  });

  // Criar casal
  const couple = await prisma.couple.upsert({
    where: { ownerId: user1.id },
    update: {},
    create: {
      id: 'seed-couple-1',
      name: 'João & Maria',
      inviteCode: 'DEMO1234',
      ownerId: user1.id,
      members: { connect: [{ id: user1.id }, { id: user2.id }] },
    },
  });

  // Atualizar coupleId nos usuários
  await prisma.user.update({ where: { id: user1.id }, data: { coupleId: couple.id } });
  await prisma.user.update({ where: { id: user2.id }, data: { coupleId: couple.id } });

  // Criar categorias padrão
  const cats = await Promise.all([
    prisma.category.upsert({ where: { id: 'cat-1' }, update: {}, create: { id: 'cat-1', name: 'Alimentação', icon: '🍽️', color: '#FF6B6B', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-2' }, update: {}, create: { id: 'cat-2', name: 'Transporte', icon: '🚗', color: '#4ECDC4', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-3' }, update: {}, create: { id: 'cat-3', name: 'Moradia', icon: '🏠', color: '#45B7D1', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-4' }, update: {}, create: { id: 'cat-4', name: 'Lazer', icon: '🎮', color: '#DDA0DD', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-5' }, update: {}, create: { id: 'cat-5', name: 'Assinaturas', icon: '📱', color: '#BB8FCE', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-6' }, update: {}, create: { id: 'cat-6', name: 'Saúde', icon: '🏥', color: '#96CEB4', type: 'expense', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-7' }, update: {}, create: { id: 'cat-7', name: 'Salário', icon: '💰', color: '#2ECC71', type: 'income', coupleId: couple.id } }),
    prisma.category.upsert({ where: { id: 'cat-8' }, update: {}, create: { id: 'cat-8', name: 'Outras rendas', icon: '💵', color: '#17A589', type: 'income', coupleId: couple.id } }),
  ]);

  const [catAlim, catTransp, catMoradia, catLazer, catAssinas, catSaude, catSalario] = cats;

  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();

  // Criar transações do mês atual
  const transacoes = [
    { desc: 'Salário João', amount: 5000, type: 'income', catId: catSalario.id, userId: user1.id, day: 5 },
    { desc: 'Salário Maria', amount: 4500, type: 'income', catId: catSalario.id, userId: user2.id, day: 5 },
    { desc: 'Supermercado', amount: 620, type: 'expense', catId: catAlim.id, userId: user1.id, day: 8 },
    { desc: 'Aluguel', amount: 1800, type: 'expense', catId: catMoradia.id, userId: user1.id, day: 10 },
    { desc: 'Conta de luz', amount: 180, type: 'expense', catId: catMoradia.id, userId: user2.id, day: 12 },
    { desc: 'Combustível', amount: 250, type: 'expense', catId: catTransp.id, userId: user1.id, day: 15 },
    { desc: 'Netflix', amount: 55.90, type: 'expense', catId: catAssinas.id, userId: user1.id, day: 18 },
    { desc: 'Spotify', amount: 21.90, type: 'expense', catId: catAssinas.id, userId: user2.id, day: 18 },
    { desc: 'Farmácia', amount: 89, type: 'expense', catId: catSaude.id, userId: user2.id, day: 20 },
    { desc: 'Jantar fora', amount: 145, type: 'expense', catId: catAlim.id, userId: user1.id, day: 22 },
    { desc: 'Cinema', amount: 80, type: 'expense', catId: catLazer.id, userId: user2.id, day: 24 },
    { desc: 'Uber', amount: 45, type: 'expense', catId: catTransp.id, userId: user2.id, day: 25 },
  ];

  for (let i = 0; i < transacoes.length; i++) {
    const t = transacoes[i];
    await prisma.transaction.upsert({
      where: { id: `seed-tx-${i + 1}` },
      update: {},
      create: {
        id: `seed-tx-${i + 1}`,
        description: t.desc,
        amount: t.amount,
        type: t.type,
        date: new Date(ano, mes, t.day),
        isPaid: true,
        isShared: false,
        recurrence: 'none',
        userId: t.userId,
        categoryId: t.catId,
      },
    });
  }

  // Orçamentos do mês
  await prisma.budget.upsert({
    where: { categoryId_userId_month_year: { categoryId: catAlim.id, userId: user1.id, month: mes + 1, year: ano } },
    update: {},
    create: { id: 'seed-bud-1', amount: 800, month: mes + 1, year: ano, categoryId: catAlim.id, userId: user1.id },
  });
  await prisma.budget.upsert({
    where: { categoryId_userId_month_year: { categoryId: catTransp.id, userId: user1.id, month: mes + 1, year: ano } },
    update: {},
    create: { id: 'seed-bud-2', amount: 400, month: mes + 1, year: ano, categoryId: catTransp.id, userId: user1.id },
  });
  await prisma.budget.upsert({
    where: { categoryId_userId_month_year: { categoryId: catLazer.id, userId: user1.id, month: mes + 1, year: ano } },
    update: {},
    create: { id: 'seed-bud-3', amount: 300, month: mes + 1, year: ano, categoryId: catLazer.id, userId: user1.id },
  });

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('👤 Login 1: joao@casalfinan.com / 123456');
  console.log('👤 Login 2: maria@casalfinan.com / 123456');
  console.log('💑 Casal: João & Maria (código: DEMO1234)');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
