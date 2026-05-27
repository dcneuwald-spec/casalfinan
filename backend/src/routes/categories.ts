import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  type: z.enum(['income', 'expense', 'both']),
});

// List categories
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user!.coupleId) {
      res.status(400).json({ error: 'Você precisa fazer parte de um casal' });
      return;
    }
    const categories = await prisma.category.findMany({
      where: { coupleId: req.user!.coupleId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Create category
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user!.coupleId) {
      res.status(400).json({ error: 'Você precisa fazer parte de um casal' });
      return;
    }
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: { ...data, coupleId: req.user!.coupleId },
    });
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.findFirst({
      where: { id: String(req.params['id']), coupleId: req.user!.coupleId || '' },
    });
    if (!category) { res.status(404).json({ error: 'Categoria não encontrada' }); return; }
    const updated = await prisma.category.update({ where: { id: String(req.params['id']) }, data });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await prisma.category.findFirst({
      where: { id: String(req.params['id']), coupleId: req.user!.coupleId || '' },
    });
    if (!category) { res.status(404).json({ error: 'Categoria não encontrada' }); return; }
    await prisma.category.delete({ where: { id: String(req.params['id']) } });
    res.json({ message: 'Categoria excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

export default router;
