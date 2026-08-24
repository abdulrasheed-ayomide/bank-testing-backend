import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';
import env from '../config/env.js';

const REFRESH_COOKIE_NAME = 'sfb_refresh_token';

// In local dev, frontend (localhost:5173) and backend (localhost:5000) are
// same-site (same "localhost", different port), so `sameSite: 'lax'` works.
// In production, frontend (Vercel) and backend (Render) are on completely
// different domains — a genuinely cross-site request — so the cookie needs
// `sameSite: 'none'` (which requires `secure: true`) or the browser will
// silently never send it, breaking session persistence only in production.
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT_REFRESH_EXPIRES default
};

export const register = catchAsync(async (req, res) => {
  const result = await authService.registerUser(req.body);
  return sendSuccess(res, result, 201);
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { user, account, accessToken, refreshToken } = await authService.verifyUserEmail(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user, account, accessToken });
});

export const resendOtpHandler = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body);
  return sendSuccess(res, { message: 'A new code has been sent.' });
});

export const login = catchAsync(async (req, res) => {
  const { user, account, accessToken, refreshToken } = await authService.loginUser(req.body);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user, account, accessToken });
});

export const refresh = catchAsync(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken } = await authService.refreshSession(incomingToken);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return sendSuccess(res, { accessToken });
});

export const logout = catchAsync(async (req, res) => {
  if (req.user) {
    await authService.logoutUser(req.user._id);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  return sendSuccess(res, { message: 'Logged out.' });
});

export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);
  // Always return the same success message — see auth.service for why.
  return sendSuccess(res, {
    message: 'If an account exists for this email, a reset code has been sent.',
  });
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  return sendSuccess(res, { message: 'Password updated. You can now log in.' });
});
