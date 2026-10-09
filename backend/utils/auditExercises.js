// Read-only report of exercises and potential duplicate/variant groups in MongoDB.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Exercise = require('../models/Exercise');

const normalizeBase = (name) => String(name).toLowerCase()
  .replace(/\b(db)\b/g, 'dumbbell')
  .replace(/push[- ]?up/g, 'pushup')
  .replace(/lat pull down/g, 'lat pulldown')
  .replace(/dead lift/g, 'deadlift')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const duplicateKey = (name) => {
  const key = normalizeBase(name);
  if (/^(seated )?(dumbbell )?shoulder press$/.test(key)) return 'shoulder press';
  if (/^(close grip )?pushup$/.test(key)) return 'pushup';
  return key;
};

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(process.env.MONGO_URI);
  const rows = await Exercise.find({}).sort({ muscle: 1, name: 1 }).lean();

  // 1. Group by duplicateKey (strict duplicate/near-identical)
  const keyGroups = new Map();
  for (const row of rows) {
    const key = duplicateKey(row.name);
    if (!keyGroups.has(key)) keyGroups.set(key, []);
    keyGroups.get(key).push({ _id: row._id.toString(), name: row.name, muscle: row.muscle, equipment: row.equipment });
  }
  const strictDuplicates = [...keyGroups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, count: group.length, items: group }));

  // 2. Substring / Movement variant groups
  const variantPairs = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const nA = a.name.toLowerCase();
      const nB = b.name.toLowerCase();
      if (nA.includes(nB) || nB.includes(nA)) {
        variantPairs.push({
          type: 'SUBSTRING_VARIANT',
          exerciseA: { _id: a._id.toString(), name: a.name, muscle: a.muscle, equipment: a.equipment },
          exerciseB: { _id: b._id.toString(), name: b.name, muscle: b.muscle, equipment: b.equipment }
        });
      }
    }
  }

  const report = {
    totalExercises: rows.length,
    strictDuplicateGroupsCount: strictDuplicates.length,
    strictDuplicates,
    variantPairsCount: variantPairs.length,
    variantPairs,
    exercises: rows.map(r => ({
      _id: r._id.toString(),
      name: r.name,
      muscle: r.muscle,
      equipment: r.equipment
    }))
  };

  console.log(JSON.stringify(report, null, 2));
})()
  .catch((error) => { console.error('Exercise audit failed:', error.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
