import { body } from 'express-validator';

export const creditAccountValidator = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero.'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD'])
    .withMessage('Unsupported currency.'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description is too long.'),
];

export const setUserStatusValidator = [
  body('status').isIn(['ACTIVE', 'DISABLED']).withMessage('Status must be ACTIVE or DISABLED.'),
];
