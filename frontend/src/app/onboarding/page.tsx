'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { apiFetch, describeError } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import { todayStr } from '@/utils/dateUtils';
import { calcEnergyPlan, goalHasPace, macroTargets } from '@/utils/nutritionCalc';
import { calcBmi, bmiCategory } from '@/utils/bmi';
import GoalPlanFields, { goalPlanError } from '@/components/GoalPlanFields';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/feedback';

export default function Onboarding() {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    age: '',
    gender: 'Nam',
    height: '',
    weight: '',
    bodyFat: '',
    goal: 'Giữ dáng',
    goalPace: 'Vừa',
    targetWeight: '',
    activityLevel: 'Vận động vừa'
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // the same calculation every other page uses (see nutritionCalc)
  const bmi = calcBmi(formData.weight, formData.height);
  const plan = calcEnergyPlan(formData);
  const macros = plan ? macroTargets(plan.target, formData) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step === 1) {
      const a = Number(formData.age);
      if (isNaN(a) || a <= 0 || a > 120) {
        toast.error('Tuổi phải là số dương hợp lệ (từ 1 đến 120)!');
        return;
      }
    }
    if (step === 2) {
      const h = Number(formData.height);
      const w = Number(formData.weight);
      if (isNaN(h) || h < 30 || h > 300) {
        toast.error('Chiều cao phải từ 30cm đến 300cm!');
        return;
      }
      if (isNaN(w) || w < 10 || w > 500) {
        toast.error('Cân nặng phải từ 10kg đến 500kg!');
        return;
      }
      const bf = formData.bodyFat.trim();
      if (bf !== '' && (isNaN(Number(bf)) || Number(bf) < 2 || Number(bf) > 70)) {
        toast.error('Tỷ lệ mỡ phải từ 2% đến 70%!');
        return;
      }
    }
    if (step === 3) {
      const problem = goalPlanError(formData, formData);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(formData.age),
          gender: formData.gender,
          height: Number(formData.height),
          weight: Number(formData.weight),
          goal: formData.goal,
          goalPace: formData.goalPace,
          targetWeight: goalHasPace(formData.goal) && formData.targetWeight.trim() !== '' ? Number(formData.targetWeight) : null,
          ...(formData.bodyFat.trim() !== '' ? { bodyFat: Number(formData.bodyFat) } : {}),
          activityLevel: formData.activityLevel,
          metricDate: todayStr() // the starting weight is the first body measurement
        })
      });

      if (res.ok) {
        await refreshProfile(); // other pages must not keep the pre-onboarding (empty) profile
        router.push('/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      toast.error(describeError(err)); // used to be silent: the button just stopped spinning
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-foreground font-sans">
      {/* Smart Glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-8 shadow-2xl relative z-10">

        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= i ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-extrabold mb-2 text-foreground">Bắt đầu thiết lập!</h2>
            <p className="text-muted-foreground text-sm mb-8">Hãy cho Smart biết một vài thông tin cơ bản về bạn nhé.</p>

            <div className="space-y-6">
              <div>
                <span id="onb-gender-label" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Giới tính của bạn</span>
                <div role="group" aria-labelledby="onb-gender-label" className="grid grid-cols-2 gap-4">
                  {['Nam', 'Nữ'].map(g => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={formData.gender === g}
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-4 rounded-2xl font-semibold border transition-all cursor-pointer ${formData.gender === g
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border border-input text-muted-foreground hover:border-primary/50'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="onb-age" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Độ tuổi</label>
                <input
                  id="onb-age"
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                  min="1"
                  max="120"
                  placeholder="VD: 25"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-extrabold mb-2 text-foreground">Chỉ số hình thể</h2>
            <p className="text-muted-foreground text-sm mb-8">Điều này giúp hệ thống tính toán lượng Calo chính xác nhất.</p>

            <div className="space-y-6">
              <div>
                <label htmlFor="onb-height" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chiều cao (cm)</label>
                <input
                  id="onb-height"
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                  min="30"
                  max="300"
                  placeholder="VD: 170"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                />
              </div>

              <div>
                <label htmlFor="onb-weight" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cân nặng (kg)</label>
                <input
                  id="onb-weight"
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                  min="10"
                  max="500"
                  placeholder="VD: 65"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                />
              </div>

              <div>
                <label htmlFor="onb-bodyfat" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tỷ lệ mỡ (%) — tùy chọn</label>
                <input
                  id="onb-bodyfat"
                  type="number"
                  name="bodyFat"
                  inputMode="decimal"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={handleChange}
                  placeholder="VD: 20"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                />
                <p className="mt-2 text-xs text-muted-foreground">Nếu có (máy đo InBody, thước kẹp...), BMR sẽ được tính theo khối nạc (Katch-McArdle). Có thể ước tính sau ở trang Cơ thể.</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-extrabold mb-2 text-foreground">Mục tiêu của bạn</h2>
            <p className="text-muted-foreground text-sm mb-8">Bạn đang hướng tới điều gì cùng Smart?</p>

            <div className="space-y-6">
              <div>
                <label htmlFor="onb-activity" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mức độ hoạt động (Tần suất vận động)</label>
                <select
                  id="onb-activity"
                  name="activityLevel"
                  value={formData.activityLevel}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                >
                  <option value="Ít vận động">Ít vận động (Văn phòng, không tập)</option>
                  <option value="Vận động nhẹ">Vận động nhẹ (Tập 1-3 ngày/tuần)</option>
                  <option value="Vận động vừa">Vận động vừa (Tập 3-5 ngày/tuần)</option>
                  <option value="Vận động nhiều">Vận động nhiều (Tập 6-7 ngày/tuần)</option>
                  <option value="Vận động cực nhiều">Vận động cực nhiều (Vận động viên)</option>
                </select>
              </div>

              <GoalPlanFields
                idPrefix="onb"
                value={formData}
                onChange={v => setFormData({ ...formData, goal: v.goal, goalPace: v.goalPace, targetWeight: v.targetWeight })}
                profile={formData}
                labelClassName="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                selectClassName="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
                inputClassName="w-full bg-background border border-input rounded-2xl px-4 py-3.5 text-foreground focus:outline-none focus:border-primary transition-colors text-base"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground mb-3">
                <Sparkles className="size-3.5 text-primary" /> Lộ trình tối ưu
              </div>
              <h2 className="text-2xl font-extrabold mb-2 text-foreground">Kế hoạch dành cho bạn</h2>
              <p className="text-muted-foreground text-sm">Dựa trên các chỉ số của bạn, đây là thông số tối ưu nhất.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background border border-border rounded-2xl p-5 text-center">
                <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider">Chỉ số BMI</div>
                <div className="text-3xl font-mono font-bold text-primary">
                  {bmi.toFixed(1)}
                </div>
                {bmi > 0 && <div className={`text-xs font-semibold mt-1 ${bmiCategory(bmi).color}`}>{bmiCategory(bmi).label}</div>}
              </div>
              <div className="bg-background border border-border rounded-2xl p-5 text-center">
                <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider">TDEE (Calo)</div>
                <div className="text-3xl font-mono font-bold text-foreground">
                  {plan?.tdee ?? 0}
                </div>
              </div>
            </div>

            <div className="bg-surface-elevated border border-primary/30 rounded-2xl p-6 text-center shadow-lg mb-8 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="text-primary text-xs font-semibold uppercase tracking-[0.2em] mb-2">Mục tiêu: {formData.goal}{plan?.pace ? ` · ${plan.pace}` : ''}</div>
                <div className="text-xs text-muted-foreground mb-2">Lượng Calo khuyến nghị nạp mỗi ngày:</div>
                <div className="text-5xl font-mono font-extrabold text-foreground" data-testid="onb-target">
                  {plan?.target ?? 0}
                </div>
                <div className="text-primary text-xs font-semibold mt-2">Kcal / Ngày</div>
                {plan && plan.weeklyChangeKg !== 0 && (
                  <div className="text-xs text-muted-foreground mt-3">
                    Dự kiến {plan.weeklyChangeKg > 0 ? '+' : ''}{plan.weeklyChangeKg} kg/tuần
                    {plan.weeksToGoal !== null && <> · khoảng {plan.weeksToGoal} tuần để đạt {formData.targetWeight} kg</>}
                  </div>
                )}
                {macros && (
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs" data-testid="onb-macros">
                    <div><span className="block font-bold text-protein">{macros.protein} g</span><span className="text-muted-foreground">Protein</span></div>
                    <div><span className="block font-bold text-carb">{macros.carbs} g</span><span className="text-muted-foreground">Carb</span></div>
                    <div><span className="block font-bold text-fat">{macros.fat} g</span><span className="text-muted-foreground">Chất béo</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-border">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={saving}
              className="flex-1 py-3.5 rounded-full bg-secondary text-foreground font-semibold hover:bg-surface-elevated transition-colors disabled:opacity-50 border border-border cursor-pointer flex items-center justify-center gap-1.5 text-sm"
            >
              <ArrowLeft className="size-4" /> Quay lại
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && (!formData.age || !formData.gender)) ||
                (step === 2 && (!formData.height || !formData.weight))
              }
              className="group flex-[2] py-3.5 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all shadow-lg glow-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 text-sm"
            >
              Tiếp tục <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex-[2] py-3.5 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all shadow-lg glow-primary disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang thiết lập...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Hoàn tất & Bắt đầu
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
