import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiRoutineForm from './AiRoutineForm';
import { postAi } from '@/utils/ai';

vi.mock('@/utils/ai', () => ({ postAi: vi.fn() }));

const ROUTINE = { name: 'AI Plan', description: 'd', schedule: [] };

const setup = () => {
  const onGenerated = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(<AiRoutineForm onGenerated={onGenerated} onCancel={onCancel} />);
  const submit = () => screen.getByRole('button', { name: /Tạo lịch|Đang tạo/ });
  return { user, onGenerated, onCancel, submit };
};

beforeEach(() => {
  vi.mocked(postAi).mockReset();
});

describe('AiRoutineForm', () => {
  test('posts the chosen options', async () => {
    vi.mocked(postAi).mockResolvedValue({ routine: ROUTINE });
    const { user, onGenerated, submit } = setup();

    await user.click(screen.getByRole('button', { name: '4 ngày' }));
    await user.selectOptions(screen.getByLabelText('Dụng cụ'), 'dumbbells');
    await user.click(submit());

    expect(postAi).toHaveBeenCalledWith('/api/ai/routine', { daysPerWeek: 4, equipment: 'dumbbells', notes: '' });
    expect(onGenerated).toHaveBeenCalledWith(ROUTINE);
  });

  test('sends the notes typed by the user', async () => {
    vi.mocked(postAi).mockResolvedValue({ routine: ROUTINE });
    const { user, submit } = setup();

    await user.type(screen.getByRole('textbox', { name: /Ghi chú/ }), 'đau vai trái');
    await user.click(submit());

    expect(postAi).toHaveBeenCalledWith('/api/ai/routine', { daysPerWeek: 3, equipment: 'gym', notes: 'đau vai trái' });
  });

  test('submit disabled while pending', async () => {
    let finish: (v: { routine: typeof ROUTINE }) => void = () => {};
    vi.mocked(postAi).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { user, onGenerated, submit } = setup();

    await user.click(submit());
    expect(submit()).toBeDisabled();
    await user.click(submit());
    expect(postAi).toHaveBeenCalledTimes(1);

    finish({ routine: ROUTINE });
    await vi.waitFor(() => expect(onGenerated).toHaveBeenCalled());
  });

  test('shows the server error', async () => {
    vi.mocked(postAi).mockRejectedValue(new Error('AI không phản hồi hợp lệ, vui lòng thử lại.'));
    const { user, onGenerated, submit } = setup();

    await user.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('AI không phản hồi hợp lệ');
    expect(onGenerated).not.toHaveBeenCalled();
    expect(submit()).toBeEnabled();
  });

  test('cancel calls onCancel', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
