const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');
const Routine = require('../models/Routine');

const ALL_EXERCISES_CATALOG = [
  // CHEST
  { name: 'Pec fly', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34', description: 'Ép ngực bằng máy cô lập cơ ngực.' },
  { name: 'Pec Deck Fly Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34', description: 'Máy ép ngực Pec Deck cô lập vùng khe ngực.' },
  { name: 'Flat chest press', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=sqOw2Y6uDWQ', description: 'Đẩy ngực phẳng máy.' },
  { name: 'Flat Chest Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=sqOw2Y6uDWQ', description: 'Máy ép ngực bằng giúp cô lập cơ ngực phẳng an toàn.' },
  { name: 'Chest press', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=xUm0BiZCWlQ', description: 'Đẩy ngực ngồi.' },
  { name: 'Chest Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=xUm0BiZCWlQ', description: 'Máy đẩy ngực ngồi phát triển cơ ngực toàn diện.' },
  { name: 'Incline press', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SrqOu55lrYU', description: 'Đẩy ngực dốc lên.' },
  { name: 'Incline Press Machine', muscle: 'chest', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SrqOu55lrYU', description: 'Máy đẩy ngực dốc lên tập trung phát triển cơ ngực trên.' },
  { name: 'Incline Dumbbell Chest Press', muscle: 'chest', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8', description: 'Đẩy tạ đơn ghế dốc lên.' },
  { name: 'Smith Incline Press', muscle: 'chest', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8', description: 'Đẩy ngực dốc trên máy Smith.' },
  { name: 'Dumbbell pull over', muscle: 'chest', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=FK4rHfWKEac', description: 'Vớt tạ đơn.' },
  { name: 'Dumbbell Pullover', muscle: 'chest', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=FK4rHfWKEac', description: 'Vớt tạ đơn mở rộng vòm ngực.' },

  // BACK / LATS / UPPER BACK
  { name: 'Lat pull down', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', description: 'Kéo xô bằng cáp.' },
  { name: 'Lat Pulldown Machine', muscle: 'upper-back', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', description: 'Máy kéo xô rộng tay.' },
  { name: 'V-Bar Pulldown', muscle: 'lats', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', description: 'Kéo xô với tay cầm V-Bar.' },
  { name: 'Straight Arm Pulldown', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=Ph3v_EKLg_0', description: 'Kéo xô thẳng tay cáp đứng.' },
  { name: 'Seated Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo thuyền cáp ngồi.' },
  { name: 'Medium grip row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm vừa.' },
  { name: 'Medium Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm vừa.' },
  { name: 'Close grip row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm hẹp.' },
  { name: 'Close Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo', description: 'Chèo cáp tay cầm hẹp.' },
  { name: 'Wide grip row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=I06bUq06dNo', description: 'Chèo cáp tay cầm rộng.' },
  { name: 'Wide Grip Cable Row', muscle: 'upper-back', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=I06bUq06dNo', description: 'Chèo cáp tay cầm rộng.' },
  { name: 'Chest Supported T-Bar Row', muscle: 'upper-back', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4', description: 'Chèo T-Bar có tựa ngực.' },
  { name: 'Assisted Pull Up', muscle: 'upper-back', equipment: 'Assisted Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=y3T0L41F0Y0', description: 'Xà đơn trợ lực.' },
  { name: 'Pull Up', muscle: 'lats', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '6-10', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g', description: 'Hít xà đơn.' },
  { name: 'Back Extension', muscle: 'lower-back', equipment: 'Bench', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ph3pddpKzzw', description: 'Gập lưng ghế 45 độ.' },
  { name: 'Good Morning', muscle: 'lower-back', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vkpJ9c1vRts', description: 'Cúi chào đòn tạ.' },

  // SHOULDERS & TRAPS
  { name: 'Shoulder press', muscle: 'front-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Đẩy vai cơ bản.' },
  { name: 'Machine shoulder press', muscle: 'front-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Máy đẩy vai ngồi.' },
  { name: 'Machine Shoulder Press', muscle: 'front-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Máy đẩy vai ngồi chuyên dụng.' },
  { name: 'Smith Shoulder Press', muscle: 'front-deltoids', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8', description: 'Đẩy vai máy Smith.' },
  { name: 'Dumbbell Shoulder press', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=HzIiRoi734M', description: 'Đẩy vai tạ đơn ngồi.' },
  { name: 'Dumbbell Shoulder Press', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=HzIiRoi734M', description: 'Đẩy vai tạ đơn ngồi.' },
  { name: 'Lateral raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cơ bản.' },
  { name: 'Cable Lateral Raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cáp.' },
  { name: 'Cable one arm hip height lateral raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cáp 1 tay ngang hông.' },
  { name: 'Cable One Arm Lateral Raise', muscle: 'front-deltoids', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g', description: 'Dang vai cáp 1 tay.' },
  { name: 'Dumbbell Lateral Raise', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo', description: 'Dang vai tạ đơn.' },
  { name: 'Chest Supported Dumbbell Lateral Raise', muscle: 'front-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo', description: 'Dang vai tạ đơn tựa ngực.' },
  { name: 'Rear delt fly', muscle: 'back-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c', description: 'Ép vai sau.' },
  { name: 'Pec Deck Rear Delt Fly', muscle: 'back-deltoids', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c', description: 'Ép vai sau máy Pec Deck.' },
  { name: 'Dumbbell Rear Delt Fly', muscle: 'back-deltoids', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c', description: 'Dang vai sau tạ đơn.' },
  { name: 'Shrug', muscle: 'trapezius', equipment: 'Barbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik', description: 'Nhún cầu vai.' },
  { name: 'Barbell Shrug', muscle: 'trapezius', equipment: 'Barbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik', description: 'Nhún cầu vai tạ đòn.' },
  { name: 'Dumbbell Shrug', muscle: 'trapezius', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=g6qbq4a138U', description: 'Nhún cầu vai tạ đơn.' },
  { name: 'Smith Shrug', muscle: 'trapezius', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik', description: 'Nhún cầu vai máy Smith.' },

  // ARMS
  { name: 'Triceps pushdown', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU', description: 'Duỗi tay sau cáp.' },
  { name: 'Triceps Cable Pushdown', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU', description: 'Duỗi tay sau cáp.' },
  { name: 'Long rope triceps extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=6SS6K3lAwZ8', description: 'Duỗi tay sau dây thừng.' },
  { name: 'Long Rope Triceps Extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=6SS6K3lAwZ8', description: 'Duỗi tay sau dây thừng kéo dài.' },
  { name: 'Overhead extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE', description: 'Duỗi tay sau qua đầu.' },
  { name: 'Overhead Cable Triceps Extension', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE', description: 'Duỗi tay sau qua đầu cáp.' },
  { name: 'Reverse Triceps Pushdown', muscle: 'triceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU', description: 'Duỗi tay sau cáp ngược tay.' },
  { name: 'Preacher curl', muscle: 'biceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=fIWP-FRFNU0', description: 'Cuốn tay trước Preacher.' },
  { name: 'Preacher Curl Machine', muscle: 'biceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=fIWP-FRFNU0', description: 'Máy cuốn tay trước Preacher.' },
  { name: 'Db biceps preacher curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vngli9UR6Hw', description: 'Cuốn tay trước tạ đơn ghế Scott.' },
  { name: 'Dumbbell preacher curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vngli9UR6Hw', description: 'Cuốn tay trước tạ đơn ghế Scott.' },
  { name: 'Dumbbell Preacher Curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=vngli9UR6Hw', description: 'Cuốn tay trước tạ đơn ghế Scott.' },
  { name: 'Hammer preacher curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q', description: 'Cuốn tay búa ghế Scott.' },
  { name: 'Dumbbell Hammer curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q', description: 'Cuốn tay tay búa tạ đơn.' },
  { name: 'Dumbbell Hammer Curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q', description: 'Cuốn tay tay búa tạ đơn.' },
  { name: 'Dumbbell reverse curl', muscle: 'biceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=nRgxYX2Veak', description: 'Cuốn tay ngược tạ đơn.' },
  { name: 'EZ Bar Cable Bicep Curl', muscle: 'biceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo', description: 'Cuốn tay trước thanh EZ cáp.' },
  { name: 'Bench Support Incline Cable Curl', muscle: 'biceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=soxrZlIl35U', description: 'Cuốn cáp tựa ghế dốc.' },
  { name: 'Cable curl superset triceps extension', muscle: 'biceps', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo', description: 'Superset cuốn cáp & duỗi tay sau.' },
  { name: 'Wrist Curl', muscle: 'forearm', equipment: 'Barbell', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g', description: 'Cuốn cẳng tay tạ đòn.' },
  { name: 'Reverse Wrist Curl', muscle: 'forearm', equipment: 'Barbell', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g', description: 'Cuốn cẳng tay ngược tạ đòn.' },

  // LEGS & GLUTES
  { name: 'Squat', muscle: 'quadriceps', equipment: 'Barbell / Smith Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY', description: 'Gánh tạ Squat truyền thống.' },
  { name: 'Squat máy', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=0tn5K9NlCfo', description: 'Gánh tạ bằng máy.' },
  { name: 'Barbell Squat', muscle: 'quadriceps', equipment: 'Barbell', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY', description: 'Gánh tạ đòn tự do.' },
  { name: 'Smith Squat', muscle: 'quadriceps', equipment: 'Smith Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY', description: 'Gánh tạ máy Smith.' },
  { name: 'Machine Squat', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '8-10', videoUrl: 'https://www.youtube.com/watch?v=0tn5K9NlCfo', description: 'Máy Squat chuyên dụng.' },
  { name: 'Hack squat', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=rYgNArpwE7E', description: 'Máy Hack Squat.' },
  { name: 'Hack Squat Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=rYgNArpwE7E', description: 'Máy Hack Squat tập trung đùi trước.' },
  { name: 'Leg Press', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', description: 'Máy đạp đùi 45 độ.' },
  { name: 'Leg Press Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', description: 'Máy đạp đùi 45 độ.' },
  { name: 'Leg extension', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=m0FOpMEgero', description: 'Máy đá đùi trước.' },
  { name: 'Leg Extension Machine', muscle: 'quadriceps', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=m0FOpMEgero', description: 'Máy đá đùi trước cô lập.' },
  { name: 'Bulgarian Split Squat', muscle: 'quadriceps', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE', description: 'Squat 1 chân tạ đơn.' },

  // HAMSTRING & ADDUCTORS & GLUTES
  { name: 'Leg curl', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', description: 'Máy móc đùi sau.' },
  { name: 'Hamstring curl', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', description: 'Móc cơ đùi sau.' },
  { name: 'Lying Leg Curl Machine', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', description: 'Máy móc đùi sau nằm.' },
  { name: 'Seated Leg Curl Machine', muscle: 'hamstring', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ELOCsoDSmrg', description: 'Máy móc đùi sau ngồi.' },
  { name: 'Dumbbell RDL', muscle: 'hamstring', equipment: 'Dumbbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM', description: 'Romanian Deadlift tạ đơn.' },
  { name: 'Barbell RDL', muscle: 'hamstring', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM', description: 'Romanian Deadlift tạ đòn.' },
  { name: 'Hip adduction', muscle: 'adductors', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=34d__D9v31g', description: 'Máy ép đùi trong.' },
  { name: 'Hip Adduction Machine', muscle: 'adductors', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=34d__D9v31g', description: 'Máy ép đùi trong cô lập cơ khép.' },
  { name: 'Hip abduction', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=G_8L8n2xW3E', description: 'Máy mở đùi ngoài.' },
  { name: 'Hip Abduction Machine', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=G_8L8n2xW3E', description: 'Máy mở đùi ngoài cô lập cơ mông.' },
  { name: 'Hip Thrust', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg', description: 'Máy đẩy mông.' },
  { name: 'Hip Thrust Machine', muscle: 'gluteal', equipment: 'Machine', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg', description: 'Máy đẩy mông chuyên dụng.' },
  { name: 'Barbell Hip Thrust', muscle: 'gluteal', equipment: 'Barbell', defaultSets: 3, defaultReps: '10-12', videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg', description: 'Đẩy mông tạ đòn.' },
  { name: '45s extension hoặc hip thrust', muscle: 'gluteal', equipment: 'Bench', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=ph3pddpKzzw', description: 'Gập lưng 45 độ hoặc đẩy mông.' },
  { name: 'Seated Calf Raise', muscle: 'calves', equipment: 'Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k', description: 'Máy nhón bắp chân ngồi.' },
  { name: 'Standing Calf Raise', muscle: 'calves', equipment: 'Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k', description: 'Máy nhón bắp chân đứng.' },

  // ABS & CORE
  { name: 'Abs crunches', muscle: 'abs', equipment: 'Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=5ER5Of4MOPI', description: 'Gập bụng máy/cáp.' },
  { name: 'Abs Cable Crunches', muscle: 'abs', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=5ER5Of4MOPI', description: 'Gập bụng quỳ kéo cáp.' },
  { name: 'Hanging Leg Raise', muscle: 'abs', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=hdng3Nm1x_E', description: 'Treo người xà đơn nâng chân.' },
  { name: 'Russian Twist', muscle: 'obliques', equipment: 'Bodyweight', defaultSets: 3, defaultReps: '15-20', videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI', description: 'Xoay người gập cơ liên sườn.' },
  { name: 'Woodchopper', muscle: 'obliques', equipment: 'Cable Machine', defaultSets: 3, defaultReps: '12-15', videoUrl: 'https://www.youtube.com/watch?v=pAplQXk3dkU', description: 'Xoay người chèo cáp.' }
];

async function restoreExactUserExercises() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  let upsertedCount = 0;

  for (const exData of ALL_EXERCISES_CATALOG) {
    await Exercise.findOneAndUpdate(
      { name: exData.name },
      { $set: exData },
      { upsert: true, new: true }
    );
    upsertedCount++;
  }

  const finalCount = await Exercise.countDocuments();
  console.log(`Restored exact exercises! Processed: ${upsertedCount}, Total exercises in DB: ${finalCount}`);

  // Re-seed routines back to original exact exercise names as expected by user
  const routines = await Routine.find({});
  for (const r of routines) {
    if (r.id === 'ppl-6days') {
      r.schedule.forEach(day => {
        if (day.day === 'Thứ 7' || day.name === 'Legs Day 2') {
          day.exercises = [
            { exerciseName: 'Squat', muscle: 'quadriceps', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 },
            { exerciseName: 'Leg extension', muscle: 'quadriceps', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 },
            { exerciseName: 'Leg curl', muscle: 'hamstring', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 }
          ];
        }
      });
      await r.save();
      console.log('Restored Leg curl back to ppl-6days Legs Day 2 routine!');
    }
  }

  await mongoose.disconnect();
}

restoreExactUserExercises().catch(console.error);
