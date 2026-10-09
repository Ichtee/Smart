// Import the exercise library from free-exercise-db (public domain, no API key).
// Usage: npm run import:exercises            -> dry run, writes nothing
//        npm run import:exercises -- apply   -> backs up exercises/routines/workout logs, then writes
// Old exercises listed in MATCH are updated in place (same _id, so routines keep working) and renamed
// in routines and workout logs (records are keyed by name). Unlisted old exercises are left alone.
// Safe to re-run: renamed exercises are no longer found by their old name, and inserts skip existing names.
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const APPLY = process.argv.includes('apply');

// old name in our DB -> exercise name in free-exercise-db
const MATCH = {
  'Abs Cable Crunches': 'Cable Crunch',
  'Dead Bug': 'Dead Bug',
  'Front Plank': 'Plank',
  'Hanging Leg Raise': 'Hanging Leg Raise',
  'Hip Adduction Machine': 'Thigh Adductor',
  'Cable Rear Delt Fly': 'Cable Rear Delt Fly',
  'Dumbbell Rear Delt Fly': 'Reverse Flyes',
  'Face Pull Cable': 'Face Pull',
  'Pec Deck Rear Delt Fly': 'Reverse Machine Flyes',
  'Dumbbell Biceps Curl': 'Dumbbell Bicep Curl',
  'Dumbbell Hammer Curl': 'Hammer Curls',
  'Dumbbell Preacher Curl': 'One Arm Dumbbell Preacher Curl',
  'Dumbbell Reverse Curl': 'Standing Dumbbell Reverse Curl',
  'EZ Bar Cable Bicep Curl': 'Standing Biceps Cable Curl',
  'Hammer Preacher Curl': 'Preacher Hammer Dumbbell Curl',
  'Preacher Curl Machine': 'Machine Preacher Curls',
  'Seated Calf Raise Machine': 'Seated Calf Raise',
  'Standing Calf Raise Machine': 'Standing Calf Raises',
  'Cable Chest Fly': 'Cable Crossover',
  'Dumbbell Chest Fly': 'Dumbbell Flyes',
  'Dumbbell Floor Press': 'Dumbbell Floor Press',
  'Dumbbell Pullover': 'Straight-Arm Dumbbell Pullover',
  'Flat Chest Press Machine': 'Machine Bench Press',
  'Incline Dumbbell Chest Press': 'Incline Dumbbell Press',
  'Incline Dumbbell Fly': 'Incline Dumbbell Flyes',
  'Incline Press Machine': 'Leverage Incline Chest Press',
  'Pec Deck Fly Machine': 'Butterfly',
  'Push-up': 'Pushups',
  'Smith Incline Press': 'Smith Machine Incline Bench Press',
  'Reverse Wrist Curl': 'Seated Palms-Down Barbell Wrist Curl',
  'Wrist Curl': 'Seated Palm-Up Barbell Wrist Curl',
  'Arnold Press': 'Arnold Dumbbell Press',
  'Barbell Military Press': 'Standing Military Press',
  'Dumbbell Front Raise': 'Front Dumbbell Raise',
  'Dumbbell Lateral Raise': 'Side Lateral Raise',
  'Dumbbell Shoulder Press': 'Dumbbell Shoulder Press',
  'Machine Shoulder Press': 'Machine Shoulder (Military) Press',
  'Smith Shoulder Press': 'Smith Machine Overhead Shoulder Press',
  'Barbell Hip Thrust': 'Barbell Hip Thrust',
  'Cable Glute Kickback': 'One-Legged Cable Kickback',
  'Hip Abduction Machine': 'Thigh Abductor',
  'Single-Leg Glute Bridge': 'Single Leg Glute Bridge',
  'Sumo Deadlift': 'Sumo Deadlift',
  'Barbell RDL': 'Romanian Deadlift',
  'Dumbbell RDL': 'Stiff-Legged Dumbbell Deadlift',
  'Lying Leg Curl Machine': 'Lying Leg Curls',
  'Seated Leg Curl Machine': 'Seated Leg Curl',
  'Standing Leg Curl Machine': 'Standing Leg Curl',
  'Lat Pulldown Machine': 'Wide-Grip Lat Pulldown',
  'One-Arm Dumbbell Row': 'One-Arm Dumbbell Row',
  'Pull Up': 'Pullups',
  'Reverse Grip Lat Pulldown': 'Underhand Cable Pulldowns',
  'Straight Arm Pulldown': 'Straight-Arm Pulldown',
  'V-Bar Pulldown': 'V-Bar Pulldown',
  'Back Extension': 'Hyperextensions (Back Extensions)',
  'Good Morning': 'Good Morning',
  'Cable Woodchopper': 'Standing Cable Wood Chop',
  'Russian Twist': 'Russian Twist',
  'Side Plank': 'Side Bridge',
  'Barbell Squat': 'Barbell Squat',
  'Dumbbell Reverse Lunge': 'Dumbbell Rear Lunge',
  'Dumbbell Step-up': 'Dumbbell Step Ups',
  'Goblet Squat': 'Goblet Squat',
  'Hack Squat Machine': 'Hack Squat',
  'Leg Extension Machine': 'Leg Extensions',
  'Leg Press Machine': 'Leg Press',
  'Smith Squat': 'Smith Machine Squat',
  'Barbell Shrug': 'Barbell Shrug',
  'Dumbbell Shrug': 'Dumbbell Shrug',
  'Dumbbell Overhead Triceps Extension': 'Standing Dumbbell Triceps Extension',
  'EZ Bar Skull Crusher': 'EZ-Bar Skullcrusher',
  'Long Rope Triceps Extension': 'Triceps Pushdown - Rope Attachment',
  'Overhead Cable Triceps Extension': 'Cable Rope Overhead Triceps Extension',
  'Reverse Triceps Cable Pushdown': 'Reverse Grip Triceps Pushdown',
  'Triceps Cable Pushdown': 'Triceps Pushdown',
  'Bent Over Barbell Row': 'Bent Over Barbell Row',
  'Chest Supported T-Bar Row': 'Lying T-Bar Row',
  'Chest-Supported Dumbbell Row': 'Dumbbell Incline Row',
  'Inverted Row': 'Inverted Row',
  'Seated Cable Row': 'Seated Cable Rows',
};

