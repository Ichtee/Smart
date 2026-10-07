import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomFoodsTab from './CustomFoodsTab';
import type { DbFood } from './types';
import { apiFetch } from '@/utils/api';

vi.mock('@/utils/api', () => ({ apiFetch: vi.fn() }));
const apiFetchMock = vi.mocked(apiFetch);

const mine: DbFood[] = [
  { _id: 'c1', name: 'Cơm gà nhà làm', servingSize: '1 phần', calories: 520, protein: 30, carbs: 60, fat: 15, isCustom: true },
  { _id: 'c2', name: 'Salad ức gà', servingSize: '1 tô', calories: 310, isCustom: true },
];
const system: DbFood[] = [{ _id: 's1', name: 'Phở bò', servingSize: '1 tô', calories: 450, isCustom: false }];

const setup = (dbFoods: DbFood[] = [...system, ...mine]) => {
  const onPickFood = vi.fn();
  const onBackToSearch = vi.fn();
  const mutateFoods = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(<CustomFoodsTab dbFoods={dbFoods} mutateFoods={mutateFoods} onPickFood={onPickFood} onBackToSearch={onBackToSearch} />);
  return { user, onPickFood, onBackToSearch, mutateFoods };
};

beforeEach(() => {
  apiFetchMock.mockReset();
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('confirm', vi.fn(() => true));
  localStorage.setItem('token', 'tok'); // creating a food requires being logged in
});

describe('CustomFoodsTab: list', () => {
  test('lists only the user\'s own foods, not system foods', () => {
    setup();
    expect(screen.getByText('Cơm gà nhà làm')).toBeInTheDocument();
    expect(screen.getByText('Salad ức gà')).toBeInTheDocument();
    expect(screen.queryByText('Phở bò')).not.toBeInTheDocument();
    expect(screen.getByText('520 kcal')).toBeInTheDocument();
  });

  test('empty state explains how to add the first food', () => {
    setup(system);
    expect(screen.getByText('Bạn chưa có món ăn cá nhân nào.')).toBeInTheDocument();
  });

  test('clicking a food hands it to the modal', async () => {
    const { user, onPickFood } = setup();
    await user.click(screen.getByText('Salad ức gà'));
    expect(onPickFood).toHaveBeenCalledTimes(1);
    expect(onPickFood).toHaveBeenCalledWith(mine[1]);
  });

  test('"Quay lại nhập món" goes back', async () => {
    const { user, onBackToSearch } = setup();
    await user.click(screen.getByRole('button', { name: /Quay lại nhập món/ }));
    expect(onBackToSearch).toHaveBeenCalledTimes(1);
  });
});

describe('CustomFoodsTab: deleting', () => {
  const deleteButtons = () => screen.getAllByTitle('Xóa món ăn cá nhân');

  test('asks for confirmation, deletes by id and refreshes the list', async () => {
    apiFetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const { user, mutateFoods, onPickFood } = setup();
    await user.click(deleteButtons()[0]);

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Cơm gà nhà làm'));
    expect(apiFetchMock).toHaveBeenCalledWith('/api/foods/custom/c1', { method: 'DELETE' });
    await waitFor(() => expect(mutateFoods).toHaveBeenCalledTimes(1));
    expect(onPickFood).not.toHaveBeenCalled(); // the click must not also select the row
  });

  test('declining the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { user, mutateFoods } = setup();
    await user.click(deleteButtons()[0]);
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(mutateFoods).not.toHaveBeenCalled();
  });

  test.each([
    ['a server error', () => Promise.resolve(new Response('{}', { status: 404 }))],
    ['a network error', () => Promise.reject(new TypeError('offline'))],
  ])('%s is reported and the list is not refreshed as if it worked', async (_label, respond) => {
    apiFetchMock.mockImplementation(respond);
    const { user, mutateFoods } = setup();
    await user.click(deleteButtons()[0]);
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Không xóa được')));
    expect(mutateFoods).not.toHaveBeenCalled();
  });
});

