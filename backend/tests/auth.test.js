const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const User = require('../models/User');

// ---- EmailJS is called with global fetch from the controller: capture it instead of sending ----
let sentEmails;
const mockEmailOk = () => {
  sentEmails = [];
  global.fetch = jest.fn(async (url, options) => {
    sentEmails.push({ url, body: JSON.parse(options.body) });
    return { ok: true, status: 200, text: async () => 'OK' };
  });
};
const mockEmailFailing = () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 500, statusText: 'boom', text: async () => 'provider down' }));
};
const lastEmail = () => sentEmails[sentEmails.length - 1];
const tokenFromLink = (url) => url.split('token=')[1] || url.split('/').pop();

const valid = (over = {}) => ({
  name: 'Nguyễn Văn A',
  username: 'vana',
  email: 'vana@example.com',
  ...over,
});

const register = (body) => request(app).post('/api/users/register').send(body);
// step 2 of sign-up: whoever opens the emailed link chooses the password
const complete = (token, password) => request(app).post(`/api/users/verify/${token}`).send({ password });
const loginAs = (username, password) => request(app).post('/api/users/login').send({ username, password });
// register and return the token from the (mocked) verification email
const signup = async (over = {}) => {
  const res = await register(valid(over));
  const token = sentEmails.length ? tokenFromLink(lastEmail().body.template_params.verify_url) : null;
  return { res, token };
};

beforeAll(db.connect);
beforeEach(async () => {
  await db.clear();
  mockEmailOk();
});
afterAll(db.close);

