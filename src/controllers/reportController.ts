import { Request, Response } from 'express';
import { PrismaClient, ReportType } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const reportSchema = z.object({
  targetId: z.number().optional(),
  targetType: z.nativeEnum(ReportType),
  reason: z.string().min(1, 'Reason is required')
});

export const createReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = reportSchema.parse(req.body);

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetId: validatedData.targetId,
        targetType: validatedData.targetType,
        reason: validatedData.reason
      }
    });

    res.status(201).json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
