'use client';
import Link from 'next/link';
import { BarChart3, Dumbbell, Flame, Scale, TrendingUp } from 'lucide-react';
import { calcEnergyPlan, calcLeanMass, goalTargets, usableBodyFat, type BodyProfile } from '@/utils/nutritionCalc';

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

const FORMULA_LABEL = { mifflin: 'Mifflin-St Jeor', katch: 'Katch-McArdle (theo % mỡ)' } as const;

/** BMR / TDEE, the calorie plan of the goal and pace, and body composition when a body fat is known. */
export default function MetabolismCard({ profile }: { profile: BodyProfile }) {
  const plan = calcEnergyPlan(profile);
  const byGoal = goalTargets(profile);
  const bodyFat = usableBodyFat(profile.bodyFat);
  const lean = calcLeanMass(profile.weight, bodyFat);

  return (
    <section aria-labelledby="metabolism-title" className="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 id="metabolism-title" className="text-base md:text-lg font-black text-foreground flex items-center gap-2"><BarChart3 className="size-5 text-primary" aria-hidden="true" /> Chỉ Số Chuyển Hóa</h3>
        <Link href="/profile" className="inline-block py-2 -my-2 text-xs text-primary hover:underline font-bold">Cập nhật Hồ sơ ↗</Link>
      </div>

      {!plan || !byGoal ? (
        <p className="text-sm text-muted-foreground">Cần đủ tuổi, chiều cao và cân nặng trong hồ sơ để tính BMR, TDEE và mục tiêu calo.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
              <span className="text-xs text-muted-foreground block">Chiều cao / Cân nặng</span>
              <strong className="text-foreground text-base font-black mt-1 block">{profile.height} cm / {profile.weight} kg</strong>
            </div>
            <div className="bg-secondary/50 p-4 rounded-2xl border border-border">
              <span className="text-xs text-muted-foreground block">Mục tiêu</span>
              <strong className="text-primary text-base font-black mt-1 block">{plan.goal || 'Giữ dáng'}{plan.pace ? ` · ${plan.pace}` : ''}</strong>
            </div>
          </div>

          <div data-testid="energy-plan" className="bg-secondary/50 p-3 rounded-2xl border border-border space-y-1.5 text-sm">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2"><TrendingUp className="size-4" aria-hidden="true" /> Kế hoạch của bạn</h4>
            <div className="flex justify-between"><span className="text-muted-foreground">Calo mục tiêu</span><strong>{plan.target} kcal/ngày</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">So với TDEE</span><strong>{signed(plan.delta)} kcal</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Thay đổi dự kiến</span><strong>{signed(plan.weeklyChangeKg)} kg/tuần</strong></div>
            {plan.weeksToGoal !== null && (
              <div className="flex justify-between"><span className="text-muted-foreground">Đến {profile.targetWeight} kg</span><strong>khoảng {plan.weeksToGoal} tuần</strong></div>
            )}
            <p className="text-xs text-muted-foreground pt-1">Ước tính theo 7700 kcal/kg; trang Cơ thể sẽ hiệu chỉnh theo xu hướng cân thực tế.</p>
          </div>

          <div className="bg-secondary/50 p-3 rounded-2xl border border-border space-y-1.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Calo theo từng mục tiêu{plan.pace ? ` (tốc độ ${plan.pace.toLowerCase()})` : ''}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Dumbbell className="size-4 text-success" aria-hidden="true" /> Tăng cơ</span><strong className="text-success">{byGoal['Tăng cơ']} kcal</strong></div>
              <div className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Flame className="size-4 text-pr" aria-hidden="true" /> Giảm mỡ</span><strong className="text-primary">{byGoal['Giảm mỡ']} kcal</strong></div>
              <div className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Scale className="size-4 text-warning" aria-hidden="true" /> Giữ dáng</span><strong className="text-warning">{byGoal['Giữ dáng']} kcal</strong></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 p-3 rounded-2xl border border-border text-center">
              <span className="text-xs text-muted-foreground block">BMR</span>
              <strong className="text-foreground text-xl font-black">{plan.bmr.toLocaleString()}</strong>
              <span className="text-xs text-muted-foreground block">kcal/ngày</span>
            </div>
            <div className="bg-secondary/50 p-3 rounded-2xl border border-border text-center">
              <span className="text-xs text-muted-foreground block">TDEE</span>
              <strong className="text-primary text-xl font-black">{plan.tdee.toLocaleString()}</strong>
              <span className="text-xs text-muted-foreground block">kcal/ngày</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="bmr-formula">BMR theo công thức {FORMULA_LABEL[plan.formula]}.</p>

          {lean !== null && bodyFat !== null && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 p-3 rounded-2xl border border-border text-center">
                <span className="text-xs text-muted-foreground block">Khối nạc</span>
                <strong className="text-foreground text-xl font-black">{lean} kg</strong>
              </div>
              <div className="bg-secondary/50 p-3 rounded-2xl border border-border text-center">
                <span className="text-xs text-muted-foreground block">Khối mỡ ({bodyFat}%)</span>
                <strong className="text-foreground text-xl font-black">{Math.round((Number(profile.weight) - lean) * 10) / 10} kg</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
