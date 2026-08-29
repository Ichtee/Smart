const Exercise = require('../models/Exercise');
const Routine = require('../models/Routine');
const WorkoutLog = require('../models/WorkoutLog');

const migrateRepsToTen = async () => {
  try {
    // 1. Update all Exercise.defaultReps to '10'
    const exRes = await Exercise.updateMany({}, { $set: { defaultReps: '10' } });

    // 2. Update all Routine schedule exercises repsRange to '10'
    const routines = await Routine.find({});
    for (const routine of routines) {
      let modified = false;
      if (routine.schedule && Array.isArray(routine.schedule)) {
        routine.schedule.forEach(day => {
          if (day.exercises && Array.isArray(day.exercises)) {
            day.exercises.forEach(ex => {
              if (ex.repsRange !== '10') {
                ex.repsRange = '10';
                modified = true;
              }
            });
          }
        });
      }
      if (modified) {
        routine.markModified('schedule');
        await routine.save();
      }
    }

    // 3. Update all WorkoutLogs exercises & detailsMap reps to fixed numbers
    const logs = await WorkoutLog.find({});
    for (const log of logs) {
      let modified = false;
      if (log.exercises && Array.isArray(log.exercises)) {
        log.exercises.forEach(ex => {
          if (ex.reps && String(ex.reps).includes('-')) {
            const match = String(ex.reps).match(/\d+/);
            ex.reps = match ? match[0] : '10';
            modified = true;
          }
        });
      }
      if (log.detailsMap && typeof log.detailsMap === 'object') {
        Object.keys(log.detailsMap).forEach(key => {
          if (log.detailsMap[key] && log.detailsMap[key].reps && String(log.detailsMap[key].reps).includes('-')) {
            const match = String(log.detailsMap[key].reps).match(/\d+/);
            log.detailsMap[key].reps = match ? match[0] : '10';
            modified = true;
          }
        });
      }
      if (modified) {
        log.markModified('exercises');
        log.markModified('detailsMap');
        await log.save();
      }
    }

    console.log('Successfully migrated all reps in MongoDB DB to fixed default of 10!');
  } catch (err) {
    console.error('Error migrating reps to 10 in MongoDB:', err.message);
  }
};

module.exports = migrateRepsToTen;
