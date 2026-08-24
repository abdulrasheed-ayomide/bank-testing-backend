import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { signAdminToken } from '../utils/token.js';
import { generateTransactionReference } from '../utils/generateReference.js';
import { createNotification } from './notification.service.js';
import { sendCreditNotification } from './email.service.js';

export async function loginAdmin({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  // Constant-shape error regardless of which check fails, to avoid leaking
  // whether the email matched.
  const invalidError = new AppError('Invalid admin credentials.', 401);

  if (normalizedEmail !== env.admin.email) {
    throw invalidError;
  }

  const isMatch = await bcrypt.compare(password, env.admin.passwordHash);
  if (!isMatch) {
    throw invalidError;
  }

  const token = signAdminToken(env.admin.email);

  await AuditLog.create({
    action: 'ADMIN_LOGIN',
    admin: env.admin.email,
    target: null,
    metadata: {},
  });

  return { token, email: env.admin.email };
}

export async function listUsers({ query } = {}) {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  const accounts = await Account.find({ user: { $in: users.map((u) => u._id) } }).lean();
  const accountByUser = new Map(accounts.map((a) => [String(a.user), a]));

  const merged = users.map((u) => {
    const account = accountByUser.get(String(u._id));
    return {
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      accountNumber: account?.accountNumber || null,
      balance: account?.balance ?? 0,
    };
  });

  if (!query) return merged;

  const q = query.trim().toLowerCase();
  return merged.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.accountNumber}`.toLowerCase().includes(q)
  );
}

export async function getUserDetail(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);

  const account = await Account.findOne({ user: userId });
  const transactions = account
    ? await Transaction.find({ account: account._id }).sort({ createdAt: -1 }).limit(20)
    : [];

  return { user, account, transactions };
}

export async function setUserStatus(userId, status, adminEmail) {
  if (!['ACTIVE', 'DISABLED'].includes(status)) {
    throw new AppError('Invalid status.', 400);
  }

  const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
  if (!user) throw new AppError('User not found.', 404);

  await AuditLog.create({
    action: status === 'ACTIVE' ? 'USER_ENABLED' : 'USER_DISABLED',
    admin: adminEmail,
    target: user.email,
    metadata: { userId: String(user._id) },
  });

  return user;
}

/**
 * Credits a user's account. This is the ONLY way money enters the system in
 * this simulation — there is no user-facing deposit flow (see project rule
 * against fake deposits). Wrapped in a DB transaction even though it's a
 * single account update, so the balance change, the ledger Transaction
 * record, and the audit log are guaranteed to either all exist or none do.
 */
export async function creditAccount({ accountId, amount, currency, description, adminEmail }) {
  if (amount <= 0) throw new AppError('Credit amount must be greater than zero.', 400);

  const account = await Account.findById(accountId);
  if (!account) throw new AppError('Account not found.', 404);
  if (account.status !== 'ACTIVE') throw new AppError('This account is not active.', 400);
  if (currency !== account.baseCurrency) {
    throw new AppError(`This account can only be credited in ${account.baseCurrency}.`, 400);
  }

  const session = await mongoose.startSession();
  let transaction;

  try {
    await session.withTransaction(async () => {
      const updatedAccount = await Account.findOneAndUpdate(
        { _id: accountId, status: 'ACTIVE' },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!updatedAccount) throw new AppError('This account is not active.', 400);

      const docs = await Transaction.create(
        [
          {
            account: accountId,
            reference: generateTransactionReference(),
            direction: 'CREDIT',
            type: 'CREDIT',
            amount,
            currency,
            status: 'COMPLETED',
            description: description || 'Account credited by administrator',
            performedByAdmin: adminEmail,
          },
        ],
        { session }
      );
      transaction = docs[0];

      await AuditLog.create(
        [
          {
            action: 'ACCOUNT_CREDITED',
            admin: adminEmail,
            target: account.accountNumber,
            metadata: { amount, currency, transactionId: String(transaction._id) },
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  const user = await User.findById(account.user);
  await Promise.allSettled([
    createNotification({
      user: account.user,
      title: 'Account credited',
      body: `Your account was credited ${currency} ${amount.toFixed(2)} by the SFB administrator.`,
      relatedTransaction: transaction._id,
    }),
    sendCreditNotification({
      to: user.email,
      firstName: user.firstName,
      amount: amount.toFixed(2),
      currency,
      description,
    }),
  ]);

  return transaction;
}

export async function listAllTransactions() {
  return Transaction.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate({ path: 'account', select: 'accountNumber user', populate: { path: 'user', select: 'firstName lastName' } });
}

export async function listAuditLogs() {
  return AuditLog.find().sort({ createdAt: -1 }).limit(200);
}

export async function getOverview() {
  const [totalUsers, activeUsers, disabledUsers, totalTransactions] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'ACTIVE' }),
    User.countDocuments({ status: 'DISABLED' }),
    Transaction.countDocuments(),
  ]);

  return { totalUsers, activeUsers, disabledUsers, totalTransactions };
}

