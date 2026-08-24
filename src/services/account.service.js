import Account from '../models/Account.js';
import { generateUniqueAccountNumber } from '../utils/generateAccountNumber.js';

/**
 * Creates the user's primary account. Called once, right after email
 * verification succeeds — never at registration time, since an account
 * shouldn't exist until identity is confirmed.
 */
export async function createAccountForUser(userId) {
  const accountNumber = await generateUniqueAccountNumber();
  return Account.create({
    user: userId,
    accountNumber,
    baseCurrency: 'USD',
    balance: 0,
    status: 'ACTIVE',
  });
}

export async function getAccountByUserId(userId) {
  return Account.findOne({ user: userId });
}

export async function getAccountByNumber(accountNumber) {
  return Account.findOne({ accountNumber }).populate('user', 'firstName lastName status');
}
