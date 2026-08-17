const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// Load env vars
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

// Connect to database
connectDB();

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

// Limit request body to 10kb to prevent payload-based DoS
app.use(express.json({ limit: '10kb' }));
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
