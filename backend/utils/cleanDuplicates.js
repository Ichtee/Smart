const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

async function cleanDuplicates() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  // 1. Standardize muscle fields
  const exercises = await Exercise.find({});
  for (const ex of exercises) {
    if (ex.muscle === 'adductor') {
      ex.muscle = 'adductors';
      await ex.save();
    }
  }

  // 2. Automatically find and deduplicate exact / case-insensitive duplicate exercise names
  const allCurrent = await Exercise.find({});
  const nameMap = {};
  const toDeleteIds = [];

  for (const ex of allCurrent) {
    const norm = ex.name.toLowerCase().trim().replace(/\s+/g, ' ');
    if (nameMap[norm]) {
      // Keep the one that already has detailed video or equipment, or the first one
      const existing = nameMap[norm];
      if (!existing.videoUrl && ex.videoUrl) {
        toDeleteIds.push(existing._id);
        nameMap[norm] = ex;
      } else {
        toDeleteIds.push(ex._id);
      }
    } else {
      nameMap[norm] = ex;
    }
  }

  // Extra specific synonym duplicates to remove
  const extraSynonymsToRemove = [
    '6a7ff2cc98cd00c905949c96', // Lateral raise (duplicate of Cable Lateral Raise)
    '6a7ff2cc98cd00c905949c93', // Shoulder press (generic duplicate)
    '6a7d856eafe38bb985024c98', // Shoulder Press Machine (duplicate)
    '6a7ff2cc98cd00c905949cab', // Hip adduction (duplicate of Adductor)
    '6a7ff2cc98cd00c905949ca4', // Db biceps preacher curl (duplicate)
    '6a7ff2cc98cd00c905949ca9', // Leg curl (generic duplicate)
    '6a7ff2cc98cd00c905949caa', // Hamstring curl (generic duplicate)
  ];

  const allRemoveIds = Array.from(new Set([...toDeleteIds.map(id => id.toString()), ...extraSynonymsToRemove]));
  const deleteResult = await Exercise.deleteMany({ _id: { $in: allRemoveIds } });
  console.log('Successfully deleted duplicate exercises count:', deleteResult.deletedCount);

  // 3. Format remaining exercise names cleanly with Proper Title Case
  const titleCaseMap = {
    'Squat máy': 'Machine Squat',
    'Flat chest press': 'Flat Chest Press Machine',
    'Chest press': 'Chest Press Machine',
    'Incline press': 'Incline Press Machine',
    'Dumbbell pull over': 'Dumbbell Pullover',
    'Machine shoulder press': 'Machine Shoulder Press',
    'Dumbbell Shoulder press': 'Dumbbell Shoulder Press',
    'Cable one arm hip height lateral raise': 'Cable One Arm Lateral Raise',
    'Medium grip row': 'Medium Grip Cable Row',
    'Close grip row': 'Close Grip Cable Row',
    'Wide grip row': 'Wide Grip Cable Row',
    'Cable curl superset triceps extension': 'Cable Curl & Triceps Extension',
    'Dumbbell preacher curl': 'Dumbbell Preacher Curl',
    'Dumbbell reverse curl': 'Dumbbell Reverse Curl',
    'Dumbbell Hammer curl': 'Dumbbell Hammer Curl',
    'Preacher curl': 'Preacher Curl Machine',
    'Hammer preacher curl': 'Hammer Preacher Curl',
    'Long rope triceps extension': 'Long Rope Triceps Extension',
    'Triceps pushdown': 'Triceps Cable Pushdown',
    'Triceps extension': 'Triceps Cable Extension',
    'Overhead extension': 'Overhead Cable Triceps Extension',
    'Hip abduction': 'Hip Abduction Machine',
    'Adductor': 'Hip Adduction Machine',
    '45s extension hoặc hip thrust': '45-Degree Hyperextension',
    'Abs crunches': 'Abs Cable Crunches'
  };

  const currentAll = await Exercise.find({});
  for (const ex of currentAll) {
    if (titleCaseMap[ex.name]) {
      const newName = titleCaseMap[ex.name];
      const collision = await Exercise.findOne({ name: newName, _id: { $ne: ex._id } });
      if (!collision) {
        ex.name = newName;
        await ex.save();
      }
    }
  }

  const finalAll = await Exercise.find({});
  console.log('Final clean unique exercises count in database:', finalAll.length);
  await mongoose.disconnect();
}

cleanDuplicates().catch(console.error);
