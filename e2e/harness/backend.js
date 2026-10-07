// Isolated backend for the browser tests: in-memory MongoDB, EmailJS intercepted, never touches a real DB.
// Started by playwright.config.ts:  node harness/backend.js <backendDir> <port> <frontendOrigin>
const path = require('path');
const [backendArg, port, frontendOrigin] = process.argv.slice(2);
const backend = path.resolve(process.cwd(), backendArg);

process.env.NODE_ENV = 'test'; // rate limiters are skipped, so many sign-ups from one IP are fine
process.env.JWT_SECRET = 'e2e-secret';
process.env.FRONTEND_URL = frontendOrigin;
process.env.EMAILJS_SERVICE_ID = 'svc';
process.env.EMAILJS_TEMPLATE_ID = 'tpl';
process.env.EMAILJS_FORGOT_TEMPLATE_ID = 'tpl-forgot';
process.env.EMAILJS_PUBLIC_KEY = 'pub';
delete process.env.MONGO_URI; // belt and braces: whatever .env says, this process must not see a real database

const { MongoMemoryServer } = require(path.join(backend, 'node_modules/mongodb-memory-server'));
const mongoose = require(path.join(backend, 'node_modules/mongoose'));
const express = require(path.join(backend, 'node_modules/express'));

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const users = () => mongoose.connection.collection('users');

  // capture emails instead of sending them
  const emails = [];
  const realFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).includes('emailjs.com')) {
      emails.push({ at: new Date().toISOString(), ...JSON.parse(options.body) });
      return { ok: true, status: 200, text: async () => 'OK' };
    }
    return realFetch(url, options);
  };

  const app = require(path.join(backend, 'app'));

  app.get('/__e2e/emails', (req, res) => res.json(emails));

  // pretend the sign-up link was opened too late (the real wait is 10 minutes)
  app.post('/__e2e/expire-pending', async (req, res) => {
    const r = await users().updateMany({ isEmailVerified: false }, { $set: { verificationTokenExpires: new Date(Date.now() - 1000) } });
    res.json({ modified: r.modifiedCount });
  });

  // pretend a password-reset link was opened too late (the real wait is 1 hour)
  app.post('/__e2e/expire-reset', express.json(), async (req, res) => {
    const r = await users().updateOne({ email: req.body.email }, { $set: { resetPasswordExpires: new Date(Date.now() - 1000) } });
    res.json({ modified: r.modifiedCount });
  });

  app.post('/__e2e/make-admin', express.json(), async (req, res) => {
    const r = await users().updateOne({ username: req.body.username }, { $set: { role: 'admin' } });
    res.json({ modified: r.modifiedCount });
  });

  app.listen(Number(port), () => console.log(`e2e backend on ${port} (in-memory db, emails captured)`));
  process.on('SIGTERM', async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); });
})();
