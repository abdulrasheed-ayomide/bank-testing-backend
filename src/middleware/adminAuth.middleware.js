import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyAdminToken } from '../utils/token.js';
import env from '../config/env.js';

const protectAdmin = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Admin authentication required.', 401));
  }

  let payload;
  try {
    payload = verifyAdminToken(token);
  } catch {
    return next(new AppError('Your admin session has expired. Please log in again.', 401));
  }

  if (payload.type !== 'admin' || payload.sub !== env.admin.email) {
    return next(new AppError('Invalid admin token.', 401));
  }

  req.admin = { email: payload.sub };
  next();
});

export default protectAdmin;
