import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const currentMonth = Number(month) || new Date().getMonth() + 1;
    const currentYear = Number(year) || new Date().getFullYear();

    let userIds = [req.user!.id];
    if (req.user!.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.user!.coupleId },
        include: { members: { select: { id: true, name: true, avatar: true } } },
      });
      if (couple) userIds = couple.members.map(m => m.id);
    }

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Totals
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: { in: userIds }, type: 'income', date: { gte: startDate, lte: endDate }, isPaid: true },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: { in: userIds }, type: 'expense', date: { gte: startDate, lte: endDate }, isPaid: true },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    // Expenses by category
    const expensesByCategory = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId: { in: userIds }, type: 'expense', date: { gte: startDate, lte: endDate }, isPaid: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: expensesByCategory.map(e => e.categoryId) } },
    });

    const expensesByCategoryWithDetails = expensesByCategory.map(e => ({
      ...e,
      category: categories.find(c => c.id === e.categoryId),
      amount: e._sum.amount || 0,
    }));

    // Monthly evolution (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: { in: userIds }, type: 'income', date: { gte: mStart, lte: mEnd }, isPaid: true },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: { in: userIds }, type: 'expense', date: { gte: mStart, lte: mEnd }, isPaid: true },
          _sum: { amount: true },
        }),
      ]);

      monthlyData.push({
        month: d.toLocaleString('pt-BR', { month: 'short' }),
        year: d.getFullYear(),
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
      });
    }

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: { in: userIds }, date: { gte: startDate, lte: endDate } },
      include: {
        category: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Pending bills
    const pendingTransactions = await prisma.transaction.findMany({
      where: { userId: { in: userIds }, isPaid: false, date: { gte: startDate, lte: endDate } },
      include: { category: true, user: { select: { id: true, name: true } } },
      orderBy: { date: 'asc' },
    });

    // Per user breakdown
    const userBreakdown = await Promise.all(userIds.map(async (uid) => {
      const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, avatar: true } });
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: uid, type: 'income', date: { gte: startDate, lte: endDate }, isPaid: true },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: uid, type: 'expense', date: { gte: startDate, lte: endDate }, isPaid: true },
          _sum: { amount: true },
        }),
      ]);
      return {
        user,
        income: inc._sum.amount || 0,
        expense: exp._sum.amount || 0,
        balance: (inc._sum.amount || 0) - (exp._sum.amount || 0),
      };
    }));

    res.json({
      summary: { totalIncome, totalExpense, balance, month: currentMonth, year: currentYear },
      expensesByCategory: expensesByCategoryWithDetails,
      monthlyEvolution: monthlyData,
      recentTransactions,
      pendingTransactions,
      userBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

export default router;
