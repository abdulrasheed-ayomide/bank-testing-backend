import { Router } from 'express';
import * as accountController from '../controllers/account.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);
router.get('/me', accountController.getMyAccount);
router.get('/balances', accountController.getMyBalances);
router.get('/lookup/:accountNumber', accountController.lookupAccount);

export default router;
