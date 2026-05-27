import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

// Annual report
router.get('/annual', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const currentYear = Number(year) || new Date().getFullYear();

    let userIds = [req.user!.id];
    if (req.user!.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.user!.coupleId },
        include: { members: { select: { id: true } } },
      });
      if (couple) userIds = couple.members.map(m => m.id);
    }

    const data = [];
    for (let m = 1; m <= 12; m++) {
      const start = new Date(currentYear, m - 1, 1);
      const end = new Date(currentYear, m, 0, 23, 59, 59);

      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: { in: userIds }, type: 'income', date: { gte: start, lte: end }, isPaid: true },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: { in: userIds }, type: 'expense', date: { gte: start, lte: end }, isPaid: true },
          _sum: { amount: true },
        }),
      ]);

      data.push({
        month: m,
        monthName: new Date(currentYear, m - 1).toLocaleString('pt-BR', { month: 'long' }),
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
        balance: (inc._sum.amount || 0) - (exp._sum.amount || 0),
      });
    }

    const totalIncome = data.reduce((s, d) => s + d.income, 0);
    const totalExpense = data.reduce((s, d) => s + d.expense, 0);

    res.json({ year: currentYear, months: data, totalIncome, totalExpense, totalBalance: totalIncome - totalExpense });
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório anual' });
  }
});

// Category report
router.get('/categories', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year, type } = req.query;
    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const currentYear = Number(year) || new Date().getFullYear();

    let userIds = [req.user!.id];
    if (req.user!.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.user!.coupleId },
        include: { members: { select: { id: true } } },
      });
      if (couple) userIds = couple.members.map(m => m.id);
    }

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: { in: userIds },
        type: type ? String(type) : undefined,
        date: { gte: startDate, lte: endDate },
        isPaid: true,
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: grouped.map(g => g.categoryId) } },
    });

    const total = grouped.reduce((s, g) => s + (g._sum.amount || 0), 0);

    const result = grouped.map(g => ({
      category: categories.find(c => c.id === g.categoryId),
      amount: g._sum.amount || 0,
      count: g._count,
      percentage: total > 0 ? ((g._sum.amount || 0) / total) * 100 : 0,
    }));

    res.json({ data: result, total });
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório por categoria' });
  }
});

export default router;
