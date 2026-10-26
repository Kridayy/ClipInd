import express from 'express';
import { getCampaigns, getCampaignById, getMyCampaigns, createCampaign, updateCampaignStatus } from '../controllers/campaignController';
import { createSubmission } from '../controllers/submissionController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = express.Router();

// Public / Clipper routes (needs login, but any role can view)
router.get('/', requireAuth, getCampaigns);
router.get('/:id', requireAuth, getCampaignById);

// Clipper routes
router.post('/:id/submissions', requireAuth, requireRole(['CLIPPER']), createSubmission);

// Business routes
router.post('/', requireAuth, requireRole(['BUSINESS']), createCampaign);
router.get('/business/me', requireAuth, requireRole(['BUSINESS']), getMyCampaigns);
router.post('/:id/:action', requireAuth, requireRole(['BUSINESS']), updateCampaignStatus);

export default router;
