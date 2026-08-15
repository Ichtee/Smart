const mongoose = require('mongoose');
require('dotenv').config();
const Routine = require('../models/Routine');

const NAME_MAP = {
  'Leg curl': 'Lying Leg Curl Machine',
  'Lat pull down': 'Lat Pulldown Machine',
  'Pec fly': 'Pec Deck Fly Machine',
  'Rear delt fly': 'Pec Deck Rear Delt Fly',
  'Machine shoulder press': 'Machine Shoulder Press',
  'Hip adduction': 'Hip Adduction Machine',
  '45s extension hoặc hip thrust': 'Hip Thrust Machine',
  'Abs crunches': 'Abs Cable Crunches',
  'Shrug': 'Barbell Shrug',
  'Overhead extension': 'Overhead Cable Triceps Extension',
  'Triceps pushdown': 'Triceps Cable Pushdown',
  'Lateral raise': 'Cable Lateral Raise',
  'Preacher curl': 'Preacher Curl Machine',
  'Dumbbell Shoulder press': 'Dumbbell Shoulder Press',
  'Squat': 'Machine Squat'
};

async function updateRoutines() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  const routines = await Routine.find({});
  let updatedCount = 0;

  for (const r of routines) {
    let modified = false;
    (r.schedule || []).forEach(day => {
      (day.exercises || []).forEach(ex => {
        if (NAME_MAP[ex.exerciseName]) {
          ex.exerciseName = NAME_MAP[ex.exerciseName];
          modified = true;
        }
      });
    });

    if (modified) {
      await r.save();
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} routines with clean exercise names in MongoDB Atlas.`);
  await mongoose.disconnect();
}

updateRoutines().catch(console.error);