describe('CustomFoodsTab: creating a food', () => {
  const openForm = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /Tạo món mới/ }));
  const nameField = () => screen.getByPlaceholderText('VD: Cơm gà kho nấm nhà làm...') as HTMLInputElement;
  const caloriesField = () => screen.getByPlaceholderText('VD: 250') as HTMLInputElement;
  const servingField = () => screen.getByPlaceholderText('VD: 1 phần, 150g...') as HTMLInputElement;
  const macroFields = () => screen.getAllByRole('spinbutton').slice(1) as HTMLInputElement[]; // protein, carbs, fat after calories

  test('the form is hidden until asked for, and the toggle closes it again', async () => {
    const { user } = setup();
    expect(screen.queryByPlaceholderText('VD: 250')).not.toBeInTheDocument();
    await openForm(user);
    expect(caloriesField()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Đóng/ }));
    expect(screen.queryByPlaceholderText('VD: 250')).not.toBeInTheDocument();
  });

  test('"Hủy" closes the form', async () => {
    const { user } = setup();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByPlaceholderText('VD: 250')).not.toBeInTheDocument();
  });

  test('posts the food (macros default to 0), without auto-retry, then refreshes and resets the form', async () => {
    apiFetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
    const { user, mutateFoods } = setup();
    await openForm(user);
    await user.type(nameField(), '  Bún bò nhà nấu ');
    await user.type(caloriesField(), '480');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
    const [path, options, retries] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/api/foods/custom');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options!.body as string)).toEqual({
      name: 'Bún bò nhà nấu', servingSize: '1 phần', calories: 480, protein: 0, carbs: 0, fat: 0, category: 'Tất cả', image: '',
    });
    expect(retries).toBe(0);
    await waitFor(() => expect(mutateFoods).toHaveBeenCalledTimes(1));
    expect(screen.queryByPlaceholderText('VD: 250')).not.toBeInTheDocument(); // form closed after success
  });

  test('sends the macros and serving the user typed', async () => {
    apiFetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
    const { user } = setup();
    await openForm(user);
    await user.type(nameField(), 'Smoothie');
    await user.clear(servingField());
    await user.type(servingField(), '300ml');
    await user.type(caloriesField(), '250');
    const [protein, carbs, fat] = macroFields();
    await user.clear(protein); await user.type(protein, '12');
    await user.clear(carbs); await user.type(carbs, '30');
    await user.clear(fat); await user.type(fat, '4.5');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(JSON.parse(apiFetchMock.mock.calls[0][1]!.body as string)).toMatchObject({
      servingSize: '300ml', calories: 250, protein: 12, carbs: 30, fat: 4.5,
    });
  });

  test('does nothing without a name or calories', async () => {
    const { user } = setup();
    await openForm(user);
    fireEvent.submit(nameField().closest('form')!);
    expect(apiFetchMock).not.toHaveBeenCalled();
    await user.type(nameField(), 'Chỉ có tên');
    fireEvent.submit(nameField().closest('form')!);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  test('requires being logged in', async () => {
    localStorage.removeItem('token');
    const { user } = setup();
    await openForm(user);
    await user.type(nameField(), 'Món');
    await user.type(caloriesField(), '100');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('đăng nhập'));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  test('shows the server\'s reason when it refuses, and keeps what was typed', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Tên món ăn phải từ 2 đến 100 ký tự.' }), { status: 400 }));
    const { user, mutateFoods } = setup();
    await openForm(user);
    await user.type(nameField(), 'X');
    await user.type(caloriesField(), '100');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith('Tên món ăn phải từ 2 đến 100 ký tự.'));
    expect(mutateFoods).not.toHaveBeenCalled();
    expect(nameField().value).toBe('X'); // not wiped
  });

  test('a network error is reported and the save button is usable again', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('offline'));
    const { user } = setup();
    await openForm(user);
    await user.type(nameField(), 'Món');
    await user.type(caloriesField(), '100');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Lỗi kết nối')));
    expect(screen.getByRole('button', { name: 'Lưu món ăn' })).toBeEnabled();
  });

  test('the save button is disabled while the request is in flight (no double submit)', async () => {
    let finish!: (r: Response) => void;
    apiFetchMock.mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { user } = setup();
    await openForm(user);
    await user.type(nameField(), 'Món');
    await user.type(caloriesField(), '100');
    await user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));

    const saving = await screen.findByRole('button', { name: 'Đang lưu...' });
    expect(saving).toBeDisabled();
    finish(new Response('{}', { status: 201 }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Đang lưu...' })).not.toBeInTheDocument());
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });
});
