import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiMealPlanForm from './AiMealPlanForm';
import { postAi } from '@/utils/ai';

vi.mock('@/utils/ai', () => ({ postAi: vi.fn() }));

const PLAN = { name: 'AI', description: '', targetCalories: 2000, days: [] };

const setup = () => {
  const onGenerated = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(<AiMealPlanForm targetCalories={2000} proteinG={120} onGenerated={onGenerated} onCancel={onCancel} />);
  const submit = () => screen.getByRole('button', { name: /Tạo thực đơn|Đang tạo/ });
  return { user, onGenerated, onCancel, submit };
};

beforeEach(() => { vi.mocked(postAi).mockReset(); }); // braces: a returned mock would be run as cleanup

describe('AiMealPlanForm', () => {
  test('shows the target taken from the profile', () => {
    setup();
    expect(screen.getByText(/2000 kcal · 120 g protein/)).toBeInTheDocument();
  });

  test('posts the chosen options', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: PLAN });
    const { user, onGenerated, submit } = setup();
    await user.click(screen.getByRole('button', { name: '5 ngày' }));
    await user.selectOptions(screen.getByLabelText('Ngân sách'), 'thrifty');
    await user.type(screen.getByLabelText('Ghi chú'), ' dị ứng tôm ');
    await user.click(submit());
    expect(postAi).toHaveBeenCalledWith('/api/ai/meal-plan', { days: 5, targetCalories: 2000, proteinG: 120, budget: 'thrifty', notes: 'dị ứng tôm' });
    expect(onGenerated).toHaveBeenCalledWith(PLAN);
  });

  test('defaults: 3 days, normal budget, no notes', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: PLAN });
    const { user, submit } = setup();
    await user.click(submit());
    expect(postAi).toHaveBeenCalledWith('/api/ai/meal-plan', { days: 3, targetCalories: 2000, proteinG: 120, budget: 'normal', notes: '' });
  });

  test('shows the server error and lets the user retry', async () => {
    vi.mocked(postAi).mockRejectedValue(new Error('AI đang quá tải, vui lòng thử lại sau.'));
    const { user, onGenerated, submit } = setup();
    await user.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('AI đang quá tải');
    expect(onGenerated).not.toHaveBeenCalled();
    expect(submit()).toBeEnabled();
  });

  test('cancel calls onCancel', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
