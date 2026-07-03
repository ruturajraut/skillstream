// server/src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

// --- Global Middleware ---
// 1. Security headers (helmet)
app.use(helmet());

// 2. CORS – allow requests from frontend (later we'll restrict to specific origin)
app.use(cors());

app.use(cookieParser());
// 3. Parse JSON request bodies
app.use(express.json());

app.use('/api/auth', authRoutes);



// 4. Log requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --- Routes placeholder ---
app.get('/', (req, res) => {
  res.json({ message: 'SkillStream API is running!' });
});

// --- 404 handler (if no route matched) ---
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // In development, we might want to see the stack trace
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;