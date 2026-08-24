import bcrypt from 'bcrypt';
import Otp from '../models/Otp.js';
import env from '../config/env.js';
import { generateOtpCode } from '../utils/generateOtp.js';
import AppError from '../utils/AppError.js';

/**
 * Creates a new OTP for the given user/purpose. Any previous unused OTPs
 * for that same purpose are invalidated first, so only the most recent
 * code is ever valid (prevents an old, leaked code from still working).
 */
export async function createOtp(userId, purpose) {
  await Otp.updateMany({ user: userId, purpose, consumed: false }, { consumed: true });

  const code = generateOtpCode();
  const otpHash = await bcrypt.hash(code, env.bcryptSaltRounds);
  const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

  await Otp.create({ user: userId, otpHash, purpose, expiresAt });

  return { code, expiresMinutes: env.otp.expiresMinutes };
}

/**
 * Verifies a submitted OTP code. Consumes the record on success so it
 * cannot be replayed. Tracks attempts to prevent brute-forcing 6-digit
 * codes via repeated guesses against a single OTP record.
 */
export async function verifyOtp(userId, purpose, submittedCode) {
  const otp = await Otp.findOne({ user: userId, purpose, consumed: false }).sort({ createdAt: -1 });

  if (!otp) {
    throw new AppError('No active verification code found. Please request a new one.', 400);
  }

  if (otp.expiresAt < new Date()) {
    throw new AppError('This code has expired. Please request a new one.', 400);
  }

  if (otp.attempts >= 5) {
    throw new AppError('Too many incorrect attempts. Please request a new code.', 429);
  }

  const isMatch = await bcrypt.compare(submittedCode, otp.otpHash);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    throw new AppError('That code is incorrect.', 400);
  }

  otp.consumed = true;
  await otp.save();
  return true;
}
