import { Router } from 'express';
import { getClipperAnalytics, getBusinessAnalytics, getCampaignAnalytics, getSubmissionAnalytics } from '../controllers/analyticsController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/clipper', requireRole(['CLIPPER']), getClipperAnalytics);
router.get('/business', requireRole(['BUSINESS']), getBusinessAnalytics);
router.get('/campaigns/:id', requireRole(['BUSINESS']), getCampaignAnalytics);
router.get('/submissions/:id', getSubmissionAnalytics);

export default router;
