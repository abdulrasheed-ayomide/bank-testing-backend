import rateLimit from 'express-rate-limit';

function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });
}

// General API traffic.
export const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please try again shortly.',
});

// Login attempts — brute force protection at the network level.
// (Per-account lockout in User.js is the second layer of defense.)
export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const adminLoginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many admin login attempts. Please try again in 15 minutes.',
});

export const otpLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Too many verification attempts. Please wait before requesting another code.',
});

export const transferPinLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many PIN attempts. Please try again later.',
});
