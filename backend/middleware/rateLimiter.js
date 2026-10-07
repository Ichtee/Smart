const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Integration tests make many requests from one IP; limiters are skipped when NODE_ENV === 'test'
// (read at request time so a test can switch it off to exercise the limiter itself).
const skipInTests = () => process.env.NODE_ENV === 'test';

// Key by authenticated user when the JWT is valid (cheap verify, no DB hit), otherwise by IP.
// Users behind the same NAT no longer share one bucket.
const userOrIpKey = (req) => {
  const header = req.headers.authorization;
  const token = (req.cookies && req.cookies.token) ||
    (header && header.startsWith('Bearer ') ? header.split(' ')[1] : null);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.id) return `user:${decoded.id}`;
    } catch (e) {
      // invalid token -> fall back to IP
    }
  }
  return ipKeyGenerator(req.ip);
};

// General API rate limit: 1000 requests per 15 minutes per user (or IP when anonymous)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  skip: skipInTests,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Login rate limit: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

// Register rate limit: 5 accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP. Please try again after an hour.' },
});

// Emailed-link endpoints (resend verification, finish sign-up, reset password): 10 per 15 minutes per IP.
// Resending is the one that can be turned into email spam against someone else's inbox.
const emailFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again after 15 minutes.' },
});

module.exports = { generalLimiter, loginLimiter, registerLimiter, emailFlowLimiter, userOrIpKey };
