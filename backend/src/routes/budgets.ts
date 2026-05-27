import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

// List budgets
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.user!.id,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      },
      include: { category: true },
    });

    // Calculate spent for each budget
    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId: req.user!.id,
          categoryId: budget.categoryId,
          type: 'expense',
          date: {
            gte: new Date(budget.year, budget.month - 1, 1),
            lte: new Date(budget.year, budget.month, 0, 23, 59, 59),
          },
        },
        _sum: { amount: true },
      });
      return { ...budget, spent: spent._sum.amount || 0 };
    }));

    res.json(budgetsWithSpent);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// Upsert budget
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = z.object({
      amount: z.number().positive(),
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
      categoryId: z.string().uuid(),
    }).parse(req.body);

    const budget = await prisma.budget.upsert({
      where: {
        categoryId_userId_month_year: {
          categoryId: data.categoryId,
          userId: req.user!.id,
          month: data.month,
          year: data.year,
        },
      },
      create: { ...data, userId: req.user!.id },
      update: { amount: data.amount },
      include: { category: true },
    });
    res.json(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao salvar orçamento' });
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const budget = await prisma.budget.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!budget) { res.status(404).json({ error: 'Orçamento não encontrado' }); return; }
    await prisma.budget.delete({ where: { id: String(req.params['id']) } });
    res.json({ message: 'Orçamento excluído' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});

export default router;
