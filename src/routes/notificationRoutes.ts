import { Router } from 'express';
import { getNotifications, markRead, markNotificationRead } from '../controllers/notificationController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.post('/read-all', markRead);
router.post('/mark-read', markRead); // Keep for backwards compatibility
router.post('/:id/read', markNotificationRead);

export default router;
