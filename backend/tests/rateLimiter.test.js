const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { userOrIpKey, loginLimiter, routineLimiter, aiLimiter } = require('../middleware/rateLimiter');

const sign = (id, secret = process.env.JWT_SECRET) => jwt.sign({ id }, secret);

describe('userOrIpKey', () => {
  const key = (headers = {}, cookies = {}, ip = '203.0.113.7') => userOrIpKey({ headers, cookies, ip });

  test('a valid Bearer token is keyed by user id', () => {
    expect(key({ authorization: `Bearer ${sign('u1')}` })).toBe('user:u1');
  });

  test('a valid cookie token is keyed by user id', () => {
    expect(key({}, { token: sign('u2') })).toBe('user:u2');
  });

  test('two users behind the same IP get different buckets', () => {
    const a = key({ authorization: `Bearer ${sign('u1')}` });
    const b = key({ authorization: `Bearer ${sign('u2')}` });
    expect(a).not.toBe(b);
  });

  test('no token -> keyed by IP', () => {
    expect(key()).toBe('203.0.113.7');
  });

  test('a forged / wrongly signed / garbage token cannot pick its own bucket: falls back to the IP', () => {
    expect(key({ authorization: `Bearer ${sign('victim', 'attacker-secret')}` })).toBe('203.0.113.7');
    expect(key({ authorization: 'Bearer garbage' })).toBe('203.0.113.7');
    expect(key({}, { token: 'garbage' })).toBe('203.0.113.7');
  });

  test('a non-Bearer Authorization header is ignored', () => {
    expect(key({ authorization: `Basic ${sign('u1')}` })).toBe('203.0.113.7');
  });
});

describe('limiters', () => {
  const realEnv = process.env.NODE_ENV;
  // the project limiters are skipped when NODE_ENV === 'test'; switch that off for these tests
  beforeAll(() => { process.env.NODE_ENV = 'production'; });
  afterAll(() => { process.env.NODE_ENV = realEnv; });

  test('per-user buckets: one user hitting the limit does not block another on the same IP', async () => {
    const app = express();
    app.use(cookieParser());
    app.use(rateLimit({ windowMs: 60000, max: 3, keyGenerator: userOrIpKey, standardHeaders: true, legacyHeaders: false }));
    app.get('/ping', (req, res) => res.json({ ok: true }));

    const as = (id) => request(app).get('/ping').set('Authorization', `Bearer ${sign(id)}`);
    for (let i = 0; i < 3; i++) expect((await as('u1')).status).toBe(200);
    expect((await as('u1')).status).toBe(429);
    expect((await as('u2')).status).toBe(200);
  });

  test('loginLimiter: 5 failed attempts, then 429; successful logins are not counted', async () => {
    const app = express();
    app.post('/login', loginLimiter, (req, res) => res.status(req.query.ok ? 200 : 401).json({}));

    // 20 successful logins never trip the limiter
    for (let i = 0; i < 20; i++) expect((await request(app).post('/login?ok=1')).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await request(app).post('/login')).status).toBe(401);
    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many login attempts/);
  });

  test('routineLimiter: 2 generated routines per user per day; failed calls and other users are not counted', async () => {
    const app = express();
    app.post('/routine', routineLimiter, (req, res) => res.status(req.query.fail ? 502 : 200).json({}));
    const as = (id, q = '') => request(app).post(`/routine${q}`).set('Authorization', `Bearer ${sign(id)}`);

    for (let i = 0; i < 5; i++) expect((await as('u1', '?fail=1')).status).toBe(502); // AI errors cost nothing
    expect((await as('u1')).status).toBe(200);
    expect((await as('u1')).status).toBe(200);
    const blocked = await as('u1');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/2 lần/);
    expect((await as('u2')).status).toBe(200);
  });

  test('the pro plan has no AI limits: aiLimiter and routineLimiter let it through, a free user is still limited', async () => {
    const appFor = (plan) => {
      const app = express();
      app.use((req, res, next) => { req.user = { plan }; next(); });
      app.post('/routine', aiLimiter, routineLimiter, (req, res) => res.json({}));
      return app;
    };
    const pro = appFor('pro');
    for (let i = 0; i < 4; i++) expect((await request(pro).post('/routine')).status).toBe(200);
    const free = appFor('free');
    expect((await request(free).post('/routine')).status).toBe(200);
    expect((await request(free).post('/routine')).status).toBe(200);
    expect((await request(free).post('/routine')).status).toBe(429);
  });

  test('is skipped under NODE_ENV=test so the integration suites are not throttled', async () => {
    process.env.NODE_ENV = 'test';
    try {
      const app = express();
      app.post('/login', loginLimiter, (req, res) => res.status(401).json({}));
      for (let i = 0; i < 8; i++) expect((await request(app).post('/login')).status).toBe(401);
    } finally {
      process.env.NODE_ENV = 'production';
    }
  });
});