describe('POST /api/users/register', () => {
  test('creates a pending account WITHOUT a password and emails a verification link', async () => {
    const res = await register(valid({ name: '  Nguyễn   Văn  A ', email: ' VanA@Example.COM ' }));
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('vana@example.com');

    const user = await User.findOne({ username: 'vana' }).lean();
    expect(user.name).toBe('Nguyễn Văn A'); // inner whitespace collapsed
    expect(user.email).toBe('vana@example.com');
    expect(user.isEmailVerified).toBe(false);
    expect(user.password).toBeUndefined(); // the owner of the email sets it later
    expect(user.role).toBe('user');

    // token expires ~10 minutes from now (TTL index deletes unverified accounts after that)
    const msLeft = new Date(user.verificationTokenExpires).getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(9 * 60 * 1000);
    expect(msLeft).toBeLessThanOrEqual(10 * 60 * 1000);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].url).toContain('emailjs.com');
    expect(sentEmails[0].body.template_params.to_email).toBe('vana@example.com');
    expect(sentEmails[0].body.template_params.verify_url).toBe(`http://localhost:3000/verify?token=${user.verificationToken}`);
  });

  test('a password sent with the sign-up form is ignored and never stored', async () => {
    await register(valid({ password: 'attackerpass1' }));
    const user = await User.findOne({ username: 'vana' }).lean();
    expect(user.password).toBeUndefined();
    expect(JSON.stringify(user)).not.toContain('attackerpass1');
  });

  test('never lets a client choose its own role', async () => {
    await register({ ...valid(), role: 'admin' });
    expect((await User.findOne({ username: 'vana' })).role).toBe('user');
  });

  test.each([
    ['missing email', { email: undefined }],
    ['name too short', { name: 'A' }],
    ['name too long', { name: 'A'.repeat(51) }],
    ['username with a space', { username: 'van a' }],
    ['username too short', { username: 'ab' }],
    ['username too long', { username: 'a'.repeat(31) }],
    ['username with symbols', { username: 'van@a' }],
    ['email without @', { email: 'vana.example.com' }],
    ['email with a space', { email: 'va na@example.com' }],
    ['name as an object', { name: { first: 'A' } }],
    ['email as an array', { email: ['vana@example.com'] }],
    ['username as a number', { username: 12345 }],
  ])('rejects %s', async (_label, over) => {
    const res = await register(valid(over));
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('refuses an email or username that belongs to a verified account', async () => {
    await createUser({ username: 'vana', email: 'vana@example.com' });
    expect((await register(valid())).status).toBe(400);
    expect((await register(valid({ username: 'other' }))).status).toBe(400); // same email
    expect((await register(valid({ email: 'other@example.com' }))).status).toBe(400); // same username
    expect(await User.countDocuments()).toBe(1);
  });

  describe('accounts that are still waiting for email verification', () => {
    const pendingAt = (offsetMs) => ({
      isEmailVerified: false,
      verificationToken: 'original-token',
      verificationTokenExpires: new Date(Date.now() + offsetMs),
    });
    const MINUTE = 60 * 1000;

    test('cannot be overwritten by a second sign-up with the same username (409, nothing changes)', async () => {
      await register(valid());
      const before = await User.findOne({ username: 'vana' }).lean();
      mockEmailOk();

      const res = await register(valid({ email: 'attacker@example.com', password: 'attackerpass1' }));
      expect(res.status).toBe(409);
      expect(res.body.pendingVerification).toBe(true);

      const after = await User.find({}).lean();
      expect(after).toHaveLength(1);
      expect(String(after[0]._id)).toBe(String(before._id));
      expect(after[0].email).toBe(before.email); // still the original sign-up
      expect(after[0].verificationToken).toBe(before.verificationToken); // their emailed link still works
      expect(global.fetch).not.toHaveBeenCalled(); // and no second email went out
    });

    test('cannot be pre-registered by someone else using the same EMAIL (pre-hijack attempt)', async () => {
      await register(valid());
      const victim = await User.findOne({ username: 'vana' }).lean();

      const res = await register(valid({ username: 'attacker', password: 'attackerpass1' }));
      expect(res.status).toBe(409);
      expect(await User.countDocuments({ username: 'attacker' })).toBe(0);
      expect((await User.findById(victim._id)).verificationToken).toBe(victim.verificationToken);
    });

    test('the original verification link still works after a rejected takeover attempt', async () => {
      const { token } = await signup();
      await register(valid({ email: 'attacker@example.com' }));
      expect((await complete(token, 'password123')).status).toBe(200);
      expect((await loginAs('vana', 'password123')).status).toBe(200); // the owner's own password
    });

    test('a username match and an email match on two different pending accounts: still 409, nothing deleted', async () => {
      await createUser({ username: 'vana', email: 'one@example.com', ...pendingAt(5 * MINUTE) });
      await createUser({ username: 'other', email: 'vana@example.com', ...pendingAt(5 * MINUTE) });
      const res = await register(valid());
      expect(res.status).toBe(409);
      expect(await User.countDocuments()).toBe(2);
    });

    test('a verified account on either field wins over a stale pending one: 400, nothing deleted', async () => {
      await createUser({ username: 'vana', email: 'one@example.com' }); // verified
      await createUser({ username: 'other', email: 'vana@example.com', ...pendingAt(-MINUTE) }); // stale
      const res = await register(valid());
      expect(res.status).toBe(400);
      expect(res.body.pendingVerification).toBeUndefined();
      expect(await User.countDocuments()).toBe(2);
    });

    test('the verified account is found even when it is not the first match (either order)', async () => {
      // stale pending account on the username is inserted FIRST, the verified one on the email second
      await createUser({ username: 'vana', email: 'one@example.com', ...pendingAt(-MINUTE) });
      await createUser({ username: 'other', email: 'vana@example.com' }); // verified
      const res = await register(valid());
      expect(res.status).toBe(400);
      expect(await User.countDocuments()).toBe(2); // the stale one was not deleted either
    });

    test('a stale one (token expired, TTL sweep has not run yet) is cleaned up and the sign-up succeeds', async () => {
      const stale = await createUser({ username: 'vana', email: 'vana@example.com', ...pendingAt(-MINUTE) });
      const res = await register(valid());
      expect(res.status).toBe(201);

      const users = await User.find({}).lean();
      expect(users).toHaveLength(1);
      expect(String(users[0]._id)).not.toBe(String(stale.user._id));
      expect(users[0].verificationToken).not.toBe('original-token');
    });

    test('two stale accounts (one per field) are both cleaned up, with no duplicate-key crash', async () => {
      await createUser({ username: 'vana', email: 'one@example.com', ...pendingAt(-MINUTE) });
      await createUser({ username: 'other', email: 'vana@example.com', ...pendingAt(-MINUTE) });
      const res = await register(valid());
      expect(res.status).toBe(201);
      expect(await User.countDocuments()).toBe(1);
    });

    test('an unverified account with no expiry at all (e.g. set by an admin) is never auto-replaced', async () => {
      await createUser({ username: 'vana', email: 'vana@example.com', isEmailVerified: false });
      const res = await register(valid());
      expect(res.status).toBe(409);
      expect(await User.countDocuments()).toBe(1);
    });

    test('the owner can get a fresh link through login + resend instead', async () => {
      await register(valid());
      const login = await loginAs('vana', 'any-password-at-all');
      expect(login.status).toBe(403);
      expect(login.body.notVerified).toBe(true);

      const resend = await request(app).post('/api/users/resend-verification').send({ email: login.body.email });
      expect(resend.status).toBe(200);
      const token = tokenFromLink(lastEmail().body.template_params.verify_url);
      expect((await complete(token, 'password123')).status).toBe(200);
      expect((await loginAs('vana', 'password123')).status).toBe(200);
    });

    test('concurrent sign-ups for the same new username: exactly one wins, the rest get 409, never a 500', async () => {
      const results = await Promise.all(
        ['a', 'b', 'c', 'd'].map(tag => register(valid({ email: `${tag}@example.com`, password: `password-${tag}-123` })))
      );
      const codes = results.map(r => r.status).sort();
      expect(codes.filter(c => c === 201)).toHaveLength(1);
      expect(codes.filter(c => c === 409)).toHaveLength(3);
      expect(await User.countDocuments({ username: 'vana' })).toBe(1);
    });
  });

  test('if the email cannot be sent the account is removed so the user can retry', async () => {
    mockEmailFailing();
    const res = await register(valid());
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/gửi email/i);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('email link, step 1: GET /api/users/verify/:token only checks the link', () => {
  test('returns who the sign-up is for and changes nothing', async () => {
    const { token } = await signup();
    const before = await User.findOne({ username: 'vana' }).lean();

    const res = await request(app).get(`/api/users/verify/${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, name: 'Nguyễn Văn A', email: 'vana@example.com' });

    const after = await User.findOne({ username: 'vana' }).lean();
    expect(after).toEqual(before); // still pending, token intact, no password
  });

  test('can be opened repeatedly (email scanners / link prefetchers cannot consume the token)', async () => {
    const { token } = await signup();
    for (let i = 0; i < 3; i++) expect((await request(app).get(`/api/users/verify/${token}`)).status).toBe(200);
    expect((await complete(token, 'password123')).status).toBe(200);
  });

  test.each([
    ['an unknown token', async () => 'deadbeef'],
    ['an expired token', async () => {
      const { token } = await signup();
      await User.updateOne({ username: 'vana' }, { verificationTokenExpires: new Date(Date.now() - 1000) });
      return token;
    }],
    ['a token of an account that is already active', async () => {
      const { token } = await signup();
      await complete(token, 'password123');
      return token;
    }],
  ])('rejects %s with 400', async (_label, getToken) => {
    const token = await getToken();
    const res = await request(app).get(`/api/users/verify/${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
    expect(res.body.linkInvalid).toBe(true); // lets the UI tell "dead link" from "bad password"
  });
});

describe('email link, step 2: POST /api/users/verify/:token sets the password and activates', () => {
  test('activates the account, stores a hash, clears the fields the TTL index watches', async () => {
    const { token } = await signup();
    const res = await complete(token, 'my-own-password1');
    expect(res.status).toBe(200);

    const user = await User.findOne({ username: 'vana' }).lean();
    expect(user.isEmailVerified).toBe(true);
    expect(user.password).not.toBe('my-own-password1');
    expect(await bcrypt.compare('my-own-password1', user.password)).toBe(true);
    expect(user.verificationToken).toBeUndefined();
    expect(user.verificationTokenExpires).toBeUndefined(); // otherwise Mongo would delete a verified user

    expect((await loginAs('vana', 'my-own-password1')).status).toBe(200);
  });

  test('the link works once: a second attempt cannot change the password', async () => {
    const { token } = await signup();
    await complete(token, 'first-password1');
    const again = await complete(token, 'second-password1');
    expect(again.status).toBe(400);
    expect((await loginAs('vana', 'first-password1')).status).toBe(200);
    expect((await loginAs('vana', 'second-password1')).status).toBe(401);
  });

  test.each([
    ['too short', 'short'],
    ['7 characters', '1234567'],
    ['over 100 characters', 'p'.repeat(101)],
    ['leading space', ' password123'],
    ['trailing space', 'password123 '],
    ['empty', ''],
  ])('rejects a password that is %s and leaves the link usable', async (_label, password) => {
    const { token } = await signup();
    const res = await complete(token, password);
    expect(res.status).toBe(400);
    expect(res.body.linkInvalid).toBeUndefined(); // the link is fine, the password is not

    const user = await User.findOne({ username: 'vana' }).lean();
    expect(user.isEmailVerified).toBe(false);
    expect(user.password).toBeUndefined();
    expect(user.verificationToken).toBe(token);
    expect((await complete(token, 'a-valid-password1')).status).toBe(200); // can still finish
  });

  test('boundary lengths are accepted (8 and 100 characters)', async () => {
    const a = await signup({ username: 'short1', email: 'a@example.com' });
    expect((await complete(a.token, '12345678')).status).toBe(200);
    const b = await signup({ username: 'long1', email: 'b@example.com' });
    expect((await complete(b.token, 'p'.repeat(100))).status).toBe(200);
  });

  test.each([
    ['no body', undefined],
    ['no password field', {}],
    ['an object', { password: { $ne: '' } }],
    ['an array', { password: ['password123'] }],
    ['a number', { password: 12345678 }],
  ])('rejects %s with 400 (never activates, never crashes)', async (_label, body) => {
    const { token } = await signup();
    const res = await request(app).post(`/api/users/verify/${token}`).send(body);
    expect(res.status).toBe(400);
    expect((await User.findOne({ username: 'vana' })).isEmailVerified).toBe(false);
  });

  test('an expired link cannot be completed, and no password is stored', async () => {
    const { token } = await signup();
    await User.updateOne({ username: 'vana' }, { verificationTokenExpires: new Date(Date.now() - 1000) });
    const res = await complete(token, 'password123');
    expect(res.status).toBe(400);
    expect(res.body.linkInvalid).toBe(true);
    const user = await User.findOne({ username: 'vana' }).lean();
    expect(user.isEmailVerified).toBe(false);
    expect(user.password).toBeUndefined();
  });

  test('a leftover token on an ACTIVE account (old data) cannot be used to reset its password', async () => {
    const { user } = await createUser({
      username: 'vana', email: 'vana@example.com', password: 'real-password1',
      verificationToken: 'leftover-token', verificationTokenExpires: new Date(Date.now() + 60000),
    });
    expect((await request(app).get('/api/users/verify/leftover-token')).status).toBe(400);
    expect((await complete('leftover-token', 'attackerpass1')).status).toBe(400);

    expect(await bcrypt.compare('real-password1', (await User.findById(user._id)).password)).toBe(true);
    expect((await loginAs('vana', 'real-password1')).status).toBe(200);
  });

  test('an unknown token -> 400', async () => {
    expect((await complete('deadbeef', 'password123')).status).toBe(400);
  });

  test('until the owner completes sign-up nobody can log in, whatever password they try', async () => {
    await signup();
    for (const guess of ['password123', 'attackerpass1', '']) {
      const res = await loginAs('vana', guess || 'x');
      expect(res.status).toBe(403);
      expect(res.body.notVerified).toBe(true);
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });
});

describe('pre-registration hijack (attacker signs up with the victim\'s email)', () => {
  test('the account ends up with the VICTIM\'s password; the attacker has no way in', async () => {
    // attacker submits the victim's email with a password of their choice (ignored) and their own username
    const { token } = await signup({ username: 'attacker', email: 'victim@example.com', password: 'attackerpass1' });

    // the attacker cannot log in before the victim acts...
    expect((await loginAs('attacker', 'attackerpass1')).status).toBe(403);
    // ...and cannot finish the sign-up: the link only exists in the victim's mailbox
    expect((await complete('guess-the-token', 'attackerpass1')).status).toBe(400);

    // the victim opens the link they received and chooses their own password
    expect((await complete(token, 'victim-password1')).status).toBe(200);

    expect((await loginAs('attacker', 'attackerpass1')).status).toBe(401); // attacker's guess is worthless
    expect((await loginAs('attacker', 'victim-password1')).status).toBe(200);
  });

  test('no password exists anywhere in the database while the sign-up is pending', async () => {
    await signup({ password: 'attackerpass1' });
    const raw = await User.collection.findOne({ username: 'vana' });
    expect(raw.password).toBeUndefined();
  });
});

describe('accounts without a password', () => {
  test('the model allows a pending account without one, but not a verified one', async () => {
    await expect(User.create({ name: 'P', username: 'pending1', email: 'p1@example.com' })).resolves.toBeDefined();
    await expect(User.create({ name: 'V', username: 'verified1', email: 'v1@example.com', isEmailVerified: true }))
      .rejects.toThrow(/password/i);
  });

  test('an active account that somehow has no password gets a 401 on login, not a 500', async () => {
    const { user } = await createUser({ username: 'vana', email: 'vana@example.com' });
    await User.collection.updateOne({ _id: user._id }, { $unset: { password: '' } });
    const res = await loginAs('vana', 'password123');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('an admin cannot activate an account that has no password yet', async () => {
    const admin = await createUser({ role: 'admin' });
    await register(valid());
    const pending = await User.findOne({ username: 'vana' });

    const res = await request(app).put(`/api/users/${pending._id}`).set(admin.auth).send({ isEmailVerified: true });
    expect(res.status).toBe(400);
    expect((await User.findById(pending._id)).isEmailVerified).toBe(false);
  });
});

describe('POST /api/users/login', () => {
  test('rejects missing credentials, unknown users and wrong passwords with the same 401 wording', async () => {
    await createUser({ username: 'vana', email: 'vana@example.com', password: 'password123' });
    expect((await request(app).post('/api/users/login').send({})).status).toBe(400);
    const unknown = await request(app).post('/api/users/login').send({ username: 'ghost', password: 'password123' });
    const wrong = await request(app).post('/api/users/login').send({ username: 'vana', password: 'WRONG-password' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message); // no user enumeration
  });

  test('blocks unverified accounts and says so', async () => {
    await createUser({ username: 'vana', email: 'vana@example.com', isEmailVerified: false });
    const res = await request(app).post('/api/users/login').send({ username: 'vana', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ notVerified: true, email: 'vana@example.com' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('logs in by username or by email, returns a JWT, sets an httpOnly cookie, never returns the password', async () => {
    const { user } = await createUser({ username: 'vana', email: 'vana@example.com' });

    for (const id of ['vana', 'vana@example.com']) {
      const res = await request(app).post('/api/users/login').send({ username: id, password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.password).toBeUndefined();
      expect(res.body).toMatchObject({ username: 'vana', email: 'vana@example.com', role: 'user' });
      expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe(String(user._id));

      const cookie = res.headers['set-cookie'].join(';');
      expect(cookie).toMatch(/token=/);
      expect(cookie).toMatch(/HttpOnly/i);
    }
  });

  describe('how the login identifier is matched', () => {
    test.each([
      ['an email in a different case (phones capitalise the first letter)', 'Vana@Example.COM'],
      ['an email with surrounding spaces', '  vana@example.com  '],
      ['a username with surrounding spaces', '  vana  '],
      ['a username in a different case', 'VANA'],
    ])('logs in with %s', async (_label, identifier) => {
      await createUser({ username: 'vana', email: 'vana@example.com' });
      const res = await loginAs(identifier, 'password123');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('vana');
    });

    test('the password stays case-sensitive and is never trimmed or normalized', async () => {
      await createUser({ username: 'vana', email: 'vana@example.com', password: 'Password123' });
      expect((await loginAs('vana', 'password123')).status).toBe(401);
      expect((await loginAs('vana', ' Password123')).status).toBe(401);
      expect((await loginAs('vana', 'Password123')).status).toBe(200);
    });

    test('when two accounts differ only by case, an exact username always wins', async () => {
      const lower = await createUser({ username: 'alice', email: 'a1@example.com', password: 'lower-pass-1' });
      const upper = await createUser({ username: 'Alice', email: 'a2@example.com', password: 'upper-pass-1' });
      expect((await loginAs('alice', 'lower-pass-1')).body._id).toBe(String(lower.user._id));
      expect((await loginAs('Alice', 'upper-pass-1')).body._id).toBe(String(upper.user._id));
      expect((await loginAs('alice', 'upper-pass-1')).status).toBe(401); // no cross-over
    });

    test('an ambiguous case-insensitive username never guesses (ALICE could be either account)', async () => {
      await createUser({ username: 'alice', email: 'a1@example.com', password: 'lower-pass-1' });
      await createUser({ username: 'Alice', email: 'a2@example.com', password: 'upper-pass-1' });
      expect((await loginAs('ALICE', 'lower-pass-1')).status).toBe(401);
      expect((await loginAs('ALICE', 'upper-pass-1')).status).toBe(401);
    });

    test('an unknown identifier is still the same 401', async () => {
      expect((await loginAs('ghost', 'password123')).status).toBe(401);
      expect((await loginAs('GHOST@Example.com', 'password123')).status).toBe(401);
    });

    test('an unverified account is found the same way (so the "not activated" notice appears)', async () => {
      await createUser({ username: 'vana', email: 'vana@example.com', isEmailVerified: false });
      const res = await loginAs('Vana@Example.com', 'whatever');
      expect(res.status).toBe(403);
      expect(res.body.notVerified).toBe(true);
    });
  });

  test('the login cookie authenticates later requests (no Authorization header needed)', async () => {
    await createUser({ username: 'vana', email: 'vana@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/users/login').send({ username: 'vana', password: 'password123' });
    const res = await agent.get('/api/users/profile');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('vana');
  });

  test('logout clears the cookie', async () => {
    const res = await request(app).post('/api/users/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/token=;/);
  });

  test.each([
    ['operators in both fields', { username: { $ne: null }, password: { $ne: null } }],
    ['operator in username only', { username: { $gt: '' }, password: 'password123' }],
    ['array password', { username: 'vana', password: ['password123'] }],
    ['numeric username', { username: 123, password: 'password123' }],
  ])('NoSQL / wrong-typed login body (%s) is a 400 and never logs in', async (_label, body) => {
    await createUser({ username: 'vana', email: 'vana@example.com' });
    const res = await request(app).post('/api/users/login').send(body);
    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('POST /api/users/resend-verification', () => {
  test('issues a fresh token and emails it (works with EmailJS only)', async () => {
    const { user } = await createUser({ isEmailVerified: false, verificationToken: 'old-token' });
    const res = await request(app).post('/api/users/resend-verification').send({ email: user.email });
    expect(res.status).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.verificationToken).not.toBe('old-token');
    expect(fresh.verificationTokenExpires.getTime()).toBeGreaterThan(Date.now());
    expect(tokenFromLink(lastEmail().body.template_params.verify_url)).toBe(fresh.verificationToken);
  });

  test('404 for an unknown account or one that is already verified; 400 without input', async () => {
    const { user } = await createUser();
    expect((await request(app).post('/api/users/resend-verification').send({ email: 'nobody@example.com' })).status).toBe(404);
    expect((await request(app).post('/api/users/resend-verification').send({ email: user.email })).status).toBe(404);
    expect((await request(app).post('/api/users/resend-verification').send({})).status).toBe(400);
    expect((await request(app).post('/api/users/resend-verification').send({ email: { $ne: null } })).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('token authentication middleware', () => {
  test('rejects a missing, malformed, wrongly-signed or expired token', async () => {
    const { user } = await createUser();
    const sign = (secret, opts) => jwt.sign({ id: user._id }, secret, opts);

    expect((await request(app).get('/api/users/profile')).status).toBe(401);
    expect((await request(app).get('/api/users/profile').set('Authorization', 'Bearer not.a.jwt')).status).toBe(401);
    expect((await request(app).get('/api/users/profile').set('Authorization', `Bearer ${sign('other-secret')}`)).status).toBe(401);
    expect((await request(app).get('/api/users/profile').set('Authorization', `Bearer ${sign(process.env.JWT_SECRET, { expiresIn: -10 })}`)).status).toBe(401);
    expect((await request(app).get('/api/users/profile').set('Authorization', `Bearer ${sign(process.env.JWT_SECRET)}`)).status).toBe(200);
  });

  test('a valid token for a user that was deleted is rejected', async () => {
    const { user, auth } = await createUser();
    await User.deleteOne({ _id: user._id });
    const res = await request(app).get('/api/users/profile').set(auth);
    expect(res.status).toBe(401);
  });
});

describe('profile', () => {
  test('GET never includes the password hash or reset/verification secrets', async () => {
    const { auth } = await createUser({
      resetPasswordToken: 'secret-reset',
      resetPasswordExpires: new Date(Date.now() + 60000),
      verificationToken: 'secret-verify',
    });
    const res = await request(app).get('/api/users/profile').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.username).toBeDefined();
    for (const secret of ['password', 'resetPasswordToken', 'resetPasswordExpires', 'verificationToken', 'verificationTokenExpires']) {
      expect(res.body[secret]).toBeUndefined();
    }
  });

  test('PUT updates the allowed fields', async () => {
    const { auth } = await createUser();
    const res = await request(app).put('/api/users/profile').set(auth).send({
      name: '  Trần   B ', age: 30, gender: 'Nữ', height: 165, weight: 55.5,
      goal: 'Giảm mỡ', activityLevel: 'Vận động nhẹ', lastActiveRoutineId: 'ppl', lastActiveDayIndex: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Trần B', age: 30, gender: 'Nữ', height: 165, weight: 55.5,
      goal: 'Giảm mỡ', activityLevel: 'Vận động nhẹ', lastActiveRoutineId: 'ppl', lastActiveDayIndex: 2,
    });
    expect(res.body.token).toBeDefined();
  });

  test('PUT cannot change role, email, username or verification status', async () => {
    const { auth, user } = await createUser();
    await request(app).put('/api/users/profile').set(auth).send({
      role: 'admin', email: 'evil@example.com', username: 'evil', isEmailVerified: false,
    });
    const fresh = await User.findById(user._id);
    expect(fresh.role).toBe('user');
    expect(fresh.email).toBe(user.email);
    expect(fresh.username).toBe(user.username);
    expect(fresh.isEmailVerified).toBe(true);
  });

  test.each([
    ['name too short', { name: 'A' }],
    ['age 0', { age: 0 }],
    ['age 121', { age: 121 }],
    ['age not a number', { age: 'old' }],
    ['height 29', { height: 29 }],
    ['height 301', { height: 301 }],
    ['weight 9', { weight: 9 }],
    ['weight 501', { weight: 501 }],
    ['unknown gender', { gender: 'robot' }],
    ['unknown goal', { goal: 'become-tall' }],
    ['unknown activity level', { activityLevel: 'extreme' }],
    ['day index 7', { lastActiveDayIndex: 7 }],
    ['day index -1', { lastActiveDayIndex: -1 }],
    ['day index 1.5', { lastActiveDayIndex: 1.5 }],
  ])('PUT rejects %s and saves nothing', async (_label, body) => {
    const { auth, user } = await createUser({ age: 40 });
    const res = await request(app).put('/api/users/profile').set(auth).send(body);
    expect(res.status).toBe(400);
    const fresh = await User.findById(user._id);
    expect(fresh.age).toBe(40);
    expect(fresh.name).toBe(user.name);
  });

  test('boundary values are accepted', async () => {
    const { auth } = await createUser();
    for (const body of [{ age: 1 }, { age: 120 }, { height: 30 }, { height: 300 }, { weight: 10 }, { weight: 500 }, { lastActiveDayIndex: 0 }, { lastActiveDayIndex: 6 }]) {
      expect((await request(app).put('/api/users/profile').set(auth).send(body)).status).toBe(200);
    }
  });
});

describe('changing the password', () => {
  const change = (auth, body) => request(app).put('/api/users/profile').set(auth).send(body);
  const login = (username, password) => request(app).post('/api/users/login').send({ username, password });

  test('needs the current password; the old one stops working, the new one works', async () => {
    const { auth, user } = await createUser({ password: 'oldpassword1' });

    const res = await change(auth, { password: 'newpassword1', currentPassword: 'oldpassword1' });
    expect(res.status).toBe(200);
    expect((await login(user.username, 'oldpassword1')).status).toBe(401);
    expect((await login(user.username, 'newpassword1')).status).toBe(200);
  });

  test.each([
    ['no current password', { password: 'newpassword1' }],
    ['wrong current password', { password: 'newpassword1', currentPassword: 'nope' }],
    ['non-string current password', { password: 'newpassword1', currentPassword: { $ne: '' } }],
    ['new password too short', { password: 'short', currentPassword: 'oldpassword1' }],
    ['new password too long', { password: 'p'.repeat(101), currentPassword: 'oldpassword1' }],
    ['new password with surrounding spaces', { password: ' newpassword1 ', currentPassword: 'oldpassword1' }],
    ['non-string new password', { password: ['newpassword1'], currentPassword: 'oldpassword1' }],
  ])('rejects %s and keeps the old password', async (_label, body) => {
    const { auth, user } = await createUser({ password: 'oldpassword1' });
    const res = await change(auth, body);
    expect(res.status).toBe(400); // 400, not 401: the client logs out on 401
    expect((await login(user.username, 'oldpassword1')).status).toBe(200);
  });

  test('other profile fields are not applied when the password change is rejected', async () => {
    const { auth, user } = await createUser({ password: 'oldpassword1', age: 40 });
    await change(auth, { age: 99, password: 'newpassword1', currentPassword: 'wrong' });
    expect((await User.findById(user._id)).age).toBe(40);
  });
});

describe('forgot / reset password', () => {
  test('unknown email gets the same 200 and no email is sent (no account enumeration)', async () => {
    const res = await request(app).post('/api/users/forgot-password').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('requires an email, and only a text one (an operator object would match an arbitrary user)', async () => {
    await createUser();
    expect((await request(app).post('/api/users/forgot-password').send({})).status).toBe(400);
    expect((await request(app).post('/api/users/forgot-password').send({ email: '   ' })).status).toBe(400);
    expect((await request(app).post('/api/users/forgot-password').send({ email: { $ne: null } })).status).toBe(400);
    expect((await request(app).post('/api/users/forgot-password').send({ email: ['a@b.co'] })).status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(await User.countDocuments({ resetPasswordToken: { $exists: true } })).toBe(0);
  });

  test('known email: stores a 1h token and sends the reset template', async () => {
    const { user } = await createUser();
    const res = await request(app).post('/api/users/forgot-password').send({ email: user.email });
    expect(res.status).toBe(200);

    const fresh = await User.findById(user._id);
    expect(fresh.resetPasswordToken).toHaveLength(64);
    const msLeft = fresh.resetPasswordExpires.getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(59 * 60 * 1000);
    expect(msLeft).toBeLessThanOrEqual(60 * 60 * 1000);

    expect(lastEmail().body.template_id).toBe('tpl_forgot_test');
    expect(lastEmail().body.template_params.verify_url).toBe(`http://localhost:3000/reset-password/${fresh.resetPasswordToken}`);
  });

  test('the email is matched case-insensitively and ignoring surrounding spaces', async () => {
    const { user } = await createUser({ email: 'mixed@example.com' });
    const res = await request(app).post('/api/users/forgot-password').send({ email: '  Mixed@Example.COM ' });
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1); // the user did receive the mail
    expect((await User.findById(user._id)).resetPasswordToken).toBeTruthy();
  });

  const startReset = async (over = {}) => {
    const created = await createUser({ password: 'oldpassword1', ...over });
    await request(app).post('/api/users/forgot-password').send({ email: created.user.email });
    const token = (await User.findById(created.user._id)).resetPasswordToken;
    return { ...created, resetToken: token };
  };

  test('a valid token sets the new password and can only be used once', async () => {
    const { user, resetToken } = await startReset();

    const res = await request(app).post(`/api/users/reset-password/${resetToken}`).send({ password: 'brandnewpass1' });
    expect(res.status).toBe(200);

    const login = (pw) => request(app).post('/api/users/login').send({ username: user.username, password: pw });
    expect((await login('oldpassword1')).status).toBe(401);
    expect((await login('brandnewpass1')).status).toBe(200);

    const fresh = await User.findById(user._id).lean();
    expect(fresh.resetPasswordToken).toBeUndefined();
    expect(fresh.resetPasswordExpires).toBeUndefined();

    const again = await request(app).post(`/api/users/reset-password/${resetToken}`).send({ password: 'anotherpass12' });
    expect(again.status).toBe(400);
  });

  test('the token can also come in the body or the query string', async () => {
    const a = await startReset();
    expect((await request(app).post('/api/users/reset-password').send({ token: a.resetToken, password: 'brandnewpass1' })).status).toBe(200);
    const b = await startReset();
    expect((await request(app).post(`/api/users/reset-password?token=${b.resetToken}`).send({ password: 'brandnewpass1' })).status).toBe(200);
  });

  test('an expired token is rejected and the password is unchanged', async () => {
    const { user, resetToken } = await startReset();
    await User.updateOne({ _id: user._id }, { resetPasswordExpires: new Date(Date.now() - 1000) });

    const res = await request(app).post(`/api/users/reset-password/${resetToken}`).send({ password: 'brandnewpass1' });
    expect(res.status).toBe(400);
    const login = await request(app).post('/api/users/login').send({ username: user.username, password: 'oldpassword1' });
    expect(login.status).toBe(200);
  });

  test.each([
    ['no password', { }],
    ['password too short', { password: 'short' }],
  ])('rejects %s', async (_label, body) => {
    const { resetToken } = await startReset();
    expect((await request(app).post(`/api/users/reset-password/${resetToken}`).send(body)).status).toBe(400);
  });

  test('wrong-typed reset input is a 400, not a crash or a match', async () => {
    const { user } = await startReset();
    const url = '/api/users/reset-password/anything';
    expect((await request(app).post(url).send({ password: { $ne: '' } })).status).toBe(400);
    expect((await request(app).post('/api/users/reset-password').send({ token: { $ne: null }, password: 'brandnewpass1' })).status).toBe(400);
    const login = await request(app).post('/api/users/login').send({ username: user.username, password: 'oldpassword1' });
    expect(login.status).toBe(200); // password untouched
  });

  test('an unknown token or none at all -> 400', async () => {
    expect((await request(app).post('/api/users/reset-password/nope').send({ password: 'brandnewpass1' })).status).toBe(400);
    expect((await request(app).post('/api/users/reset-password').send({ password: 'brandnewpass1' })).status).toBe(400);
  });
});

describe('admin user management', () => {
  test('listing users is admin-only and never returns password hashes', async () => {
    const user = await createUser();
    const admin = await createUser({ role: 'admin' });

    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).get('/api/users').set(user.auth)).status).toBe(403);

    const res = await request(app).get('/api/users').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach(u => {
      for (const secret of ['password', 'resetPasswordToken', 'verificationToken']) expect(u[secret]).toBeUndefined();
    });
  });

  test('the admin list does not expose other users reset tokens', async () => {
    const admin = await createUser({ role: 'admin' });
    await createUser({ resetPasswordToken: 'victim-reset-token', resetPasswordExpires: new Date(Date.now() + 60000) });
    const res = await request(app).get('/api/users').set(admin.auth);
    expect(JSON.stringify(res.body)).not.toContain('victim-reset-token');
  });

  test('role/verification changes are admin-only; an admin cannot demote themselves', async () => {
    const user = await createUser();
    const admin = await createUser({ role: 'admin' });

    expect((await request(app).put(`/api/users/${user.user._id}`).set(user.auth).send({ role: 'admin' })).status).toBe(403);
    expect((await User.findById(user.user._id)).role).toBe('user');

    const promote = await request(app).put(`/api/users/${user.user._id}`).set(admin.auth).send({ role: 'admin' });
    expect(promote.status).toBe(200);
    expect(promote.body.role).toBe('admin');

    const demoteSelf = await request(app).put(`/api/users/${admin.user._id}`).set(admin.auth).send({ role: 'user' });
    expect(demoteSelf.status).toBe(400);
    expect((await User.findById(admin.user._id)).role).toBe('admin');
  });

  test('verifying an account by hand clears the TTL fields so it is not auto-deleted', async () => {
    const admin = await createUser({ role: 'admin' });
    const pending = await createUser({
      isEmailVerified: false,
      verificationToken: 'tok',
      verificationTokenExpires: new Date(Date.now() + 60000),
    });

    const res = await request(app).put(`/api/users/${pending.user._id}`).set(admin.auth).send({ isEmailVerified: true });
    expect(res.status).toBe(200);
    const fresh = await User.findById(pending.user._id).lean();
    expect(fresh.isEmailVerified).toBe(true);
    expect(fresh.verificationToken).toBeUndefined();
    expect(fresh.verificationTokenExpires).toBeUndefined();
  });

  test('deleting a user also deletes their logs and custom foods, and nobody elses', async () => {
    const admin = await createUser({ role: 'admin' });
    const doomed = await createUser();
    const bystander = await createUser();
    const today = new Date().toISOString().slice(0, 10);

    for (const u of [doomed, bystander]) {
      await request(app).post('/api/workouts').set(u.auth).send({ date: today, selectedIds: ['a'], completedIds: ['a'], isSaved: true });
      await request(app).post('/api/nutrition').set(u.auth).send({ date: today, meals: { 'Bữa Sáng': [{ id: '1', name: 'x', calories: 1 }] } });
      await request(app).post('/api/foods/custom').set(u.auth).send({ name: 'Món riêng', calories: 100 });
    }
    const count = (name, uid) => mongoose.model(name).countDocuments({ user: uid });
    expect(await count('WorkoutLog', doomed.user._id)).toBe(1);

    const res = await request(app).delete(`/api/users/${doomed.user._id}`).set(admin.auth);
    expect(res.status).toBe(200);

    expect(await User.countDocuments({ _id: doomed.user._id })).toBe(0);
    for (const model of ['WorkoutLog', 'NutritionLog', 'Food']) {
      expect(await count(model, doomed.user._id)).toBe(0);
      expect(await count(model, bystander.user._id)).toBe(1);
    }
  });

  test('cannot delete yourself; unknown user is a 404; non-admins are refused', async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser();

    expect((await request(app).delete(`/api/users/${admin.user._id}`).set(admin.auth)).status).toBe(400);
    expect(await User.countDocuments({ _id: admin.user._id })).toBe(1);
    expect((await request(app).delete(`/api/users/${new mongoose.Types.ObjectId()}`).set(admin.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/users/${admin.user._id}`).set(user.auth)).status).toBe(403);
  });
});
