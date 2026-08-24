import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import { getAccountByUserId } from '../services/account.service.js';
import * as transactionService from '../services/transaction.service.js';

export const listMyTransactions = catchAsync(async (req, res) => {
  const account = await getAccountByUserId(req.user._id);
  if (!account) throw new AppError('No account found for this user.', 404);

  const transactions = await transactionService.getTransactionsForAccount(account._id, {
    type: req.query.type,
  });
  return sendSuccess(res, { transactions });
});

export const getMyTransaction = catchAsync(async (req, res) => {
  const account = await getAccountByUserId(req.user._id);
  if (!account) throw new AppError('No account found for this user.', 404);

  const transaction = await transactionService.getTransactionById(account._id, req.params.id);
  return sendSuccess(res, { transaction });
});

export const transfer = catchAsync(async (req, res) => {
  const account = await getAccountByUserId(req.user._id);
  if (!account) throw new AppError('No account found for this user.', 404);

  const { recipientAccountNumber, amount, currency, description, transactionPin } = req.body;

  const result = await transactionService.transferFunds({
    senderUserId: req.user._id,
    senderAccount: account,
    recipientAccountNumber,
    amount: Number(amount),
    currency,
    description,
    transactionPin,
  });

  return sendSuccess(res, result, 201);
});
