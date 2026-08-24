import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('phone').trim().isLength({ min: 7, max: 20 }).withMessage('Enter a valid phone number.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter.')
    .matches(/\d/)
    .withMessage('Password must contain at least one number.'),
  body('transactionPin')
    .isLength({ min: 4, max: 4 })
    .withMessage('Transaction PIN must be exactly 4 digits.')
    .isNumeric()
    .withMessage('Transaction PIN must be numeric.'),
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

export const verifyEmailValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code.'),
];

export const resendOtpValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('purpose')
    .isIn(['EMAIL_VERIFICATION', 'PASSWORD_RESET'])
    .withMessage('Invalid OTP purpose.'),
];

export const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit reset code.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter.')
    .matches(/\d/)
    .withMessage('Password must contain at least one number.'),
];
