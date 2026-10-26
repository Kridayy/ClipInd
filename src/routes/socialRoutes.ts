import { Router } from 'express';
import { getAuthUrl, handleCallback, getAccounts, disconnectAccount } from '../controllers/socialController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/auth/:platform', getAuthUrl);
router.get('/callback/:platform', handleCallback); // In real OAuth this would not requireAuth via JWT, but via state cookie, however for MVP we assume client calls it with token. Or we can just mock it.
router.get('/accounts', getAccounts);
router.delete('/accounts/:id', disconnectAccount);

export default router;
