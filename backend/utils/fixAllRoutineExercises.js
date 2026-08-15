const mongoose = require('mongoose');
require('dotenv').config();
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

const FULL_MAP = {
  'Cable curl superset triceps extension': 'EZ Bar Cable Bicep Curl',
  'Chest press': 'Flat Chest Press Machine',
  'Chest Press Machine': 'Flat Chest Press Machine',
  'Shoulder press': 'Machine Shoulder Press',
  'Medium grip row': 'Medium Grip Cable Row',
  'Leg extension': 'Leg Extension Machine',
  'Hip abduction': 'Hip Abduction Machine',
  'Db biceps preacher curl': 'Dumbbell Preacher Curl',
  '45s extension hoặc hip thrust': 'Hip Thrust Machine',
  'Pec fly': 'Pec Deck Fly Machine',
  'Rear delt fly': 'Pec Deck Rear Delt Fly',
  'Flat chest press': 'Flat Chest Press Machine',
  'Incline press': 'Incline Press Machine',
  'Close grip row': 'Close Grip Cable Row',
  'Wide grip row': 'Wide Grip Cable Row',
  'Lat pull down': 'Lat Pulldown Machine',
  'Dumbbell preacher curl': 'Dumbbell Preacher Curl',
  'Hammer preacher curl': 'Hammer Preacher Curl',
  'Dumbbell Hammer curl': 'Dumbbell Hammer Curl',
  'Dumbbell reverse curl': 'Dumbbell Reverse Curl',
  'Hip adduction': 'Hip Adduction Machine',
  'Abs crunches': 'Abs Cable Crunches',
  'Shrug': 'Barbell Shrug',
  'Overhead extension': 'Overhead Cable Triceps Extension',
  'Triceps pushdown': 'Triceps Cable Pushdown',
  'Lateral raise': 'Cable Lateral Raise',
  'Preacher curl': 'Preacher Curl Machine',
  'Squat': 'Barbell Squat',
  'Leg curl': 'Leg curl',
  'Long rope triceps extension': 'Long Rope Triceps Extension',
  'Squat máy': 'Machine Squat',
  'Triceps extension': 'Triceps Cable Pushdown',
  'Dumbbell pull over': 'Dumbbell Pullover',
  'Cable one arm hip height lateral raise': 'Cable One Arm Lateral Raise',
  'Hack squat': 'Hack Squat Machine'
};

async function fixAllRoutines() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  const validExercises = await Exercise.find({});
  const validNames = new Set(validExercises.map(e => e.name));
  console.log(`Total valid catalog exercises: ${validNames.size}`);

  const routines = await Routine.find({});
  let totalFixes = 0;
  let totalWarnings = 0;

  for (const r of routines) {
    let modified = false;
    for (const day of (r.schedule || [])) {
      for (const ex of (day.exercises || [])) {
        if (FULL_MAP[ex.exerciseName]) {
          if (ex.exerciseName !== FULL_MAP[ex.exerciseName]) {
            console.log(`Fixing in routine "${r.name}" (${day.day}): "${ex.exerciseName}" -> "${FULL_MAP[ex.exerciseName]}"`);
            ex.exerciseName = FULL_MAP[ex.exerciseName];
            modified = true;
            totalFixes++;
          }
        }

        // Verify if ex.exerciseName is in validNames
        if (!validNames.has(ex.exerciseName)) {
          console.warn(`❌ UNMATCHED WARNING: "${ex.exerciseName}" in routine "${r.name}" (${day.day}) not in catalog!`);
          totalWarnings++;
        }
      }
    }
    if (modified) {
      await r.save();
    }
  }

  console.log(`Finished! Total fixes applied: ${totalFixes}, Total warnings remaining: ${totalWarnings}`);
  await mongoose.disconnect();
}

fixAllRoutines().catch(console.error);
