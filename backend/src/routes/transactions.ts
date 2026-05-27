import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

const transactionSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  date: z.string(),
  notes: z.string().optional(),
  isPaid: z.boolean().default(true),
  isShared: z.boolean().default(false),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  categoryId: z.string().uuid(),
  creditCardId: z.string().uuid().optional().nullable(),
  billId: z.string().uuid().optional().nullable(),
});

// List transactions
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year, type, categoryId, userId: filterUserId } = req.query;

    // Get all users in the couple
    let userIds = [req.user!.id];
    if (req.user!.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.user!.coupleId },
        include: { members: { select: { id: true } } },
      });
      if (couple) userIds = couple.members.map(m => m.id);
    }

    const where: Record<string, unknown> = {
      userId: filterUserId ? String(filterUserId) : { in: userIds },
    };

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    if (type) where.type = String(type);
    if (categoryId) where.categoryId = String(categoryId);

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true, avatar: true } },
        creditCard: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// Get single transaction
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
        creditCard: true,
      },
    });
    if (!transaction) { res.status(404).json({ error: 'Transação não encontrada' }); return; }
    res.json(transaction);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar transação' });
  }
});

// Create transaction
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = transactionSchema.parse(req.body);
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        creditCardId: data.creditCardId || null,
        billId: data.billId || null,
        userId: req.user!.id,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, color: true } },
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// Update transaction
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
    });
    if (!existing) { res.status(404).json({ error: 'Transação não encontrada' }); return; }

    const data = transactionSchema.partial().parse(req.body);
    const transaction = await prisma.transaction.update({
      where: { id: String(req.params['id']) },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
        creditCard: { select: { id: true, name: true, color: true } },
      },
    });
    res.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// Delete transaction
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
    });
    if (!existing) { res.status(404).json({ error: 'Transação não encontrada' }); return; }
    await prisma.transaction.delete({ where: { id: String(req.params['id']) } });
    res.json({ message: 'Transação excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

// Toggle paid status
router.patch('/:id/toggle-paid', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
    });
    if (!existing) { res.status(404).json({ error: 'Transação não encontrada' }); return; }
    const transaction = await prisma.transaction.update({
      where: { id: String(req.params['id']) },
      data: { isPaid: !existing.isPaid },
      include: { category: true, user: { select: { id: true, name: true } } },
    });
    res.json(transaction);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

export default router;
