import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

const cardSchema = z.object({
  name: z.string().min(1),
  bank: z.string().min(1),
  limit: z.number().positive(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  color: z.string(),
  coupleShared: z.boolean().default(false),
});

// List cards
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

    const cards = await prisma.creditCard.findMany({
      where: { OR: [{ userId: { in: userIds } }, { coupleShared: true }] },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// Get card with invoice
router.get('/:id/invoice', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const card = await prisma.creditCard.findFirst({
      where: { id: String(req.params['id']), userId: req.user!.id },
    });
    if (!card) { res.status(404).json({ error: 'Cartão não encontrado' }); return; }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        creditCardId: card.id,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true, user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    res.json({ card, transactions, total, month, year });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar fatura' });
  }
});

// Create card
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = cardSchema.parse(req.body);
    const card = await prisma.creditCard.create({
      data: { ...data, userId: req.user!.id },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(card);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

// Update card
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const card = await prisma.creditCard.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!card) { res.status(404).json({ error: 'Cartão não encontrado' }); return; }
    const data = cardSchema.partial().parse(req.body);
    const updated = await prisma.creditCard.update({ where: { id: String(req.params['id']) }, data });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar cartão' });
  }
});

// Delete card
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const card = await prisma.creditCard.findFirst({ where: { id: String(req.params['id']), userId: req.user!.id } });
    if (!card) { res.status(404).json({ error: 'Cartão não encontrado' }); return; }
    await prisma.creditCard.delete({ where: { id: String(req.params['id']) } });
    res.json({ message: 'Cartão excluído' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir cartão' });
  }
});

export default router;
