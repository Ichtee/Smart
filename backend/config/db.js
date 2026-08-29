const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('MONGO_URI is not defined, skipping database connection for now.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Auto migrate all exercise/routine reps in DB to default 10
    const migrateRepsToTen = require('../utils/migrateReps');
    migrateRepsToTen();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
