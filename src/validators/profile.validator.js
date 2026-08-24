import { body } from 'express-validator';

export const updateProfileValidator = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty.'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty.'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('Enter a valid phone number.'),
];
