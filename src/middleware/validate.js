import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export default function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const first = errors.array()[0];
  next(new AppError(first.msg, 422));
}
