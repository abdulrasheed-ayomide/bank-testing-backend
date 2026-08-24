import { body, query } from 'express-validator';

export const transferValidator = [
  body('recipientAccountNumber')
    .trim()
    .matches(/^1\d{8}$/)
    .withMessage('Enter a valid 9-digit account number.'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than zero.'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD'])
    .withMessage('Unsupported currency.'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description is too long.'),
  body('transactionPin')
    .isLength({ min: 4, max: 4 })
    .withMessage('Enter your 4-digit transaction PIN.')
    .isNumeric()
    .withMessage('PIN must be numeric.'),
];

export const listTransactionsValidator = [
  query('type')
    .optional()
    .isIn(['ALL', 'CREDIT', 'DEBIT', 'TRANSFER'])
    .withMessage('Invalid transaction filter.'),
];
