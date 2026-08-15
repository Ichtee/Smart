const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

async function checkAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const exercises = await Exercise.find({}).sort({ muscle: 1, name: 1 });
  console.log('TOTAL EXERCISES IN DB:', exercises.length);

  exercises.forEach((e, idx) => {
    console.log(`${idx + 1}. [${e.muscle.toUpperCase()}] "${e.name}" | Equipment: ${e.equipment} | Video: ${e.videoUrl ? 'YES' : 'NO'}`);
    console.log(`   Desc: ${e.description}`);
  });

  await mongoose.disconnect();
}

checkAll().catch(console.error);
