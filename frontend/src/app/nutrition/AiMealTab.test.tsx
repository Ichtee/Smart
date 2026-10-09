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

  test('editing the grams rescales calories and macros from the AI estimate', async () => {
    const RICE = { name: 'Cơm', quantity: '1 chén (200 gram)', calories: 260, protein: 5, carbs: 57, fat: 0.5 };
    vi.mocked(postAi).mockResolvedValue({ items: [RICE, BREAD] });
    const { user, onAdd, analyse } = setup();
    await analyse();
    await screen.findByText('Cơm');

    expect(screen.queryByRole('spinbutton', { name: 'Khối lượng Bánh mì' })).not.toBeInTheDocument(); // no weight in "1 ổ"
    const grams = screen.getByRole('spinbutton', { name: 'Khối lượng Cơm' });
    expect(grams).toHaveValue(200);
    await user.clear(grams);
    await user.type(grams, '100');
    expect(screen.getByRole('spinbutton', { name: 'Calo Cơm' })).toHaveValue(130);

    await user.click(screen.getByRole('button', { name: 'Thêm 2 món' }));
    expect(onAdd.mock.calls[0][0][0]).toMatchObject({ name: 'Cơm', calories: 130, quantity: '1 chén (100 gram)', protein: 2.5, carbs: 28.5, fat: 0.3 });
  });

  test('an empty or zero weight blocks adding', async () => {
    vi.mocked(postAi).mockResolvedValue({ items: [{ name: 'Cơm', quantity: '200 gram', calories: 260 }] });
    const { user, analyse } = setup();
    await analyse();
    await user.clear(await screen.findByRole('spinbutton', { name: 'Khối lượng Cơm' }));
    expect(screen.getByRole('button', { name: 'Thêm 1 món' })).toBeDisabled();
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
