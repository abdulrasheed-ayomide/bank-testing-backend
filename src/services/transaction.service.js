import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { generateTransactionReference } from '../utils/generateReference.js';
import { verifyTransactionPin } from './pin.service.js';
import { createNotification } from './notification.service.js';
import {
  sendTransferSentEmail,
  sendTransferReceivedEmail,
} from './email.service.js';

export async function getTransactionsForAccount(accountId, { type } = {}) {
  const filter = { account: accountId };
  if (type && type !== 'ALL') {
    if (type === 'TRANSFER') filter.type = 'TRANSFER';
    else filter.direction = type; // CREDIT or DEBIT
  }
  return Transaction.find(filter).sort({ createdAt: -1 });
}

export async function getTransactionById(accountId, transactionId) {
  const tx = await Transaction.findOne({ _id: transactionId, account: accountId });
  if (!tx) throw new AppError('Transaction not found.', 404);
  return tx;
}

/**
 * Performs a peer-to-peer transfer atomically: both balances update and
 * both ledger entries are written, or none of it happens. Uses MongoDB
 * multi-document transactions (requires a replica set — Atlas's free tier
 * qualifies) rather than manual rollback logic, which is easy to get wrong
 * under concurrent requests.
 *
 * Order of operations matters here and follows the project's required flow:
 * validate everything BEFORE touching any balance. The PIN is checked before
 * the transaction even starts, so a wrong PIN never partially executes anything.
 */
export async function transferFunds({
  senderUserId,
  senderAccount,
  recipientAccountNumber,
  amount,
  currency,
  description,
  transactionPin,
}) {
  // 1. PIN check happens first and outside the DB transaction — an incorrect
  //    PIN should never even open a transaction against the ledger.
  await verifyTransactionPin(senderUserId, transactionPin);

  // 2. Basic validation.
  if (amount <= 0) {
    throw new AppError('Transfer amount must be greater than zero.', 400);
  }
  if (currency !== senderAccount.baseCurrency) {
    // See project note: real fund movement only happens in the account's
    // base currency in V1. The currency selector on the frontend is a
    // display convenience; cross-currency transfers are a Phase 6+ feature
    // once a real exchange-rate provider is integrated.
    throw new AppError(
      `Transfers can currently only be made in ${senderAccount.baseCurrency}.`,
      400
    );
  }
  if (recipientAccountNumber === senderAccount.accountNumber) {
    throw new AppError('You cannot transfer money to your own account.', 400);
  }

  const recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber });
  if (!recipientAccount) {
    throw new AppError('No account found with this account number.', 404);
  }
  if (recipientAccount.status !== 'ACTIVE') {
    throw new AppError('The recipient account is not active.', 400);
  }
  if (senderAccount.status !== 'ACTIVE') {
    throw new AppError('Your account is not active.', 403);
  }

  const session = await mongoose.startSession();
  let debitTx;
  let creditTx;

  try {
    await session.withTransaction(async () => {
      // Atomic guarded debit: the balance >= amount condition is checked
      // and applied in the same database operation, so two concurrent
      // transfers can never both pass a balance check that only one of
      // them should have passed (the classic race condition in transfers).
      const debitedSender = await Account.findOneAndUpdate(
        { _id: senderAccount._id, balance: { $gte: amount }, status: 'ACTIVE' },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!debitedSender) {
        throw new AppError('Insufficient balance.', 400);
      }

      const creditedRecipient = await Account.findOneAndUpdate(
        { _id: recipientAccount._id, status: 'ACTIVE' },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!creditedRecipient) {
        throw new AppError('The recipient account is not active.', 400);
      }

      const transferGroupId = new mongoose.Types.ObjectId();
      const senderUser = await User.findById(senderUserId).session(session);
      const recipientUser = await User.findById(recipientAccount.user).session(session);

      const debitDocs = await Transaction.create(
        [
          {
            account: senderAccount._id,
            reference: generateTransactionReference(),
            direction: 'DEBIT',
            type: 'TRANSFER',
            amount,
            currency,
            status: 'COMPLETED',
            description,
            counterpartyAccountNumber: recipientAccount.accountNumber,
            counterpartyName: `${recipientUser.firstName} ${recipientUser.lastName}`,
            transferGroupId,
          },
        ],
        { session }
      );

      const creditDocs = await Transaction.create(
        [
          {
            account: recipientAccount._id,
            reference: generateTransactionReference(),
            direction: 'CREDIT',
            type: 'TRANSFER',
            amount,
            currency,
            status: 'COMPLETED',
            description,
            counterpartyAccountNumber: senderAccount.accountNumber,
            counterpartyName: `${senderUser.firstName} ${senderUser.lastName}`,
            transferGroupId,
          },
        ],
        { session }
      );

      debitTx = debitDocs[0];
      creditTx = creditDocs[0];
    });
  } finally {
    await session.endSession();
  }

  // 3. Side effects (email, in-app notifications) happen after the
  //    transaction has committed, and are never allowed to undo it — an
  //    email provider outage must not corrupt financial data (project rule).
  const senderUser = await User.findById(senderUserId);
  const recipientUser = await User.findById(recipientAccount.user);

  await Promise.allSettled([
    createNotification({
      user: senderUserId,
      title: 'Transfer sent',
      body: `You sent ${currency} ${amount.toFixed(2)} to ${recipientUser.firstName} ${recipientUser.lastName}.`,
      relatedTransaction: debitTx._id,
    }),
    createNotification({
      user: recipientAccount.user,
      title: 'Transfer received',
      body: `You received ${currency} ${amount.toFixed(2)} from ${senderUser.firstName} ${senderUser.lastName}.`,
      relatedTransaction: creditTx._id,
    }),
    sendTransferSentEmail({
      to: senderUser.email,
      firstName: senderUser.firstName,
      amount: amount.toFixed(2),
      currency,
      recipientName: `${recipientUser.firstName} ${recipientUser.lastName}`,
    }),
    sendTransferReceivedEmail({
      to: recipientUser.email,
      firstName: recipientUser.firstName,
      amount: amount.toFixed(2),
      currency,
      senderName: `${senderUser.firstName} ${senderUser.lastName}`,
    }),
  ]);

  return { debitTransaction: debitTx, creditTransaction: creditTx };
}
