// server/src/controllers/auth.controller.js
import * as authService from '../services/auth.service.js';
import catchAsync from '../utils/catchAsync.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // set true if HTTPS
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ status: 'success', data: user });
});

export const login = catchAsync(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  // Send access token in response body (or also cookie, but we'll use header)
  res.json({
    status: 'success',
    data: { user, accessToken },
  });
});

export const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  const tokens = await authService.refreshAccessToken(token);
  res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
  res.json({ status: 'success', accessToken: tokens.accessToken });
});

export const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  await authService.logout(token);
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ status: 'success', message: 'Logged out' });
});