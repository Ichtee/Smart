// Manual one-off migrations. Usage: npm run migrate
// (Previously ran automatically on every server start, which overwrote admin-edited reps.)
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const migrateRepsToTen = require('./migrateReps');

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  await migrateRepsToTen();
  await mongoose.disconnect();
  process.exit(0);
})();
