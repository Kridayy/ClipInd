import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getWallet,
  getTransactions,
  getMethods,
  addMethod,
  removeMethod,
  getPayouts,
  requestPayout,
} from '../controllers/walletController';

const router = Router();

router.get('/', requireAuth, getWallet);
router.get('/transactions', requireAuth, getTransactions);
router.get('/methods', requireAuth, getMethods);
router.post('/methods', requireAuth, addMethod);
router.delete('/methods/:id', requireAuth, removeMethod);
router.get('/payouts', requireAuth, getPayouts);
router.post('/payout', requireAuth, requestPayout);

export default router;
