import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import MacroSummary from './MacroSummary';
import { macroTargets } from '@/utils/nutritionCalc';
import type { MealItem } from './types';

const meals = (items: MealItem[]) => ({ 'Bữa Sáng': items, 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] });

describe('MacroSummary', () => {
  test('shows real protein/carbs/fat of the logged foods against the 30/50/20 targets', () => {
    render(<MacroSummary targetCalories={2000} meals={meals([{ id: '1', name: 'Ức gà', calories: 330, protein: 62, carbs: 0, fat: 7 }, { id: '2', name: 'Cơm', calories: 200, protein: 4, carbs: 44, fat: 0.4 }])} />);
    const t = macroTargets(2000);
    const protein = screen.getByRole('progressbar', { name: 'Protein hôm nay' });
    expect(protein).toHaveAttribute('aria-valuenow', '66');
    expect(protein).toHaveAttribute('aria-valuemax', String(t.protein));
    expect(screen.getByRole('progressbar', { name: 'Carb hôm nay' })).toHaveAttribute('aria-valuenow', '44');
    expect(screen.getByRole('progressbar', { name: 'Chất béo hôm nay' })).toHaveAttribute('aria-valuenow', '7');
  });

  test('each macro has its own color so the rings are told apart', () => {
    const { container } = render(<MacroSummary targetCalories={2000} meals={meals([])} />);
    const arcs = [...container.querySelectorAll('circle')].filter((_, i) => i % 2 === 1).map(c => c.getAttribute('class')!);
    expect(arcs[0]).toContain('text-protein');
    expect(arcs[1]).toContain('text-carb');
    expect(arcs[2]).toContain('text-fat');
  });

  test('an empty day shows zeros, never NaN', () => {
    render(<MacroSummary targetCalories={0} meals={meals([])} />);
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(screen.getByRole('progressbar', { name: 'Protein hôm nay' })).toHaveAttribute('aria-valuenow', '0');
  });
});
