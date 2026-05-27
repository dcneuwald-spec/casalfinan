import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

const billSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  categoryId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  isShared: z.boolean().default(false),
});

// List bills
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let userIds = [req.user!.id];
    if (req.user!.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.user!.coupleId },
        include: { members: { select: { id: true } } },
      });
      if (couple) userIds = couple.members.map(m => m.id);
    }

    const bills = await prisma.bill.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { dueDay: 'asc' },
    });
    res.json(bills);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
});

// Create bill
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = billSchema.parse(req.body);
    const bill = await prisma.bill.create({
      data: { ...data, userId: req.user!.id },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(bill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// Update bill
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!bill) { res.status(404).json({ error: 'Conta não encontrada' }); return; }
    const data = billSchema.partial().parse(req.body);
    const updated = await prisma.bill.update({ where: { id: String(req.params['id']) }, data });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

// Delete bill
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!bill) { res.status(404).json({ error: 'Conta não encontrada' }); return; }
    await prisma.bill.delete({ where: { id: String(req.params['id']) } });
    res.json({ message: 'Conta excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

// Pay bill (create transaction)
router.post('/:id/pay', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bill = await prisma.bill.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!bill) { res.status(404).json({ error: 'Conta não encontrada' }); return; }

    const { date, categoryId } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        description: `Pagamento: ${bill.description}`,
        amount: bill.amount,
        type: 'expense',
        date: date ? new Date(date) : new Date(),
        isPaid: true,
        isShared: bill.isShared,
        recurrence: 'none',
        userId: req.user!.id,
        categoryId: categoryId || bill.categoryId || '',
        billId: bill.id,
      },
      include: { category: true, user: { select: { id: true, name: true } } },
    });
    res.status(201).json(transaction);
  } catch {
    res.status(500).json({ error: 'Erro ao pagar conta' });
  }
});

export default router;
