import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealSections from './MealSections';
import type { MealItem } from './types';

const meals: Record<string, MealItem[]> = {
  'Bữa Sáng': [{ id: 'a', name: 'Bánh mì', calories: 300 }],
  'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [],
};

const setup = () => {
  const setActiveMealCategory = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(
    <MealSections
      caloriesConsumed={300} handleRemoveFood={vi.fn()} meals={meals} onCopyPreviousDay={vi.fn()}
      copyBusy={false} copyNotice="" canCopy setActiveMealCategory={setActiveMealCategory} setSelectedPreviewImage={vi.fn()}
    />,
  );
  return { user, setActiveMealCategory };
};

describe('MealSections', () => {
  test('each meal has a + button that opens the add-food form for that meal', async () => {
    const { user, setActiveMealCategory } = setup();
    await user.click(screen.getByRole('button', { name: 'Thêm món vào Bữa Trưa' }));
    expect(setActiveMealCategory).toHaveBeenCalledWith('Bữa Trưa');
  });

  test('tapping a meal header folds its list on a phone and unfolds it again', async () => {
    const { user } = setup();
    const header = screen.getByRole('button', { name: /Bữa Sáng/, expanded: true });
    expect(screen.getByText('Bánh mì').closest('[data-meal-list]')).not.toHaveClass('hidden');
    await user.click(header);
    expect(screen.getByRole('button', { name: /Bữa Sáng/, expanded: false })).toBeInTheDocument();
    expect(screen.getByText('Bánh mì').closest('[data-meal-list]')).toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: /Bữa Sáng/, expanded: false }));
    expect(screen.getByText('Bánh mì').closest('[data-meal-list]')).not.toHaveClass('hidden');
  });

  test('uses icons, not emoji', () => {
    setup();
    expect(document.body.textContent).not.toMatch(/🍳|🍱|🥩|🍎|📋/);
  });
});