// free-exercise-db muscle -> the app's body-map id
const MUSCLE = {
  abdominals: 'abs', abductors: 'gluteal', adductors: 'adductors', biceps: 'biceps', calves: 'calves',
  chest: 'chest', forearms: 'forearm', glutes: 'gluteal', hamstrings: 'hamstring', lats: 'lats',
  'lower back': 'lower-back', 'middle back': 'upper-back', neck: 'trapezius', quadriceps: 'quadriceps',
  shoulders: 'front-deltoids', traps: 'trapezius', triceps: 'triceps',
};
// the source has one "shoulders" muscle; rear-delt movements go to the app's back-deltoids
const REAR_DELT = /rear|reverse fly|reverse flye|reverse machine fly|face pull|back fly/i;
// nor an obliques muscle; twisting/side-bending ab movements go to the app's obliques
const OBLIQUE = /oblique|twist|wood chop|side bridge|side bend|side plank|side jackknife|windmill/i;

const EQUIPMENT = {
  'body only': 'Bodyweight', dumbbell: 'Dumbbell', barbell: 'Barbell', cable: 'Cable Machine', machine: 'Machine',
  kettlebells: 'Kettlebell', bands: 'Bands', 'medicine ball': 'Medicine Ball', 'exercise ball': 'Exercise Ball',
  'e-z curl bar': 'EZ Bar', 'foam roll': 'Foam Roll', other: 'Other',
};

const toMuscle = (m, name) => {
  if (m === 'shoulders' && REAR_DELT.test(name)) return 'back-deltoids';
  if (m === 'abdominals' && OBLIQUE.test(name)) return 'obliques';
  return MUSCLE[m] || m;
};

const toFields = (src) => {
  const muscle = toMuscle(src.primaryMuscles[0], src.name);
  const secondaryMuscles = [...new Set([...src.primaryMuscles.slice(1), ...src.secondaryMuscles].map(m => toMuscle(m, src.name)))]
    .filter(m => m !== muscle);
  return {
    name: src.name,
    muscle,
    secondaryMuscles,
    equipment: EQUIPMENT[src.equipment] || '',
    description: src.instructions.join('\n'),
    images: src.images.map(p => IMAGE_BASE + p),
  };
};

