import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import { getAccountByUserId, getAccountByNumber } from '../services/account.service.js';

export const getMyAccount = catchAsync(async (req, res) => {
  const account = await getAccountByUserId(req.user._id);
  if (!account) throw new AppError('No account found for this user.', 404);
  return sendSuccess(res, { account });
});

export const getMyBalances = catchAsync(async (req, res) => {
  const account = await getAccountByUserId(req.user._id);
  if (!account) throw new AppError('No account found for this user.', 404);

  // Only the base-currency balance is authoritative. Display-currency
  // conversion belongs in a dedicated exchange-rate integration (Phase 4+),
  // not hardcoded here — see project spec, "Balances and currencies".
  return sendSuccess(res, {
    baseCurrency: account.baseCurrency,
    balance: account.balance,
  });
});

/**
 * Used by the Send Money flow to validate a recipient before showing the
 * transfer preview. Deliberately returns only name + status — never the
 * recipient's balance or any other private information.
 */
export const lookupAccount = catchAsync(async (req, res) => {
  const { accountNumber } = req.params;
  if (!/^1\d{8}$/.test(accountNumber)) {
    throw new AppError('Enter a valid 9-digit account number.', 400);
  }

  const account = await getAccountByNumber(accountNumber);
  if (!account || account.status !== 'ACTIVE') {
    throw new AppError('No active account found with this number.', 404);
  }

  return sendSuccess(res, {
    accountNumber: account.accountNumber,
    firstName: account.user.firstName,
    lastName: account.user.lastName,
    status: account.status,
  });
});
