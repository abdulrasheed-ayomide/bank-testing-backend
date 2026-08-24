import bcrypt from 'bcrypt';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Verifies a submitted transaction PIN against the user's stored hash.
 * Never called from the frontend's judgment — the frontend never decides
 * whether a PIN is correct, only the backend does (see project rules).
 */
export async function verifyTransactionPin(userId, submittedPin) {
  const user = await User.findById(userId).select(
    '+transactionPinHash +failedPinAttempts +pinLockUntil'
  );
  if (!user) throw new AppError('User not found.', 404);

  if (user.pinLockUntil && user.pinLockUntil > new Date()) {
    const minutesLeft = Math.ceil((user.pinLockUntil - new Date()) / 60000);
    throw new AppError(
      `Too many incorrect PIN attempts. Try again in ${minutesLeft} minute(s).`,
      423
    );
  }

  const isMatch = await bcrypt.compare(submittedPin, user.transactionPinHash);
  if (!isMatch) {
    user.failedPinAttempts += 1;
    if (user.failedPinAttempts >= LOCK_THRESHOLD) {
      user.pinLockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedPinAttempts = 0;
    }
    await user.save();
    throw new AppError('Incorrect transaction PIN.', 401);
  }

  user.failedPinAttempts = 0;
  user.pinLockUntil = null;
  await user.save();
  return true;
}
