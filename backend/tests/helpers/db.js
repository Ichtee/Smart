const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

/** Start an isolated in-memory MongoDB and connect mongoose to it. Call in beforeAll. */
const connect = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Make sure unique indexes (user+date, username, email...) exist before the first test writes
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
};

/** Remove all documents (keeps indexes). Call in beforeEach so tests do not leak into each other. */
const clear = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
};

/** Disconnect and stop the server. Call in afterAll. */
const close = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

module.exports = { connect, clear, close };
