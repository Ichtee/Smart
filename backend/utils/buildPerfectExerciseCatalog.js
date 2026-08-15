const mongoose = require('mongoose');
require('dotenv').config();
const Exercise = require('../models/Exercise');
const Routine = require('../models/Routine');

const PERFECT_EXERCISES_CATALOG = [
  // --- NGỰC (CHEST) ---
  {
    name: 'Flat Chest Press Machine',
    muscle: 'chest',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=sqOw2Y6uDWQ',
    description: 'Máy ép ngực bằng giúp cô lập cơ ngực phẳng an toàn, kiểm soát lực đẩy tối đa không lo chấn thương khớp vai.'
  },
  {
    name: 'Incline Press Machine',
    muscle: 'chest',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=SrqOu55lrYU',
    description: 'Máy đẩy ngực dốc lên giúp tập trung phát triển cơ ngực trên, định hình phom ngực cao và săn chắc.'
  },
  {
    name: 'Incline Dumbbell Chest Press',
    muscle: 'chest',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8',
    description: 'Nằm ghế dốc 30-45 độ đẩy tạ đơn, tối ưu biên độ co ép ngực trên và khắc phục lệch cơ 2 bên.'
  },
  {
    name: 'Smith Incline Press',
    muscle: 'chest',
    equipment: 'Smith Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=8iPEnV-ltC8',
    description: 'Đẩy ngực dốc trên khung máy Smith cố định đường tạ, giúp tập trung dồn lực tối đa vào ngực trên mà không lo mất thăng bằng.'
  },
  {
    name: 'Pec Deck Fly Machine',
    muscle: 'chest',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=eGjt4lk6g34',
    description: 'Máy ép ngực Pec Deck giúp cô lập vùng khe ngực giữa, tạo dãnh ngực sâu và căng tròn.'
  },
  {
    name: 'Cable Chest Fly',
    muscle: 'chest',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=Iwe6AmxVf7o',
    description: 'Đứng ép ngực bằng dây cáp kép, duy trì lực căng liên tục ở cả điểm giãn và điểm ép ngực.'
  },
  {
    name: 'Dumbbell Chest Fly',
    muscle: 'chest',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=QENKPHhQVi4',
    description: 'Nằm ghế bằng dang tạ đơn mở rộng vòm ngực, co ép ngực bằng chuyển động hình vòng cung.'
  },
  {
    name: 'Dumbbell Pullover',
    muscle: 'chest',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=FK4rHfWKEac',
    description: 'Nằm ngang ghế vớt tạ đơn qua đầu, giãn rộng lồng ngực và tác động ngực dưới cùng cơ xô.'
  },

  // --- LƯNG & XÔ (BACK / LATS / UPPER BACK / LOWER BACK) ---
  {
    name: 'Lat Pulldown Machine',
    muscle: 'upper-back',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    description: 'Kéo xô rộng tay bằng máy ngồi, tập trung mở rộng sải lưng xô tạo phom chữ V cuốn hút.'
  },
  {
    name: 'V-Bar Pulldown',
    muscle: 'lats',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    description: 'Kéo cáp xô tay cầm V-Bar khép sát hông, tập trung tác động vào phần cơ xô dưới và lưng giữa.'
  },
  {
    name: 'Reverse Grip Lat Pulldown',
    muscle: 'lats',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=ecWwS42_jMs',
    description: 'Ngửa lòng bàn tay kéo xô cáp, gia tăng phạm vi chuyển động và tác động mạnh vào xô dưới & tay trước.'
  },
  {
    name: 'Straight Arm Pulldown',
    muscle: 'upper-back',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=Ph3v_EKLg_0',
    description: 'Đứng kéo thanh cáp thẳng tay xuống hông, cô lập hoàn toàn cơ xô mà không sử dụng lực bắp tay.'
  },
  {
    name: 'Seated Cable Row',
    muscle: 'upper-back',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo',
    description: 'Chèo thuyền cáp ngồi kéo về bụng, xây dựng độ dầy cơ lưng giữa, cơ trám và vai sau.'
  },
  {
    name: 'Close Grip Cable Row',
    muscle: 'upper-back',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo',
    description: 'Chèo cáp tay cầm hẹp V-Bar sát bụng, ép chặt xả vai tăng độ dầy trung tâm lưng.'
  },
  {
    name: 'Medium Grip Cable Row',
    muscle: 'upper-back',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=GZbfZ033fBo',
    description: 'Chèo cáp tay cầm vừa ngang hông, phát triển cân bằng độ dầy cơ lưng và vai sau.'
  },
  {
    name: 'Wide Grip Cable Row',
    muscle: 'upper-back',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=I06bUq06dNo',
    description: 'Chèo cáp tay cầm rộng kéo về ngực dưới, tập trung tối đa cơ lưng trên và cơ vai sau.'
  },
  {
    name: 'Chest Supported T-Bar Row',
    muscle: 'upper-back',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4',
    description: 'Chèo tạ T-Bar có đệm tựa ngực, triệt tiêu áp lực lên cột sống lưng dưới để kéo tạ nặng an toàn.'
  },
  {
    name: 'Bent Over Barbell Row',
    muscle: 'upper-back',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=9efgcAjQe7E',
    description: 'Gập người chèo tạ đòn tự do về thắt lưng, bài tập huyền thoại phát triển toàn diện sức mạnh vùng lưng.'
  },
  {
    name: 'Assisted Pull Up',
    muscle: 'upper-back',
    equipment: 'Assisted Machine',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=y3T0L41F0Y0',
    description: 'Hít xà đơn trên máy có bàn đối trọng trợ lực, phù hợp cho việc luyện tập phom xà chuẩn.'
  },
  {
    name: 'Pull Up',
    muscle: 'lats',
    equipment: 'Bodyweight',
    defaultSets: 3,
    defaultReps: '6-10',
    videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    description: 'Hít xà đơn trọng lượng cơ thể, bài tập đa khớp hàng đầu cho cơ xô và sức mạnh thân trên.'
  },
  {
    name: 'Back Extension',
    muscle: 'lower-back',
    equipment: 'Bench',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=ph3pddpKzzw',
    description: 'Gập gân duỗi lưng trên ghế 45 độ, tăng cường độ khỏe cơ dựng sống và phòng ngừa đau lưng.'
  },
  {
    name: 'Good Morning',
    muscle: 'lower-back',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=vkpJ9c1vRts',
    description: 'Đặt đòn tạ vai sau cúi gập hông, tăng cường sức mạnh chuỗi cơ sau từ lưng dưới đến đùi sau.'
  },

  // --- VAI & CẦU VAI (SHOULDERS & TRAPS) ---
  {
    name: 'Machine Shoulder Press',
    muscle: 'front-deltoids',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8',
    description: 'Máy đẩy vai ngồi định vị quỹ đạo tạ, giúp đẩy vai an toàn cho khớp vai và cô lập cơ vai trước.'
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscle: 'front-deltoids',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=HzIiRoi734M',
    description: 'Đẩy vai tạ đơn ngồi ghế tựa, tối ưu chuyển động khớp vai và phát triển độ dày cơ vai trước.'
  },
  {
    name: 'Smith Shoulder Press',
    muscle: 'front-deltoids',
    equipment: 'Smith Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=WvLMauqrnK8',
    description: 'Đẩy vai trên khung máy Smith cố định, hỗ trợ tập nặng bùng nổ cơ vai mà không lo chao tạ.'
  },
  {
    name: 'Barbell Military Press',
    muscle: 'front-deltoids',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    description: 'Đứng đẩy đòn tạ qua đầu, bài tập compound kinh điển tăng cường sức mạnh vai trước và nhóm cơ lõi.'
  },
  {
    name: 'Cable Lateral Raise',
    muscle: 'front-deltoids',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g',
    description: 'Dang vai ngang bằng cáp đứng, giữ lực căng liên tục lên vai giữa từ vị trí hạ thấp nhất.'
  },
  {
    name: 'Cable One Arm Lateral Raise',
    muscle: 'front-deltoids',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=PzsMitRGl_g',
    description: 'Dang vai ngang cáp đơn từng tay nghiêng người nhẹ, tập trung cô lập tối đa bờ vai giữa.'
  },
  {
    name: 'Dumbbell Lateral Raise',
    muscle: 'front-deltoids',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    description: 'Dang 2 tạ đơn sang 2 bên hông, bài tập số 1 xây dựng độ rộng vai vuông nam tính.'
  },
  {
    name: 'Chest Supported Dumbbell Lateral Raise',
    muscle: 'front-deltoids',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    description: 'Nằm sấp tựa ngực ghế dốc dang tạ đơn, triệt tiêu động tác ăn gian văng người để cô lập vai giữa.'
  },
  {
    name: 'Pec Deck Rear Delt Fly',
    muscle: 'back-deltoids',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c',
    description: 'Ngồi quay mặt vào máy Pec Deck dang 2 tay ra sau, cô lập chính xác cơ vai sau.'
  },
  {
    name: 'Dumbbell Rear Delt Fly',
    muscle: 'back-deltoids',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=ttvfGg9d76c',
    description: 'Cúi gập người dang tạ đơn sang 2 bên, tác động mạnh vào vùng vai sau và lưng trên.'
  },
  {
    name: 'Face Pull Cable',
    muscle: 'back-deltoids',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk',
    description: 'Kéo dây thừng cáp về phía mặt xoay ngoài khớp vai, bài tập vàng cho vai sau & tăng độ khỏe khớp vai.'
  },
  {
    name: 'Barbell Shrug',
    muscle: 'trapezius',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik',
    description: 'Cầm đòn tạ nhún vai thẳng đứng lên trên, phát triển độ cao và độ dầy cơ cầu vai.'
  },
  {
    name: 'Dumbbell Shrug',
    muscle: 'trapezius',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=g6qbq4a138U',
    description: 'Cầm tạ đơn 2 bên nhún vai tự nhiên, tối ưu góc di chuyển vai và cơ cầu vai trên.'
  },
  {
    name: 'Smith Shrug',
    muscle: 'trapezius',
    equipment: 'Smith Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=c6KRPsC8kik',
    description: 'Nhún cầu vai trên máy Smith định vị giúp siết chặt phần cầu vai ở đỉnh chuyển động.'
  },

  // --- TAY TRƯỚC & TAY SAU & CẲNG TAY (ARMS) ---
  {
    name: 'Triceps Cable Pushdown',
    muscle: 'triceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU',
    description: 'Đứng nhấn cáp duỗi tay sau bằng thanh thẳng/V-Bar, cô lập đầu ngoài & đầu ngắn tay sau.'
  },
  {
    name: 'Long Rope Triceps Extension',
    muscle: 'triceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=6SS6K3lAwZ8',
    description: 'Nhấn cáp bằng dây thừng dài, xoay tách 2 đầu thừng ra ngoài ở đáy để siết tối đa cơ tay sau.'
  },
  {
    name: 'Overhead Cable Triceps Extension',
    muscle: 'triceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE',
    description: 'Quay lưng lại trụ cáp duỗi tay sau qua đầu, kéo giãn tối đa đầu dài (Long Head) bắp tay sau.'
  },
  {
    name: 'Dumbbell Overhead Triceps Extension',
    muscle: 'triceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=1u18yJQLwKE',
    description: 'Giữ 1 quả tạ đơn bằng 2 tay duỗi qua đầu ngồi/đứng, kích thích tối đa đầu dài cơ tay sau.'
  },
  {
    name: 'Reverse Triceps Cable Pushdown',
    muscle: 'triceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=2-LAMcpzODU',
    description: 'Duỗi cáp tay sau tay cầm ngửa bàn tay, tác động sâu vào đầu trong cơ bắp tay sau.'
  },
  {
    name: 'EZ Bar Skull Crusher',
    muscle: 'triceps',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=d_KZxkY_0cM',
    description: 'Nằm ghế bằng hạ thanh tạ EZ xuống sát trán duỗi lên, bài tập vàng tăng kích thước tay sau.'
  },
  {
    name: 'Preacher Curl Machine',
    muscle: 'biceps',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=fIWP-FRFNU0',
    description: 'Máy cuốn tay trước Preacher tựa bệ Scott, cố định khuỷu tay cô lập đỉnh bắp tay trước.'
  },
  {
    name: 'Dumbbell Preacher Curl',
    muscle: 'biceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=vngli9UR6Hw',
    description: 'Tựa bắp tay trên ghế Scott cuốn tạ đơn từng tay, loại bỏ hoàn toàn quán tính để tập trung tay trước.'
  },
  {
    name: 'Hammer Preacher Curl',
    muscle: 'biceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q',
    description: 'Cuốn tạ đơn tay cầm dọc (búa) trên ghế Scott, tác động mạnh cơ Brachialis tăng độ dầy bắp tay.'
  },
  {
    name: 'Dumbbell Hammer Curl',
    muscle: 'biceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=zC3Yb0orj0Q',
    description: 'Đứng cuốn tạ đơn tay búa dọc, phát triển cơ cánh tay cẳng tay và bắp tay trước.'
  },
  {
    name: 'Dumbbell Reverse Curl',
    muscle: 'biceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=nRgxYX2Veak',
    description: 'Cuốn tạ đơn úp bàn tay, tăng cường độ bám và độ cuồn cuộn cho vùng cơ cẳng tay.'
  },
  {
    name: 'EZ Bar Cable Bicep Curl',
    muscle: 'biceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=kwG2ipFRgfo',
    description: 'Cuốn cáp tay trước bằng thanh ngửa EZ, giảm áp lực cổ tay và duy trì căng cơ bắp tay.'
  },
  {
    name: 'Bench Support Incline Cable Curl',
    muscle: 'biceps',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=soxrZlIl35U',
    description: 'Tựa lưng ghế dốc cuốn cáp kéo từ sau ra trước, kéo giãn đầu dài bắp tay trước cực đỉnh.'
  },
  {
    name: 'Wrist Curl',
    muscle: 'forearm',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g',
    description: 'Đặt cẳng tay trên đùi cuốn cổ tay ngửa với tạ đòn, tăng độ dầy mặt trước cẳng tay.'
  },
  {
    name: 'Reverse Wrist Curl',
    muscle: 'forearm',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=8VOP3pU82_g',
    description: 'Cuốn cổ tay úp mặt cẳng tay với tạ đòn, phát triển mặt trên cẳng tay khỏe khoắn.'
  },

  // --- ĐÙI TRƯỚC & ĐÙI SAU & MÔNG & CƠ KHÉP (LEGS & GLUTES & HAMSTRINGS) ---
  {
    name: 'Barbell Squat',
    muscle: 'quadriceps',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY',
    description: 'Đặt đòn tạ vai sau gánh tạ tự do, ông vua các bài tập phát triển toàn bộ cơ đùi trước, mông & core.'
  },
  {
    name: 'Smith Squat',
    muscle: 'quadriceps',
    equipment: 'Smith Machine',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=nFAscG0XUNY',
    description: 'Gánh tạ Squat trên khung máy Smith định vị an toàn, tập trung dồn lực đùi trước mà không lo ngã tạ.'
  },
  {
    name: 'Machine Squat',
    muscle: 'quadriceps',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '8-10',
    videoUrl: 'https://www.youtube.com/watch?v=0tn5K9NlCfo',
    description: 'Máy Squat chuyên dụng đứng đạp tạ, giảm tối đa áp lực vào thắt lưng.'
  },
  {
    name: 'Hack Squat Machine',
    muscle: 'quadriceps',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=rYgNArpwE7E',
    description: 'Máy Hack Squat dốc 45 độ tựa lưng, bài tập đỉnh cao cô lập và xé nét toàn bộ đùi trước (Quads).'
  },
  {
    name: 'Leg Press Machine',
    muscle: 'quadriceps',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    description: 'Máy đạp đùi nghiêng 45 độ, cho phép nâng mức tạ cực nặng phát triển độ dầy cơ đùi.'
  },
  {
    name: 'Leg Extension Machine',
    muscle: 'quadriceps',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=m0FOpMEgero',
    description: 'Ngồi máy đá đùi trước cô lập duỗi gối, siết nét giọt nước đùi trước ở đỉnh chuyển động.'
  },
  {
    name: 'Bulgarian Split Squat',
    muscle: 'quadriceps',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE',
    description: 'Kê 1 chân ra sau ghế nhún 1 chân trước tạ đơn, bài tập sửa lệch chân và phát triển đùi mông đỉnh cao.'
  },
  {
    name: 'Leg curl',
    muscle: 'hamstring',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
    description: 'Móc đùi sau máy tổng quát, cuộn chân tác động toàn bộ nhóm cơ gân kheo đùi sau (Hamstrings).'
  },
  {
    name: 'Lying Leg Curl Machine',
    muscle: 'hamstring',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
    description: 'Nằm sấp trên máy móc đùi sau, cô lập cuộn tạ sát mông kéo giãn tối đa đầu dài gân kheo.'
  },
  {
    name: 'Seated Leg Curl Machine',
    muscle: 'hamstring',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=ELOCsoDSmrg',
    description: 'Ngồi khóa đùi cuộn đùi sau xuống dưới, tăng cường góc co ép sâu cơ đùi sau ở vị trí gập hông.'
  },
  {
    name: 'Standing Leg Curl Machine',
    muscle: 'hamstring',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=J3gWwHlhfmo',
    description: 'Đứng móc đùi sau từng chân đơn trên máy, giúp khắc phục lệch sức mạnh đùi sau 2 bên.'
  },
  {
    name: 'Barbell RDL',
    muscle: 'hamstring',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM',
    description: 'Romanian Deadlift tạ đòn hạ qua gối đẩy hông ra sau, kéo căng xé nét đùi sau & mông.'
  },
  {
    name: 'Dumbbell RDL',
    muscle: 'hamstring',
    equipment: 'Dumbbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=JCXUYuzwNrM',
    description: 'Romanian Deadlift tạ đơn di chuyển áp sát đùi, kiểm soát đường tạ mượt mà phát triển đùi sau.'
  },
  {
    name: 'Hip Adduction Machine',
    muscle: 'adductors',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=34d__D9v31g',
    description: 'Máy ép đùi trong cô lập khép chân, săn chắc cơ đùi trong (Adductors) và ổn định khớp hông.'
  },
  {
    name: 'Hip Abduction Machine',
    muscle: 'gluteal',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=G_8L8n2xW3E',
    description: 'Máy mở đùi ngoài ép chân ra 2 bên, cô lập cơ mông nhỡ (Gluteus Medius) tạo dáng mông quả táo.'
  },
  {
    name: 'Barbell Hip Thrust',
    muscle: 'gluteal',
    equipment: 'Barbell',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg',
    description: 'Tựa lưng ghế bằng đặt đòn tạ lên hông đẩy mông, bài tập đỉnh nhất xây dựng kích thước cơ mông.'
  },
  {
    name: 'Hip Thrust Machine',
    muscle: 'gluteal',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '10-12',
    videoUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg',
    description: 'Máy đẩy mông chuyên dụng khóa đai an toàn, giúp đẩy mông nặng bùng nổ dễ dàng.'
  },
  {
    name: 'Standing Calf Raise Machine',
    muscle: 'calves',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k',
    description: 'Máy nhón bắp chân đứng duỗi thẳng gối, cô lập tối đa cơ bắp chân ngoài (Gastrocnemius).'
  },
  {
    name: 'Seated Calf Raise Machine',
    muscle: 'calves',
    equipment: 'Machine',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k',
    description: 'Máy nhón bắp chân ngồi gập gối 90 độ, tập trung tác động cơ bắp chân trong (Soleus).'
  },

  // --- BỤNG & CƠ LIÊN SƯỜN (ABS & OBLIQUES) ---
  {
    name: 'Abs Cable Crunches',
    muscle: 'abs',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=5ER5Of4MOPI',
    description: 'Quỳ gối giữ dây thừng cáp gập cuộn cơ bụng xuống dưới, tăng độ sâu múi bụng 6 múi.'
  },
  {
    name: 'Hanging Leg Raise',
    muscle: 'abs',
    equipment: 'Bodyweight',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=hdng3Nm1x_E',
    description: 'Treo người xà đơn nâng 2 chân vuông góc/cuộn hông, bài tập số 1 săn chắc cơ bụng dưới.'
  },
  {
    name: 'Russian Twist',
    muscle: 'obliques',
    equipment: 'Bodyweight',
    defaultSets: 3,
    defaultReps: '15-20',
    videoUrl: 'https://www.youtube.com/watch?v=wkD8rjkodUI',
    description: 'Ngồi nhấc chân xoay thân sang 2 bên, săn chắc cơ liên sườn và thon gọn thắt eo.'
  },
  {
    name: 'Cable Woodchopper',
    muscle: 'obliques',
    equipment: 'Cable Machine',
    defaultSets: 3,
    defaultReps: '12-15',
    videoUrl: 'https://www.youtube.com/watch?v=pAplQXk3dkU',
    description: 'Kéo cáp xoay thân chéo từ trên xuống, tăng độ cắt nét cho dãnh cơ liên sườn.'
  }
];

async function buildPerfectCatalog() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas...');

  // 1. Clean up duplicate / unformatted / duplicate casing items
  await Exercise.deleteMany({});
  console.log('Cleared old exercise collection.');

  // 2. Insert all 60+ meticulously researched perfect exercise items
  const created = await Exercise.insertMany(PERFECT_EXERCISES_CATALOG);
  console.log(`Successfully built perfect exercise catalog with ${created.length} distinct exercises!`);

  // 3. Re-seed default routines with clean valid names
  const routines = await Routine.find({});
  for (const r of routines) {
    if (r.id === 'ppl-6days') {
      r.schedule.forEach(day => {
        if (day.day === 'Thứ 7' || day.name === 'Legs Day 2') {
          day.exercises = [
            { exerciseName: 'Barbell Squat', muscle: 'quadriceps', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 },
            { exerciseName: 'Leg Extension Machine', muscle: 'quadriceps', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 },
            { exerciseName: 'Leg curl', muscle: 'hamstring', sets: 3, repsRange: '4-8', rir: '1', restTimeSeconds: 180 }
          ];
        }
      });
      await r.save();
    }
  }

  await mongoose.disconnect();
}

buildPerfectCatalog().catch(console.error);
