// server/src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { query } from '../config/db.js';

/**
 * Verify access token and attach user to req.user.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtAccessSecret);

    // Optional: fetch user from DB to ensure they still exist
    const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      throw new ApiError(401, 'User no longer exists');
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(new ApiError(401, error.message || 'Invalid access token'));
  }
}

/**
 * Restrict to specific roles.
 * Usage: authorize('instructor', 'admin')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission'));
    }
    next();
  };
}