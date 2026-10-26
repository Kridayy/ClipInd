import { Router } from 'express';
import { createReport } from '../controllers/reportController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/', requireAuth, createReport);

export default router;
