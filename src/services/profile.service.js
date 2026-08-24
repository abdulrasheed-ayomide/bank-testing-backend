import User from '../models/User.js';
import AppError from '../utils/AppError.js';

const EDITABLE_FIELDS = ['firstName', 'lastName', 'phone'];

export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user;
}

/**
 * Only firstName, lastName, and phone can be changed here. Account number,
 * balance, and account status are deliberately not editable through this
 * endpoint — no field name from the request body outside EDITABLE_FIELDS
 * is ever applied, so a crafted request body can't smuggle in a balance
 * or status change.
 */
export async function updateProfile(userId, updates) {
  const safeUpdates = {};
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) safeUpdates[field] = updates[field];
  }

  const user = await User.findByIdAndUpdate(userId, safeUpdates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new AppError('User not found.', 404);
  return user;
}
