'use client';
import { AlertTriangle } from 'lucide-react';
import { calcBmi, BMI_UNDERWEIGHT } from '@/utils/bmi';
import { calcEnergyPlan, goalHasPace, normalizePace, PACES, type BodyProfile } from '@/utils/nutritionCalc';

export const GOALS = ['Giảm mỡ', 'Tăng cơ', 'Tăng cân', 'Giữ dáng', 'Sức bền'] as const;

const GOAL_HINT: Record<string, string> = {
  'Giảm mỡ': 'Thâm hụt calo, giảm 0.5–1% cân nặng mỗi tuần',
  'Tăng cơ': 'Dư 10–20% calo, tăng 0.25–0.5% cân nặng mỗi tuần',
  'Tăng cân': 'Dành cho người thiếu cân: thêm 300–500 kcal mỗi ngày',
  'Giữ dáng': 'Ăn bằng TDEE để giữ cân',
  'Sức bền': 'Ăn bằng TDEE, protein mức sức bền',
};

export interface GoalPlanValue {
  goal: string;
  goalPace: string;
  targetWeight: string;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/**
 * Error for a goal form, or null when it can be saved: the target weight must be a number in range,
 * on the side the goal moves to, and not underweight (BMI < 18.5, IDI & WPRO).
 */
export function goalPlanError(v: GoalPlanValue, profile: BodyProfile): string | null {
  if (v.targetWeight.trim() === '') return null;
  const target = Number(v.targetWeight);
  if (!Number.isFinite(target) || target < 10 || target > 500) return 'Cân nặng mục tiêu phải từ 10kg đến 500kg.';
  const weight = Number(profile.weight);
  if (v.goal === 'Giảm mỡ' && weight > 0 && target >= weight) return 'Với mục tiêu Giảm mỡ, cân nặng mục tiêu phải thấp hơn cân nặng hiện tại.';
  if ((v.goal === 'Tăng cơ' || v.goal === 'Tăng cân') && weight > 0 && target <= weight) return 'Với mục tiêu tăng cân/tăng cơ, cân nặng mục tiêu phải cao hơn cân nặng hiện tại.';
  const bmi = calcBmi(target, profile.height);
  if (bmi > 0 && bmi < BMI_UNDERWEIGHT) return `Cân nặng mục tiêu ${target} kg cho BMI ${bmi.toFixed(1)}, dưới mức 18.5 (thiếu cân). Hãy chọn mức cao hơn.`;
  return null;
}

/** Goal, pace (with the kcal and kg/week of each) and an optional target weight; shared by onboarding and the profile. */
export default function GoalPlanFields({ value, onChange, profile, idPrefix = 'goal', goalLabel = 'Mục tiêu chính', allowEmpty = false, selectClassName, inputClassName, labelClassName }: {
  value: GoalPlanValue;
  onChange: (next: GoalPlanValue) => void;
  /** the body data (weight, height, age, gender, activity, body fat) the kcal of each pace is computed from */
  profile: BodyProfile;
  idPrefix?: string;
  goalLabel?: string;
  /** offer "Chưa cập nhật" (no goal yet), as the profile page does */
  allowEmpty?: boolean;
  selectClassName: string;
  inputClassName: string;
  labelClassName: string;
}) {
  const pace = normalizePace(value.goalPace);
  const bmi = calcBmi(profile.weight, profile.height);
  const underweightCut = value.goal === 'Giảm mỡ' && bmi > 0 && bmi < BMI_UNDERWEIGHT;
  const error = goalPlanError(value, profile);
  const plan = calcEnergyPlan({ ...profile, goal: value.goal, goalPace: pace, targetWeight: value.targetWeight, calorieAdjustment: 0 });

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={`${idPrefix}-goal`} className={labelClassName}>{goalLabel}</label>
        <select id={`${idPrefix}-goal`} name="goal" value={value.goal} onChange={e => onChange({ ...value, goal: e.target.value })} className={selectClassName}>
          {allowEmpty && <option value="">Chưa cập nhật</option>}
          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {GOAL_HINT[value.goal] && <p className="mt-2 text-xs text-muted-foreground">{GOAL_HINT[value.goal]}.</p>}
      </div>

      {underweightCut && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span>BMI hiện tại {bmi.toFixed(1)} đang dưới 18.5 (thiếu cân). Không nên giảm mỡ thêm, hãy cân nhắc mục tiêu “Tăng cân”.</span>
        </div>
      )}

      {goalHasPace(value.goal) && (
        <div>
          <span id={`${idPrefix}-pace-label`} className={labelClassName}>Tốc độ</span>
          <div role="radiogroup" aria-labelledby={`${idPrefix}-pace-label`} className="grid grid-cols-3 gap-2 sm:gap-3">
            {PACES.map(p => {
              const option = calcEnergyPlan({ ...profile, goal: value.goal, goalPace: p, calorieAdjustment: 0 });
              const selected = p === pace;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ ...value, goalPace: p })}
                  className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${selected ? 'border-primary bg-primary/10' : 'border-input bg-background hover:border-primary/50'}`}
                >
                  <span className={`block text-sm font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>{p}</span>
                  {option && (
                    <>
                      <span className="block text-xs text-muted-foreground mt-1">{signed(option.goalDelta)} kcal/ngày</span>
                      <span className="block text-xs text-muted-foreground">{signed(option.weeklyChangeKg)} kg/tuần</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {goalHasPace(value.goal) && (
        <div>
          <label htmlFor={`${idPrefix}-target`} className={labelClassName}>Cân nặng mục tiêu (kg) — tùy chọn</label>
          <input
            id={`${idPrefix}-target`}
            type="number"
            inputMode="decimal"
            step="0.1"
            name="targetWeight"
            value={value.targetWeight}
            onChange={e => onChange({ ...value, targetWeight: e.target.value })}
            className={inputClassName}
          />
          {error ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{error}</p>
          ) : plan?.weeksToGoal != null && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="weeks-to-goal">Ước tính khoảng {plan.weeksToGoal} tuần để đạt {value.targetWeight} kg ở tốc độ này.</p>
          )}
        </div>
      )}
    </div>
  );
}
