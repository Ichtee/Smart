import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlanView from './MealPlanView';
import type { MealPlan } from '@/types/domain';

const item = (id: string, name: string, calories: number) => ({ id, name, calories, quantity: '1 phần', protein: 10, carbs: 20, fat: 5 });
const plan = (day1Calories: number): Pick<MealPlan, 'days' | 'targetCalories'> => ({
  targetCalories: 2000,
  days: [
    { name: 'Ngày 1', meals: { 'Bữa Sáng': [item('a', 'Yến mạch', day1Calories - 600)], 'Bữa Trưa': [item('b', 'Cơm gà', 600)] } },
    { name: 'Ngày 2', meals: { 'Bữa Tối': [item('c', 'Cá kho', 1900)] } },
  ],
});

describe('MealPlanView', () => {
  test('MealPlanView flags a day more than 15% off target', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MealPlanView plan={plan(2600)} />);
    expect(screen.getByText(/2600 \/ 2000 kcal/)).toBeInTheDocument();
    expect(screen.getByText('Lệch mục tiêu')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Ngày 2' })); // 1900 kcal: within 15%
    expect(screen.getByText(/1900 \/ 2000 kcal/)).toBeInTheDocument();
    expect(screen.queryByText('Lệch mục tiêu')).not.toBeInTheDocument();
  });

  test('shows the meals of the chosen day with quantity and kcal', async () => {
    const user = userEvent.setup({ delay: null });
    render(<MealPlanView plan={plan(2000)} />);
    expect(screen.getByRole('tab', { name: 'Ngày 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Yến mạch')).toBeInTheDocument();
    expect(screen.getAllByText('(1 phần)').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cá kho')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Ngày 2' }));
    expect(screen.getByText('Cá kho')).toBeInTheDocument();
  });

  test('read-only: no remove buttons', () => {
    render(<MealPlanView plan={plan(2000)} />);
    expect(screen.queryByRole('button', { name: /^Bỏ / })).not.toBeInTheDocument();
  });

  test('remove button calls onChange without that item', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();
    const p = plan(2000);
    render(<MealPlanView plan={p} editable onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Bỏ Yến mạch' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const days = onChange.mock.calls[0][0];
    expect(days[0].meals['Bữa Sáng']).toEqual([]);
    expect(days[0].meals['Bữa Trưa']).toHaveLength(1);
    expect(days[1]).toEqual(p.days[1]); // other days untouched
  });

  test('an empty day says so', () => {
    render(<MealPlanView plan={{ targetCalories: null, days: [{ name: 'Ngày 1', meals: {} }] }} />);
    expect(screen.getByText(/chưa có món/i)).toBeInTheDocument();
    expect(within(screen.getByRole('tablist')).getAllByRole('tab')).toHaveLength(1);
  });
});
