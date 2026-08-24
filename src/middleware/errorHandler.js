import env from '../config/env.js';

export default function errorHandler(err, req, res, _next) {
  const isOperational = err.isOperational === true;
  const statusCode = isOperational ? err.statusCode : 500;

  // Never leak stack traces, driver errors, or internal details to the client.
  const message = isOperational
    ? err.message
    : 'Something went wrong on our end. Please try again.';

  if (!isOperational) {
    // Operational errors are expected (bad input, etc.) and not logged as errors.
    console.error('[unexpected error]', err);
  }

  if (env.nodeEnv !== 'production' && !isOperational) {
    return res.status(statusCode).json({ success: false, message, stack: err.stack });
  }

  return res.status(statusCode).json({ success: false, message });
}
