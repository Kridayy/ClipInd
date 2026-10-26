import { Router } from 'express';
import { getReports, updateReport, getUsers, suspendUser, getCampaigns, getSubmissions, getPayouts, updatePayout, getTransactions } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

router.get('/users', getUsers);
router.post('/users/:id/suspend', suspendUser);

router.get('/campaigns', getCampaigns);
router.get('/submissions', getSubmissions);

router.get('/payouts', getPayouts);
router.patch('/payouts/:id', updatePayout);

router.get('/transactions', getTransactions);

export default router;
