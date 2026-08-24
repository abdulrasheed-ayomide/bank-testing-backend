import crypto from 'crypto';

export function generateOtpCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}
