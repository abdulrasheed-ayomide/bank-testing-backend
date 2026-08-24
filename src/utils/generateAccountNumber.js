import crypto from 'crypto';
import Account from '../models/Account.js';

/**
 * Generates a 9-digit account number starting with "1".
 * The remaining 8 digits are drawn from a cryptographically secure
 * random source, not Math.random(), since account numbers double as
 * a lookup key for money transfers.
 */
function generateCandidate() {
  const randomDigits = crypto.randomInt(0, 100000000).toString().padStart(8, '0');
  return `1${randomDigits}`;
}

/**
 * Generates a guaranteed-unique account number by checking against the
 * database and retrying on collision. Collisions are astronomically rare
 * at this address space (10^8 possibilities) but we never assume uniqueness
 * without checking — duplicate account numbers would be a critical bug in
 * a banking application.
 */
export async function generateUniqueAccountNumber() {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidate();
    const existing = await Account.findOne({ accountNumber: candidate }).lean();
    if (!existing) return candidate;
  }

  throw new Error('Unable to generate a unique account number after multiple attempts.');
}
