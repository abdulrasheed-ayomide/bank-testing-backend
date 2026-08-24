import bcrypt from 'bcrypt';
import User from '../models/User.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { createOtp, verifyOtp } from './otp.service.js';
import { createAccountForUser, getAccountByUserId } from './account.service.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.service.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function registerUser({ firstName, lastName, email, phone, password, transactionPin }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const transactionPinHash = await bcrypt.hash(transactionPin, env.bcryptSaltRounds);

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    passwordHash,
    transactionPinHash,
    emailVerified: false,
    status: 'ACTIVE',
  });

  const { code, expiresMinutes } = await createOtp(user._id, 'EMAIL_VERIFICATION');
  const emailResult = await sendVerificationEmail({ to: email, firstName, otp: code, expiresMinutes });
  if (!emailResult.delivered && !emailResult.devMode) {
    // Per project rules: an email failure must never corrupt account state.
    // The account still exists and the user can request a fresh code via /auth/resend-otp.
    console.error(`[auth] Verification email failed to send for ${email}`);
  }

  return { email: user.email };
}

export async function verifyUserEmail({ email, otp }) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with this email.', 404);
  if (user.emailVerified) throw new AppError('This email is already verified.', 400);

  await verifyOtp(user._id, 'EMAIL_VERIFICATION', otp);

  user.emailVerified = true;
  const account = await createAccountForUser(user._id);

  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = await bcrypt.hash(refreshToken, env.bcryptSaltRounds);
  await user.save();

  return { user, account, accessToken, refreshToken };
}

export async function resendOtp({ email, purpose }) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with this email.', 404);

  if (purpose === 'EMAIL_VERIFICATION' && user.emailVerified) {
    throw new AppError('This email is already verified.', 400);
  }

  const { code, expiresMinutes } = await createOtp(user._id, purpose);

  if (purpose === 'EMAIL_VERIFICATION') {
    await sendVerificationEmail({ to: email, firstName: user.firstName, otp: code, expiresMinutes });
  } else {
    await sendPasswordResetEmail({ to: email, firstName: user.firstName, otp: code, expiresMinutes });
  }

  return true;
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select(
    '+passwordHash +failedLoginAttempts +lockUntil'
  );

  // Same error message whether the email doesn't exist or the password is
  // wrong — never reveal which one it was, to avoid leaking valid emails.
  const invalidCredentialsError = new AppError('Invalid email or password.', 401);

  if (!user) throw invalidCredentialsError;

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw new AppError(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`, 423);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOCK_THRESHOLD) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw invalidCredentialsError;
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError('This account has been disabled. Contact support.', 403);
  }
  if (!user.emailVerified) {
    throw new AppError('Please verify your email before logging in.', 403);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = await bcrypt.hash(refreshToken, env.bcryptSaltRounds);
  await user.save();

  const account = await getAccountByUserId(user._id);

  return { user, account, accessToken, refreshToken };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new AppError('No refresh token provided.', 401);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Your session has expired. Please log in again.', 401);
  }
  if (payload.type !== 'refresh') throw new AppError('Invalid token type.', 401);

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw new AppError('Session no longer valid. Please log in again.', 401);
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    // Refresh token reuse/mismatch — revoke the session outright.
    user.refreshTokenHash = null;
    await user.save();
    throw new AppError('Session invalid. Please log in again.', 401);
  }

  // Rotate the refresh token on every use.
  const newAccessToken = signAccessToken(user._id.toString());
  const newRefreshToken = signRefreshToken(user._id.toString());
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, env.bcryptSaltRounds);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(userId) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}

export async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  // Always resolve successfully even if the email doesn't exist, so the
  // endpoint can't be used to enumerate registered accounts.
  if (!user) return true;

  const { code, expiresMinutes } = await createOtp(user._id, 'PASSWORD_RESET');
  await sendPasswordResetEmail({ to: email, firstName: user.firstName, otp: code, expiresMinutes });
  return true;
}

export async function resetPassword({ email, otp, newPassword }) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No account found with this email.', 404);

  await verifyOtp(user._id, 'PASSWORD_RESET', otp);

  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  // Invalidate any existing session — a password reset should force re-login everywhere.
  user.refreshTokenHash = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  return true;
}
