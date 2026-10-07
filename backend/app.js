const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { generalLimiter } = require('./middleware/rateLimiter');

// The Express app only: no env loading, DB connection or listening here, so tests can mount it.
// (server.js loads env vars first, then requires this file, then connects and listens.)
const app = express();

// Trust proxy for Render/Vercel reverse proxies (fixes rate limiter error)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Gzip compression for all responses
app.use(compression());

// CORS — only allow known origins
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL, // Set this to your Vercel URL in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// Limit request body to 100kb (routine schedules with many exercises exceed 10kb)
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter);

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/routines', require('./routes/routineRoutes'));
app.use('/api/exercises', require('./routes/exerciseRoutes'));
app.use('/api/workouts', require('./routes/workoutRoutes'));
app.use('/api/nutrition', require('./routes/nutritionRoutes'));
app.use('/api/foods', require('./routes/foodRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

module.exports = app;
