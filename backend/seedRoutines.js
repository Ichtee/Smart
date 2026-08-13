const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Routine = require('./models/Routine');

dotenv.config();
connectDB();

const seedData = [
  {
    id: 'ppl',
    name: 'Push - Pull - Legs (5 ngày/tuần)',
    schedule: [
      { day: 'Thứ 2', name: 'Push', targets: [
        { id: 'chest', label: 'Chest', count: 2 },
        { id: 'front-deltoids', label: 'Side Delt', count: 1 },
        { id: 'front-deltoids', label: 'Front Delt', count: 1 },
        { id: 'triceps', label: 'Triceps', count: 2 }
      ]},
      { day: 'Thứ 3', name: 'Pull', targets: [
        { id: 'upper-back', label: 'Back', count: 3 },
        { id: 'back-deltoids', label: 'Rear Delt', count: 1 },
        { id: 'biceps', label: 'Biceps', count: 1 },
        { id: 'forearm', label: 'Forearm', count: 1 }
      ]},
      { day: 'Thứ 4', name: 'Legs', targets: [
        { id: 'quadriceps', label: 'Quad', count: 2 },
        { id: 'hamstring', label: 'Hamstring', count: 2 },
        { id: 'adductors', label: 'Adductor', count: 1 },
        { id: 'calves', label: 'Calf', count: 1 }
      ]},
      { day: 'Thứ 5', name: 'Upper', targets: [
        { id: 'chest', label: 'Chest', count: 2 },
        { id: 'upper-back', label: 'Back', count: 2 },
        { id: 'front-deltoids', label: 'Shoulders', count: 2 },
        { id: 'biceps', label: 'Biceps', count: 1 },
        { id: 'triceps', label: 'Triceps', count: 1 }
      ]},
      { day: 'Thứ 6', name: 'Lower', targets: [
        { id: 'quadriceps', label: 'Quads', count: 2 },
        { id: 'hamstring', label: 'Hamstrings', count: 2 },
        { id: 'gluteal', label: 'Glute', count: 1 },
        { id: 'abs', label: 'Abs', count: 1 }
      ]},
      { day: 'Thứ 7', name: 'Nghỉ ngơi', targets: [] },
      { day: 'Chủ nhật', name: 'Nghỉ ngơi', targets: [] },
    ]
  },
  {
    id: 'upper_lower',
    name: 'Upper - Lower (4 ngày/tuần)',
    schedule: [
      { day: 'Thứ 2', name: 'Upper (Thân trên)', targets: [
        { id: 'chest', label: 'Ngực', count: 2 },
        { id: 'upper-back', label: 'Lưng trên', count: 2 },
        { id: 'front-deltoids', label: 'Vai trước/giữa', count: 2 },
        { id: 'back-deltoids', label: 'Vai sau', count: 1 },
        { id: 'biceps', label: 'Tay trước', count: 1 },
        { id: 'triceps', label: 'Tay sau', count: 1 }
      ]},
      { day: 'Thứ 3', name: 'Lower (Thân dưới)', targets: [
        { id: 'quadriceps', label: 'Đùi trước', count: 2 },
        { id: 'hamstring', label: 'Đùi sau', count: 2 },
        { id: 'calves', label: 'Bắp chân', count: 1 },
        { id: 'gluteal', label: 'Mông', count: 1 },
        { id: 'abs', label: 'Bụng', count: 1 }
      ]},
      { day: 'Thứ 4', name: 'Nghỉ ngơi', targets: [] },
      { day: 'Thứ 5', name: 'Upper (Thân trên)', targets: [
        { id: 'chest', label: 'Ngực', count: 2 },
        { id: 'upper-back', label: 'Lưng trên', count: 2 },
        { id: 'front-deltoids', label: 'Vai trước/giữa', count: 2 },
        { id: 'back-deltoids', label: 'Vai sau', count: 1 },
        { id: 'biceps', label: 'Tay trước', count: 1 },
        { id: 'triceps', label: 'Tay sau', count: 1 }
      ]},
      { day: 'Thứ 6', name: 'Lower (Thân dưới)', targets: [
        { id: 'quadriceps', label: 'Đùi trước', count: 2 },
        { id: 'hamstring', label: 'Đùi sau', count: 2 },
        { id: 'calves', label: 'Bắp chân', count: 1 },
        { id: 'gluteal', label: 'Mông', count: 1 },
        { id: 'abs', label: 'Bụng', count: 1 }
      ]},
      { day: 'Thứ 7', name: 'Nghỉ ngơi', targets: [] },
      { day: 'Chủ nhật', name: 'Nghỉ ngơi', targets: [] },
    ]
  }
];

const seedRoutines = async () => {
  try {
    await Routine.deleteMany();
    await Routine.insertMany(seedData);
    console.log('Routines seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding routines:', error);
    process.exit(1);
  }
};

seedRoutines();
