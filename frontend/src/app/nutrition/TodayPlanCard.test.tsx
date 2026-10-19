import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodayPlanCard from './TodayPlanCard';
import type { MealPlan } from '@/types/domain';

const item = (id: string, name: string, calories: number) => ({ id, name, calories, quantity: '1 phần' });
const PLAN: MealPlan = {
  id: 'p1', name: 'Tuần ăn sạch', targetCalories: 2000,
  days: [{ name: 'Ngày 2', meals: { 'Bữa Sáng': [item('a', 'Yến mạch', 400)], 'Bữa Trưa': [item('b', 'Cơm gà', 600)] } }],
};

const setup = (canApply = true, defaultOpen = true) => {
  const onApply = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(<TodayPlanCard plan={PLAN} day={PLAN.days[0]} canApply={canApply} onApply={onApply} defaultOpen={defaultOpen} />);
  return { user, onApply };
};

describe('TodayPlanCard', () => {
  test('names the plan and the day, and shows the day total against the target', () => {
    setup();
    expect(screen.getByRole('button', { name: /Thực đơn hôm nay/ })).toHaveTextContent('Tuần ăn sạch · Ngày 2');
    expect(screen.getByText(/1000 \/ 2000 kcal/)).toBeInTheDocument();
  });

  test('lists the foods of each meal that has some', () => {
    setup();
    expect(screen.getByText('Yến mạch')).toBeInTheDocument();
    expect(screen.getByText('Cơm gà')).toBeInTheDocument();
    expect(screen.queryByText('Bữa Tối')).not.toBeInTheDocument();
  });

  test('"Thêm cả ngày vào nhật ký" applies the whole day', async () => {
    const { user, onApply } = setup();
    await user.click(screen.getByRole('button', { name: 'Thêm cả ngày vào nhật ký' }));
    expect(onApply).toHaveBeenCalledWith();
  });

  test('per-meal Thêm calls onApply with that meal', async () => {
    const { user, onApply } = setup();
    await user.click(screen.getByRole('button', { name: 'Thêm Bữa Trưa vào nhật ký' }));
    expect(onApply).toHaveBeenCalledWith('Bữa Trưa');
  });

  test('TodayPlanCard apply is disabled until the day has loaded', async () => {
    const { user, onApply } = setup(false);
    const buttons = [screen.getByRole('button', { name: 'Thêm cả ngày vào nhật ký' }), screen.getByRole('button', { name: 'Thêm Bữa Sáng vào nhật ký' })];
    for (const b of buttons) expect(b).toBeDisabled();
    await user.click(buttons[0]);
    expect(onApply).not.toHaveBeenCalled();
  });

  test('the header folds the card', async () => {
    const { user } = setup();
    const header = screen.getByRole('button', { name: /Thực đơn hôm nay/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Yến mạch')).not.toBeInTheDocument();
  });

  test('folded by default, but "Thêm cả ngày" is still on the header', async () => {
    const { user, onApply } = setup(true, false);
    expect(screen.getByRole('button', { name: /Thực đơn hôm nay/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Yến mạch')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm cả ngày vào nhật ký' }));
    expect(onApply).toHaveBeenCalledWith();
  });
});
