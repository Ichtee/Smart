'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    age: '',
    gender: 'Nam',
    height: '',
    weight: '',
    goal: 'Giữ dáng',
    activityLevel: 'Vận động vừa'
  });

  const [results, setResults] = useState({
    bmi: 0,
    bmr: 0,
    tdee: 0,
    targetCalories: 0
  });

  useEffect(() => {
    // If we reach step 4, calculate the results
    if (step === 4) {
      const w = Number(formData.weight);
      const h = Number(formData.height);
      const a = Number(formData.age);
      
      // BMI
      const hInM = h / 100;
      const bmi = w / (hInM * hInM);

      // BMR (Mifflin-St Jeor)
      let bmr = (10 * w) + (6.25 * h) - (5 * a);
      if (formData.gender === 'Nam') {
        bmr += 5;
      } else {
        bmr -= 161;
      }

      // TDEE
      let multiplier = 1.2;
      switch (formData.activityLevel) {
        case 'Ít vận động': multiplier = 1.2; break;
        case 'Vận động nhẹ': multiplier = 1.375; break;
        case 'Vận động vừa': multiplier = 1.55; break;
        case 'Vận động nhiều': multiplier = 1.725; break;
        case 'Vận động cực nhiều': multiplier = 1.9; break;
      }
      const tdee = bmr * multiplier;

      // Target Calories
      let targetCalories = tdee;
      if (formData.goal === 'Giảm mỡ') targetCalories -= 500;
      else if (formData.goal === 'Tăng cơ' || formData.goal === 'Tăng cân') targetCalories += 300;

      setResults({ bmi, bmr, tdee, targetCalories });
    }
  }, [step, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          age: Number(formData.age),
          gender: formData.gender,
          height: Number(formData.height),
          weight: Number(formData.weight),
          goal: formData.goal,
          activityLevel: formData.activityLevel
        })
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        alert('Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-zinc-800'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Bắt đầu nào!</h2>
            <p className="text-zinc-400 mb-8">Hãy cho MyFitness biết một vài thông tin cơ bản về bạn nhé.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Giới tính của bạn</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Nam', 'Nữ'].map(g => (
                    <button 
                      key={g}
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-4 rounded-xl font-medium border transition-all ${
                        formData.gender === g 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Độ tuổi</label>
                <input 
                  type="number" 
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="VD: 25"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-lg"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Chỉ số hình thể</h2>
            <p className="text-zinc-400 mb-8">Điều này giúp hệ thống tính toán lượng Calo chính xác nhất.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Chiều cao (cm)</label>
                <input 
                  type="number" 
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="VD: 170"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Cân nặng (kg)</label>
                <input 
                  type="number" 
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="VD: 65"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-lg"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Mục tiêu của bạn</h2>
            <p className="text-zinc-400 mb-8">Bạn đang hướng tới điều gì cùng MyFitness?</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Mục tiêu chính</label>
                <select 
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-lg"
                >
                  <option value="Tăng cơ">Tăng cơ</option>
                  <option value="Giảm mỡ">Giảm mỡ</option>
                  <option value="Giữ dáng">Giữ dáng</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Mức độ hoạt động (Tần suất vận động)</label>
                <select 
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-lg"
                >
                  <option value="Ít vận động">Ít vận động (Văn phòng, không tập)</option>
                  <option value="Vận động nhẹ">Vận động nhẹ (Tập 1-3 ngày/tuần)</option>
                  <option value="Vận động vừa">Vận động vừa (Tập 3-5 ngày/tuần)</option>
                  <option value="Vận động nhiều">Vận động nhiều (Tập 6-7 ngày/tuần)</option>
                  <option value="Vận động cực nhiều">Vận động cực nhiều (Vận động viên)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Kế hoạch dành cho bạn</h2>
              <p className="text-zinc-400">Dựa trên các chỉ số của bạn, đây là thông số tối ưu nhất.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
                <div className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-wider">Chỉ số BMI</div>
                <div className="text-4xl font-mono font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                  {results.bmi.toFixed(1)}
                </div>
              </div>
              <div className="bg-zinc-950/80 border border-white/5 rounded-2xl p-6 text-center shadow-inner">
                <div className="text-zinc-500 text-sm font-medium mb-1 uppercase tracking-wider">TDEE (Calo)</div>
                <div className="text-4xl font-mono font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.3)]">
                  {Math.round(results.tdee)}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-lg shadow-emerald-500/10 mb-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="text-emerald-300/80 text-sm font-bold uppercase tracking-[0.2em] mb-2">Mục tiêu: {formData.goal}</div>
                <div className="text-sm text-zinc-400 mb-2">Lượng Calo khuyến nghị nạp mỗi ngày:</div>
                <div className="text-6xl font-mono font-bold text-white drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                  {Math.round(results.targetCalories)}
                </div>
                <div className="text-emerald-400 text-sm font-medium mt-2">Kcal / Ngày</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
          {step > 1 && (
            <button 
              onClick={handleBack}
              disabled={saving}
              className="flex-1 py-4 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Quay lại
            </button>
          )}
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              disabled={
                (step === 1 && (!formData.age || !formData.gender)) ||
                (step === 2 && (!formData.height || !formData.weight))
              }
              className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              disabled={saving}
              className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Đang thiết lập...' : 'Hoàn tất & Bắt đầu'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
