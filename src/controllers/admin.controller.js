import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as adminService from '../services/admin.service.js';

export const adminLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { token, email: adminEmail } = await adminService.loginAdmin({ email, password });
  return sendSuccess(res, { token, admin: { email: adminEmail } });
});

export const adminLogout = catchAsync(async (_req, res) => {
  // Admin sessions are stateless JWTs (no server-side session to clear yet);
  // the client simply discards the token. Kept as a real endpoint so the
  // API contract and any future token-blacklisting logic have a home.
  return sendSuccess(res, { message: 'Logged out.' });
});

export const adminMe = catchAsync(async (req, res) => {
  return sendSuccess(res, { admin: req.admin });
});

export const listUsers = catchAsync(async (req, res) => {
  const users = await adminService.listUsers({ query: req.query.q });
  return sendSuccess(res, { users });
});

export const getUserDetail = catchAsync(async (req, res) => {
  const detail = await adminService.getUserDetail(req.params.id);
  return sendSuccess(res, detail);
});

export const setUserStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const user = await adminService.setUserStatus(req.params.id, status, req.admin.email);
  return sendSuccess(res, { user });
});

export const creditAccount = catchAsync(async (req, res) => {
  const { amount, currency, description } = req.body;
  const transaction = await adminService.creditAccount({
    accountId: req.params.id,
    amount: Number(amount),
    currency,
    description,
    adminEmail: req.admin.email,
  });
  return sendSuccess(res, { transaction }, 201);
});

export const listTransactions = catchAsync(async (_req, res) => {
  const transactions = await adminService.listAllTransactions();
  return sendSuccess(res, { transactions });
});

export const listAuditLogs = catchAsync(async (_req, res) => {
  const logs = await adminService.listAuditLogs();
  return sendSuccess(res, { logs });
});

export const getOverview = catchAsync(async (_req, res) => {
  const overview = await adminService.getOverview();
  return sendSuccess(res, overview);
});
