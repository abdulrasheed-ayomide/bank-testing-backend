import crypto from 'crypto';

/**
 * Generates a reference like SFB-TX-4821093. Uniqueness is enforced by the
 * Transaction model's unique index — this just needs to be collision-unlikely,
 * not cryptographically guaranteed, since a collision simply fails the
 * insert and the caller can retry.
 */
export function generateTransactionReference() {
  const random = crypto.randomInt(100000, 999999);
  return `SFB-TX-${random}`;
}
