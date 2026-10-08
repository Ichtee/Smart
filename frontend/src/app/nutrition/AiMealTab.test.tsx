import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiMealTab from './AiMealTab';
import { postAi } from '@/utils/ai';

vi.mock('@/utils/ai', () => ({ postAi: vi.fn(), resizeImage: vi.fn() }));

const EGG = { name: 'Trứng', quantity: '2 quả', calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 };
const BREAD = { name: 'Bánh mì', quantity: '1 ổ', calories: 250 };

const setup = (props: Partial<React.ComponentProps<typeof AiMealTab>> = {}) => {
  const onAdd = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(<AiMealTab dayLoaded onAdd={onAdd} {...props} />);
  const analyse = async (text = '2 trứng và bánh mì') => {
    await user.type(screen.getByRole('textbox', { name: /Mô tả bữa ăn/ }), text);
    await user.click(screen.getByRole('button', { name: 'Phân tích' }));
  };
  return { user, onAdd, analyse };
};

beforeEach(() => {
  vi.mocked(postAi).mockReset();
  vi.stubGlobal('alert', vi.fn());
});

describe('AiMealTab', () => {
  test('analyses text and lists the items for review', async () => {
    vi.mocked(postAi).mockResolvedValue({ items: [EGG, BREAD] });
    const { analyse } = setup();
    await analyse();

    expect(postAi).toHaveBeenCalledWith('/api/ai/meal', { text: '2 trứng và bánh mì' });
    expect(await screen.findByText('Trứng')).toBeInTheDocument();
    expect(screen.getByText('Bánh mì')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Calo Trứng' })).toHaveValue(155);
  });

  test('lets the user edit calories and remove an item before adding', async () => {
    vi.mocked(postAi).mockResolvedValue({ items: [EGG, BREAD] });
    const { user, onAdd, analyse } = setup();
    await analyse();
    await screen.findByText('Trứng');

    const calories = screen.getByRole('spinbutton', { name: 'Calo Trứng' });
    await user.clear(calories);
    await user.type(calories, '200');
    await user.click(screen.getByRole('button', { name: 'Xóa Bánh mì' }));
    await user.click(screen.getByRole('button', { name: 'Thêm 1 món' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0];
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ name: 'Trứng', calories: 200, quantity: '2 quả', protein: 12.6, carbs: 1.1, fat: 10.6 });
    expect(typeof added[0].id).toBe('string');
  });

  test('add button disabled until day loaded', async () => {
    vi.mocked(postAi).mockResolvedValue({ items: [EGG] });
    const { analyse } = setup({ dayLoaded: false });
    await analyse();
    await screen.findByText('Trứng');
    expect(screen.getByRole('button', { name: 'Thêm 1 món' })).toBeDisabled();
  });

  test('analyse button disabled while pending', async () => {
    let finish: (v: { items: typeof EGG[] }) => void = () => {};
    vi.mocked(postAi).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { user, analyse } = setup();
    await analyse();

    expect(screen.getByRole('button', { name: /Đang phân tích/ })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(postAi).toHaveBeenCalledTimes(1);

    finish({ items: [EGG] });
    await screen.findByText('Trứng');
  });

  test('shows the server error and keeps the description', async () => {
    vi.mocked(postAi).mockRejectedValue(new Error('Không nhận ra món ăn nào, hãy thử mô tả rõ hơn.'));
    const { analyse } = setup();
    await analyse('asdf');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không nhận ra món ăn nào');
    expect(screen.getByRole('textbox', { name: /Mô tả bữa ăn/ })).toHaveValue('asdf');
  });
});
