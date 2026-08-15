const mongoose = require('mongoose');
require('dotenv').config();
const Routine = require('../models/Routine');

const RENAME_MAP = {
  'Incline press': 'Incline Press Machine',
  'Flat chest press': 'Flat Chest Press Machine',
  'Chest press': 'Chest Press Machine',
  'Close grip row': 'Close Grip Cable Row',
  'Medium grip row': 'Medium Grip Cable Row',
  'Wide grip row': 'Wide Grip Cable Row',
  'Lat pull down': 'Lat Pulldown Machine',
  'Db biceps preacher curl': 'Dumbbell Preacher Curl',
  'Dumbbell preacher curl': 'Dumbbell Preacher Curl',
  'Hammer preacher curl': 'Hammer Preacher Curl',
  'Dumbbell Hammer curl': 'Dumbbell Hammer Curl',
  'Dumbbell reverse curl': 'Dumbbell Reverse Curl',
  '45s extension hoặc hip thrust': 'Hip Thrust Machine',
  'Pec fly': 'Pec Deck Fly Machine',
  'Rear delt fly': 'Pec Deck Rear Delt Fly',
  'Shoulder press': 'Machine Shoulder Press',
  'Machine shoulder press': 'Machine Shoulder Press',
  'Hip adduction': 'Hip Adduction Machine',
  'Hip abduction': 'Hip Abduction Machine',
  'Abs crunches': 'Abs Cable Crunches',
  'Shrug': 'Barbell Shrug',
  'Overhead extension': 'Overhead Cable Triceps Extension',
  'Triceps pushdown': 'Triceps Cable Pushdown',
  'Lateral raise': 'Cable Lateral Raise',
  'Preacher curl': 'Preacher Curl Machine',
  'Squat': 'Barbell Squat',
  'Leg extension': 'Leg Extension Machine'
};

async function syncRoutines() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  const routines = await Routine.find({});
  let totalUpdatedDays = 0;

  for (const r of routines) {
    let routineModified = false;
    (r.schedule || []).forEach(day => {
      (day.exercises || []).forEach(ex => {
        if (RENAME_MAP[ex.exerciseName]) {
          console.log(`Routine "${r.name}" (${day.day}): "${ex.exerciseName}" -> "${RENAME_MAP[ex.exerciseName]}"`);
          ex.exerciseName = RENAME_MAP[ex.exerciseName];
          routineModified = true;
        }
      });
    });

    if (routineModified) {
      await r.save();
      totalUpdatedDays++;
    }
  }

  console.log(`Synced ${totalUpdatedDays} routines in MongoDB Atlas.`);
  await mongoose.disconnect();
}

syncRoutines().catch(console.error);
