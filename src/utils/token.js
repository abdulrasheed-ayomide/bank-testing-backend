import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

// Admin tokens are signed with a completely separate secret so a leaked
// user-session secret can never be used to forge admin access.
export function signAdminToken(email) {
  return jwt.sign({ sub: email, type: 'admin' }, env.jwt.adminSecret, {
    expiresIn: env.jwt.adminExpires,
  });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.jwt.adminSecret);
}
