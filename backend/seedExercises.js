const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exercise = require('./models/Exercise');

dotenv.config();

const exercises = [
  { muscle: 'Chest', name: 'Barbell Bench Press', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Chest', name: 'Incline Dumbbell Press', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Chest', name: 'Cable Crossover', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'Chest', name: 'Push-ups', defaultSets: 3, defaultReps: 'To failure' },
  { muscle: 'Back', name: 'Lat Pulldown', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Back', name: 'Barbell Row', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'Back', name: 'Face Pulls', defaultSets: 3, defaultReps: '15' },
  { muscle: 'Shoulders', name: 'Overhead Press', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Shoulders', name: 'Lateral Raise', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'Arms', name: 'Barbell Curl', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Arms', name: 'Tricep Extension', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'Legs', name: 'Squat', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'Legs', name: 'Leg Press', defaultSets: 3, defaultReps: '10-12' },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    await Exercise.deleteMany({});
    console.log('Cleared existing exercises');

    await Exercise.insertMany(exercises);
    console.log('Seed exercises successful!');

    process.exit();
  } catch (err) {
    console.error('Error seeding DB', err);
    process.exit(1);
  }
};

seedDB();
