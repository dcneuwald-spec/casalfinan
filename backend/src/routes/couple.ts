import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { DEFAULT_CATEGORIES } from '../utils/defaultCategories';

const router = Router();

// Create couple
router.post('/create', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = z.object({ name: z.string().min(2) }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (user?.coupleId) {
      res.status(400).json({ error: 'Você já faz parte de um casal' });
      return;
    }

    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    const couple = await prisma.couple.create({
      data: {
        name,
        inviteCode,
        ownerId: req.user!.id,
        members: { connect: { id: req.user!.id } },
        categories: {
          create: DEFAULT_CATEGORIES,
        },
      },
      include: {
        members: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.status(201).json(couple);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar casal' });
  }
});

// Join couple
router.post('/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = z.object({ inviteCode: z.string() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (user?.coupleId) {
      res.status(400).json({ error: 'Você já faz parte de um casal' });
      return;
    }

    const couple = await prisma.couple.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { members: true },
    });

    if (!couple) {
      res.status(404).json({ error: 'Código de convite inválido' });
      return;
    }

    if (couple.members.length >= 2) {
      res.status(400).json({ error: 'Este casal já tem dois membros' });
      return;
    }

    if (couple.ownerId === req.user!.id) {
      res.status(400).json({ error: 'Você não pode entrar no seu próprio convite' });
      return;
    }

    const updatedCouple = await prisma.couple.update({
      where: { id: couple.id },
      data: { members: { connect: { id: req.user!.id } } },
      include: {
        members: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.json(updatedCouple);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao entrar no casal' });
  }
});

// Get couple info
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user!.coupleId) {
      res.status(404).json({ error: 'Você não faz parte de um casal' });
      return;
    }

    const couple = await prisma.couple.findUnique({
      where: { id: req.user!.coupleId },
      include: {
        members: { select: { id: true, name: true, email: true, avatar: true } },
        owner: { select: { id: true, name: true } },
      },
    });
    res.json(couple);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar casal' });
  }
});

// Leave couple
router.delete('/leave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user!.coupleId) {
      res.status(400).json({ error: 'Você não faz parte de um casal' });
      return;
    }

    const couple = await prisma.couple.findUnique({ where: { id: req.user!.coupleId } });
    if (!couple) { res.status(404).json({ error: 'Casal não encontrado' }); return; }

    if (couple.ownerId === req.user!.id) {
      // Owner deletes entire couple
      await prisma.couple.delete({ where: { id: couple.id } });
      res.json({ message: 'Casal excluído com sucesso' });
    } else {
      // Member leaves
      await prisma.couple.update({
        where: { id: couple.id },
        data: { members: { disconnect: { id: req.user!.id } } },
      });
      res.json({ message: 'Você saiu do casal' });
    }
  } catch {
    res.status(500).json({ error: 'Erro ao sair do casal' });
  }
});

export default router;
