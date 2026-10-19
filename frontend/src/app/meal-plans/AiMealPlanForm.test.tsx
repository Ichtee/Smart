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
    await user.clear(screen.getByLabelText('Số ngày'));
    await user.type(screen.getByLabelText('Số ngày'), '5');
    await user.type(screen.getByLabelText('Ngân sách mỗi ngày (VNĐ)'), '150000');
    await user.type(screen.getByLabelText('Ghi chú'), ' dị ứng tôm ');
    await user.click(submit());
    expect(postAi).toHaveBeenCalledWith('/api/ai/meal-plan', { days: 5, targetCalories: 2000, proteinG: 120, budgetPerDay: 150000, notes: 'dị ứng tôm' });
    expect(onGenerated).toHaveBeenCalledWith(PLAN);
  });

  test('defaults: 3 days, no budget, no notes', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: PLAN });
    const { user, submit } = setup();
    await user.click(submit());
    expect(postAi).toHaveBeenCalledWith('/api/ai/meal-plan', { days: 3, targetCalories: 2000, proteinG: 120, notes: '' });
  });

  test.each([
    ['0 days', 'Số ngày', '0', 'Số ngày phải từ 1 đến 7'],
    ['8 days', 'Số ngày', '8', 'Số ngày phải từ 1 đến 7'],
    ['a budget below 10.000', 'Ngân sách mỗi ngày (VNĐ)', '500', 'Ngân sách mỗi ngày'],
  ])('%s is refused before calling the AI', async (_label, field, value, message) => {
    const { user, submit } = setup();
    const input = screen.getByLabelText(field);
    await user.clear(input);
    await user.type(input, value);
    await user.click(submit());
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(postAi).not.toHaveBeenCalled();
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
