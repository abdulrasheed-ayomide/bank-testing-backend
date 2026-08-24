export function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(res, message = 'Something went wrong.', statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}
