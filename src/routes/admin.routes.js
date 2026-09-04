import { Router } from 'express';
import { body } from 'express-validator';
import * as adminController from '../controllers/admin.controller.js';
import protectAdmin from '../middleware/adminAuth.middleware.js';
import { adminLoginLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { creditAccountValidator, setUserStatusValidator } from '../validators/admin.validator.js';

const router = Router();

const adminLoginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/login', adminLoginLimiter, adminLoginValidator, validate, adminController.adminLogin);
router.post('/logout', protectAdmin, adminController.adminLogout);
router.get('/me', protectAdmin, adminController.adminMe);

router.use(protectAdmin);

router.post(
  '/send-partnership-mail',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
    body('recipientName').optional().trim().notEmpty().withMessage('Recipient name is required.'),
    body('amount').optional().trim(),
    body('currency').optional().trim(),
    body('purpose').optional().trim(),
    body('depositDate').optional().trim(),
    body('paymentMethod').optional().trim(),
  ],
  validate,
  adminController.sendPartnershipMail
);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', setUserStatusValidator, validate, adminController.setUserStatus);

router.post('/accounts/:id/credit', creditAccountValidator, validate, adminController.creditAccount);

router.get('/transactions', adminController.listTransactions);
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/overview', adminController.getOverview);

export default router;
