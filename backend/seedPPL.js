const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exercise = require('./models/Exercise');

dotenv.config();

const exercises = [
  // CHEST (Ngực)
  { muscle: 'chest', name: 'Pec Deck Fly', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'chest', name: 'Incline Dumbbell Chest Press', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'chest', name: 'Smith Incline Press', defaultSets: 3, defaultReps: '10' },
  
  // BACK (Lưng - upper-back)
  { muscle: 'upper-back', name: 'Straight Arm Pulldown', defaultSets: 3, defaultReps: '15' },
  { muscle: 'upper-back', name: 'Lat Pulldown', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'upper-back', name: 'Chest Supported T-Bar Row', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'upper-back', name: 'Seated Cable Row', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'upper-back', name: 'Assisted Pull Up', defaultSets: 3, defaultReps: '12' },
  
  // SHOULDERS (Vai - chia ra Vai trước/giữa và Vai sau)
  { muscle: 'front-deltoids', name: 'Shoulder Press Machine', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'front-deltoids', name: 'Chest Supported Dumbbell Lateral Raise', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'back-deltoids', name: 'Pec Deck Rear Delt Fly', defaultSets: 3, defaultReps: '12' },
  { muscle: 'front-deltoids', name: 'Cable Lateral Raise', defaultSets: 3, defaultReps: '10' },
  { muscle: 'front-deltoids', name: 'Smith Shoulder Press', defaultSets: 3, defaultReps: '8-10' },
  
  // ARMS (Tay - Biceps / Triceps)
  { muscle: 'triceps', name: 'Overhead Cable Triceps Extension', defaultSets: 3, defaultReps: '12' },
  { muscle: 'biceps', name: 'EZ Bar Cable Bicep Curl', defaultSets: 3, defaultReps: '12' },
  { muscle: 'triceps', name: 'Reverse Face Rope Triceps Pushdown', defaultSets: 3, defaultReps: '12' },
  { muscle: 'biceps', name: 'Bench Support Incline Cable Curl', defaultSets: 3, defaultReps: '10-12' },
  
  // LEGS (Chân Mông - chia chi tiết Đùi trước, Đùi sau, Khép, Bắp chân, Mông)
  { muscle: 'hamstring', name: 'Lying Leg Curl', defaultSets: 3, defaultReps: '10' },
  { muscle: 'quadriceps', name: 'Leg Extension', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'quadriceps', name: 'Hack Squat', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'quadriceps', name: 'Leg Press', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'quadriceps', name: 'Bulgarian Split Squat', defaultSets: 2, defaultReps: '12' },
  { muscle: 'calves', name: 'Standing Calf Raise', defaultSets: 4, defaultReps: '15' },
  { muscle: 'adductors', name: 'Adductor', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'hamstring', name: 'Dumbbell RDL', defaultSets: 3, defaultReps: '10' },
  { muscle: 'hamstring', name: 'Seated Leg Curl', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'gluteal', name: 'Hip Thrust', defaultSets: 3, defaultReps: '12' },
  { muscle: 'calves', name: 'Seated Calf Raise', defaultSets: 4, defaultReps: '15' },
  
  // EXTRA MUSCLES (Cho Bản đồ cơ bắp)
  { muscle: 'trapezius', name: 'Barbell Shrug', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'trapezius', name: 'Dumbbell Shrug', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'lats', name: 'Pull Up', defaultSets: 3, defaultReps: '8-10' },
  { muscle: 'lats', name: 'V-Bar Pulldown', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'lower-back', name: 'Back Extension', defaultSets: 3, defaultReps: '15' },
  { muscle: 'lower-back', name: 'Good Morning', defaultSets: 3, defaultReps: '10-12' },
  { muscle: 'abs', name: 'Cable Crunch', defaultSets: 3, defaultReps: '15-20' },
  { muscle: 'abs', name: 'Hanging Leg Raise', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'obliques', name: 'Russian Twist', defaultSets: 3, defaultReps: '20' },
  { muscle: 'obliques', name: 'Woodchopper', defaultSets: 3, defaultReps: '12-15' },
  { muscle: 'forearm', name: 'Wrist Curl', defaultSets: 3, defaultReps: '15' },
  { muscle: 'forearm', name: 'Reverse Wrist Curl', defaultSets: 3, defaultReps: '15' }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    await Exercise.deleteMany({});
    console.log('Cleared existing exercises');

    await Exercise.insertMany(exercises);
    console.log(`Seed ${exercises.length} DETAILED exercises successful!`);

    process.exit();
  } catch (err) {
    console.error('Error seeding DB', err);
    process.exit(1);
  }
};

seedDB();
