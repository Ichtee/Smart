module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  // The first run may download the mongod binary used by mongodb-memory-server
  testTimeout: 60000,
};
