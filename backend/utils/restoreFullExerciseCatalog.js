const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');

const FULL_EXERCISES = [
  // CHEST
  { name: 'Flat Chest Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=sqOw2Y6uDWQ', description: 'Máy ép ngực bằng giúp cô lập cơ ngực phẳng an toàn.' },
  { name: 'Chest Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=xUm0BiZCWlQ', description: 'Máy đẩy ngực ngồi phát triển cơ ngực toàn diện.' },
  { name: 'Incline Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SrqOu55lrYU', description: 'Máy đẩy ngực dốc lên tập trung phát triển cơ ngực trên.' },
  { name: 'Incline Dumbbell Chest Press', muscle: 'chest', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8', description: 'Đẩy tạ đơn ghế dốc lên tối ưu biên độ chuyển động ngực trên.' },
  { name: 'Smith Incline Press', muscle: 'chest', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8', description: 'Đẩy ngực dốc trên máy Smith giúp kiểm soát đường tạ định hình sẵn.' },
  { name: 'Pec Deck Fly Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34', description: 'Máy ép ngực Pec Deck cô lập vùng khe ngực.' },
  { name: 'Dumbbell Pullover', muscle: 'chest', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=FK4rHfWKEac', description: 'Vớt tạ đơn mở rộng vòm ngực và cơ xô.' },

  // BACK / LATS / UPPER BACK
  { name: 'Lat Pulldown Machine', muscle: 'upper-back', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', description: 'Kéo xô máy rộng tay phát triển độ rộng cơ lưng.' },
  { name: 'V-Bar Pulldown', muscle: 'lats', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', description: 'Kéo xô với tay cầm V-Bar tập trung cơ xô dưới.' },
  { name: 'Straight Arm Pulldown', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=Ph3v_EKLg_0', description: 'Kéo xô thẳng tay cáp đứng cô lập cơ xô.' },
  { name: 'Seated Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo thuyền cáp ngồi phát triển độ dầy cơ lưng giữa.' },
  { name: 'Medium Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm vừa.' },
  { name: 'Close Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm hẹp.' },
  { name: 'Wide Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=I06bUq06dNo', description: 'Chèo cáp tay cầm rộng.' },
  { name: 'Chest Supported T-Bar Row', muscle: 'upper-back', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4', description: 'Chèo T-Bar có tựa ngực giảm áp lực lên lưng dưới.' },
  { name: 'Assisted Pull Up', muscle: 'upper-back', equipment: 'Assisted Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=y3T0L41F0Y0', description: 'Xà đơn có máy trợ lực.' },
  { name: 'Pull Up', muscle: 'lats', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '6-10', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g', description: 'Hít xà đơn truyền thống.' },
  { name: 'Back Extension', muscle: 'lower-back', equipment: 'Bench', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ph3pddpKzzw', description: 'Gập lưng ghế 45 độ củng cố cơ cột sống.' },
  { name: 'Good Morning', muscle: 'lower-back', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vkpJ9c1vRts', description: 'Cúi chào đòn tạ phát triển chuỗi cơ sau.' },

  // SHOULDERS & TRAPS
  { name: 'Machine Shoulder Press', muscle: 'front-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Máy đẩy vai ngồi an toàn cho khớp vai.' },
  { name: 'Smith Shoulder Press', muscle: 'front-deltoids', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Đẩy vai máy Smith.' },
  { name: 'Dumbbell Shoulder Press', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=HzIiRoi734M', description: 'Đẩy vai tạ đơn ngồi.' },
  { name: 'Cable Lateral Raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cáp giữ lực căng liên tục.' },
  { name: 'Cable One Arm Lateral Raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cáp 1 tay.' },
  { name: 'Dumbbell Lateral Raise', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo', description: 'Dang vai tạ đơn đứng/ngồi.' },
  { name: 'Pec Deck Rear Delt Fly', muscle: 'back-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c', description: 'Ép vai sau máy Pec Deck cô lập cơ vai sau.' },
  { name: 'Dumbbell Rear Delt Fly', muscle: 'back-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c', description: 'Dang vai sau tạ đơn.' },
  { name: 'Smith Shrug', muscle: 'trapezius', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik', description: 'Nhún cầu vai máy Smith.' },
  { name: 'Barbell Shrug', muscle: 'trapezius', equipment: 'Barbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik', description: 'Nhún cầu vai tạ đòn.' },
  { name: 'Dumbbell Shrug', muscle: 'trapezius', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=g6qbq4a138U', description: 'Nhún cầu vai tạ đơn.' },

  // ARMS (BICEPS & TRICEPS & FOREARM)
  { name: 'Triceps Cable Pushdown', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU', description: 'Duỗi tay sau cáp thanh thẳng/V-bar.' },
  { name: 'Long Rope Triceps Extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=6SS6K3lAwZ8', description: 'Duỗi tay sau dây thừng kéo dài.' },
  { name: 'Overhead Cable Triceps Extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE', description: 'Duỗi tay sau qua đầu cáp.' },
  { name: 'Dumbbell Overhead Triceps Extension', muscle: 'triceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE', description: 'Duỗi tay sau qua đầu tạ đơn.' },
  { name: 'Reverse Triceps Cable Pushdown', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU', description: 'Duỗi tay sau cáp tay cầm ngửa.' },
  { name: 'Preacher Curl Machine', muscle: 'biceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=fIWP-FRFNU0', description: 'Cuốn tay trước máy Preacher cô lập bắp tay.' },
  { name: 'Dumbbell Preacher Curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vngli9UR6Hw', description: 'Cuốn tay trước tạ đơn ghế Scott.' },
  { name: 'Dumbbell Hammer Curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q', description: 'Cuốn tay tay búa tạ đơn tác động cơ cẳng tay & bắp tay.' },
  { name: 'Dumbbell Reverse Curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=nRgxYX2Veak', description: 'Cuốn tay ngược tạ đơn.' },
  { name: 'EZ Bar Cable Bicep Curl', muscle: 'biceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo', description: 'Cuốn tay trước thanh EZ cáp.' },
  { name: 'Bench Support Incline Cable Curl', muscle: 'biceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=soxrZlIl35U', description: 'Cuốn cáp tựa ghế dốc.' },
  { name: 'Wrist Curl', muscle: 'forearm', equipment: 'Barbell', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g', description: 'Cuốn cẳng tay tạ đòn.' },
  { name: 'Reverse Wrist Curl', muscle: 'forearm', equipment: 'Barbell', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g', description: 'Cuốn cẳng tay ngược tạ đòn.' },

  // LEGS & GLUTES
  { name: 'Barbell Squat', muscle: 'quadriceps', equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY', description: 'Gánh tạ đòn tự do tác động đùi trước & mông.' },
  { name: 'Smith Squat', muscle: 'quadriceps', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY', description: 'Gánh tạ trên máy Smith an toàn định vị đường tạ.' },
  { name: 'Machine Squat', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=0tn5K9NlCfo', description: 'Máy Squat chuyên dụng.' },
  { name: 'Hack Squat Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=rYgNArpwE7E', description: 'Máy Hack Squat tập trung cơ đùi trước tối đa.' },
  { name: 'Leg Press Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', description: 'Máy đạp đùi 45 độ phát triển cơ đùi.' },
  { name: 'Leg Extension Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=m0FOpMEgero', description: 'Máy đá đùi trước cô lập phần đùi trước đỉnh cao.' },
  { name: 'Bulgarian Split Squat', muscle: 'quadriceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE', description: 'Squat 1 chân tạ đơn trên ghế.' },
  { name: 'Lying Leg Curl Machine', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', description: 'Máy móc đùi sau nằm cô lập đùi sau.' },
  { name: 'Seated Leg Curl Machine', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ELOCsoDSmrg', description: 'Máy móc đùi sau ngồi.' },
  { name: 'Dumbbell RDL', muscle: 'hamstring', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM', description: 'Romanian Deadlift tạ đơn phát triển đùi sau & mông.' },
  { name: 'Barbell RDL', muscle: 'hamstring', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM', description: 'Romanian Deadlift tạ đòn.' },
  { name: 'Hip Adduction Machine', muscle: 'adductors', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=34d__D9v31g', description: 'Máy ép đùi trong cô lập cơ khép adductor.' },
  { name: 'Hip Abduction Machine', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=G_8L8n2xW3E', description: 'Máy mở đùi ngoài cô lập cơ mông nhỡ.' },
  { name: 'Hip Thrust Machine', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg', description: 'Máy đẩy mông chuyên dụng.' },
  { name: 'Barbell Hip Thrust', muscle: 'gluteal', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg', description: 'Đẩy mông tạ đòn tự do.' },
  { name: 'Standing Calf Raise Machine', muscle: 'calves', equipment: 'Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k', description: 'Máy nhón bắp chân đứng.' },
  { name: 'Seated Calf Raise Machine', muscle: 'calves', equipment: 'Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k', description: 'Máy nhón bắp chân ngồi.' },

  // ABS & CORE
  { name: 'Abs Cable Crunches', muscle: 'abs', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=5ER5Of4MOPI', description: 'Gập bụng quỳ kéo cáp.' },
  { name: 'Hanging Leg Raise', muscle: 'abs', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=hdng3Nm1x_E', description: 'Treo người xà đơn nâng chân gập bụng.' },
  { name: 'Russian Twist', muscle: 'obliques', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI', description: 'Xoay người gập cơ liên sườn.' },
  { name: 'Cable Woodchopper', muscle: 'obliques', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=pAplQXk3dkU', description: 'Xoay người chèo cáp tập cơ liên sườn.' }
];

async function restoreFullCatalog() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  // Only remove duplicates where BOTH Name and Equipment are identical!
  const currentExercises = await Exercise.find({});
  console.log('Current exercise count before restore:', currentExercises.length);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const exData of FULL_EXERCISES) {
    const existing = await Exercise.findOne({
      name: exData.name
    });

    if (existing) {
      existing.muscle = exData.muscle;
      existing.equipment = exData.equipment;
      existing.defaultSets = exData.defaultSets;
      existing.defaultReps = exData.defaultReps;
      existing.videoUrl = exData.videoUrl;
      existing.description = exData.description;
      await existing.save();
      updatedCount++;
    } else {
      await Exercise.create(exData);
      insertedCount++;
    }
  }

  const finalCount = await Exercise.countDocuments();
  console.log(`Restore complete! Inserted: ${insertedCount}, Updated: ${updatedCount}. Total exercises in DB: ${finalCount}`);
  await mongoose.disconnect();
}

restoreFullCatalog().catch(console.error);
