// server/src/services/auth.service.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const SALT_ROUNDS = 12;

/**
 * Generate access token (short-lived).
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );
}

/**
 * Generate refresh token (long-lived) and save to DB.
 */
async function generateRefreshToken(user) {
  const refreshToken = jwt.sign(
    { id: user.id },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );

  // Store in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  return refreshToken;
}

/**
 * Register a new user.
 */
export async function register({ name, email, password, role }) {
  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ApiError(409, 'Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert user
  const result = await query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name, email, passwordHash, role]
  );
  const user = result.rows[0];
  return user;
}

/**
 * Login: verify credentials, return tokens.
 */
export async function login({ email, password }) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Refresh access token using a valid refresh token.
 */
export async function refreshAccessToken(oldRefreshToken) {
  // Verify JWT signature
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, env.jwtRefreshSecret);
  } catch (err) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // Check token exists in DB and not expired
  const result = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [oldRefreshToken]
  );
  if (result.rows.length === 0) {
    throw new ApiError(401, 'Refresh token not found or expired');
  }

  // Delete the old token (rotation)
  await query('DELETE FROM refresh_tokens WHERE token = $1', [oldRefreshToken]);

  // Get user data
  const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
  const user = userResult.rows[0];
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  // Issue new pair
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout: remove refresh token from DB.
 */
export async function logout(refreshToken) {
  if (!refreshToken) return;
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
}