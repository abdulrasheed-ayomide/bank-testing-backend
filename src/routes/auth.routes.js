import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import protect from '../middleware/auth.middleware.js';
import { loginLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', registerValidator, validate, authController.register);
router.post('/verify-email', otpLimiter, verifyEmailValidator, validate, authController.verifyEmail);
router.post('/resend-otp', otpLimiter, resendOtpValidator, validate, authController.resendOtpHandler);
router.post('/login', loginLimiter, loginValidator, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);
router.post('/forgot-password', otpLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', otpLimiter, resetPasswordValidator, validate, authController.resetPassword);

export default router;
