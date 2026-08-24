import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyAccessToken } from '../utils/token.js';

/**
 * Protects user-facing routes. Never trusts the frontend's claim of who is
 * logged in — every request re-verifies the token and re-checks the user's
 * current status against the database (so a disabled account is rejected
 * even with a still-valid token).
 */
const protect = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('You must be logged in to access this resource.', 401));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError('Your session has expired. Please log in again.', 401));
  }

  if (payload.type !== 'access') {
    return next(new AppError('Invalid token type.', 401));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(new AppError('The account for this session no longer exists.', 401));
  }
  if (user.status !== 'ACTIVE') {
    return next(new AppError('This account has been disabled. Contact support.', 403));
  }

  req.user = user;
  next();
});

export default protect;
