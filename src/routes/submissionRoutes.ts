import { Router } from 'express';
import {
  getMySubmissions,
  getSubmissionById,
  approveSubmission,
  rejectSubmission,
  requestChanges
} from '../controllers/submissionController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// Submissions router
router.get('/', requireAuth, requireRole(['CLIPPER']), getMySubmissions);
router.get('/:id', requireAuth, getSubmissionById);
router.post('/:id/approve', requireAuth, requireRole(['BUSINESS']), approveSubmission);
router.post('/:id/reject', requireAuth, requireRole(['BUSINESS']), rejectSubmission);
router.post('/:id/request-changes', requireAuth, requireRole(['BUSINESS']), requestChanges);

export default router;