// reps are a fixed value; timed categories get seconds/minutes
const defaultsFor = (src) => {
  if (src.category === 'stretching') return { defaultSets: 1, defaultReps: '30s' };
  if (src.category === 'cardio') return { defaultSets: 1, defaultReps: '10 min' };
  return { defaultSets: 3, defaultReps: '10' };
};

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not defined.');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const source = await res.json();
  const byName = new Map(source.map(s => [s.name, s]));
  const unknown = Object.values(MATCH).filter(n => !byName.has(n));
  if (unknown.length) throw new Error('Not in free-exercise-db: ' + unknown.join(', '));

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const E = db.collection('exercises');
  const R = db.collection('routines');
  const L = db.collection('workoutlogs');
  const existing = await E.find({}).toArray();
  const existingByName = new Map(existing.map(e => [e.name, e]));

  if (APPLY) {
    const dir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `exercise-import-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify({
      exercises: existing, routines: await R.find({}).toArray(), workoutlogs: await L.find({}).toArray(),
    }));
    console.log('Backup:', file);
  }
  console.log(APPLY ? 'APPLY' : 'DRY RUN (pass "apply" to write)');

  // 1. matched old exercises: update in place, then rename everywhere they are referenced
  const used = new Set();
  let updated = 0;
  let routineRenames = 0;
  let logRenames = 0;
  for (const [oldName, newName] of Object.entries(MATCH)) {
    const old = existingByName.get(oldName);
    used.add(newName);
    if (!old || old.images?.length) continue; // already imported on an earlier run
    const clash = existingByName.get(newName);
    if (clash && String(clash._id) !== String(old._id)) throw new Error(`"${newName}" already exists; cannot rename "${oldName}".`);
    const fields = toFields(byName.get(newName)); // keeps the old _id, videoUrl, defaultSets and defaultReps
    updated++;
    if (!APPLY) continue;
    await E.updateOne({ _id: old._id }, { $set: fields });
    const id = String(old._id);
    const r = await R.updateMany(
      { 'schedule.exercises': { $elemMatch: { $or: [{ exerciseId: id }, { exerciseName: oldName }] } } },
      { $set: { 'schedule.$[].exercises.$[ex].exerciseName': newName } },
      { arrayFilters: [{ $or: [{ 'ex.exerciseId': id }, { 'ex.exerciseName': oldName }] }] },
    );
    routineRenames += r.modifiedCount;
    const l = await L.updateMany(
      { exercises: { $elemMatch: { $or: [{ id }, { name: oldName }] } } },
      { $set: { 'exercises.$[ex].name': newName } },
      { arrayFilters: [{ $or: [{ 'ex.id': id }, { 'ex.name': oldName }] }] },
    );
    logRenames += l.modifiedCount;
  }

  // 2. everything else from the source, skipping names that already exist
  const taken = new Set([...existingByName.keys(), ...used].map(n => n.toLowerCase()));
  const inserts = source
    .filter(s => !taken.has(s.name.toLowerCase()) && s.primaryMuscles.length > 0)
    .map(s => ({ ...toFields(s), ...defaultsFor(s), videoUrl: '' }));
  if (APPLY && inserts.length) {
    const now = new Date();
    await E.insertMany(inserts.map(e => ({ ...e, createdAt: now, updatedAt: now })), { ordered: false });
  }

  const kept = existing.filter(e => !e.images?.length && !(e.name in MATCH)).map(e => e.name);
  console.log(JSON.stringify({
    matchedAndUpdated: updated,
    routinesRenamed: routineRenames,
    workoutLogsRenamed: logRenames,
    inserted: inserts.length,
    keptUnmatched: kept,
    totalAfter: APPLY ? await E.countDocuments() : existing.length + inserts.length,
  }, null, 2));
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Exercise import failed:', err.message);
  process.exitCode = 1;
  await mongoose.disconnect();
});
