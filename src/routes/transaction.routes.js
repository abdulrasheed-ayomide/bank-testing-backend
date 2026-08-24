import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller.js';
import protect from '../middleware/auth.middleware.js';
import { transferPinLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { transferValidator, listTransactionsValidator } from '../validators/transaction.validator.js';

const router = Router();

router.use(protect);

router.get('/', listTransactionsValidator, validate, transactionController.listMyTransactions);
router.get('/:id', transactionController.getMyTransaction);
router.post(
  '/transfer',
  transferPinLimiter,
  transferValidator,
  validate,
  transactionController.transfer
);

export default router;
