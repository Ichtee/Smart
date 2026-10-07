import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFoodModal from './AddFoodModal';
import type { DbFood, MealItem } from './types';
import { apiFetch } from '@/utils/api';

vi.mock('@/utils/api', () => ({ apiFetch: vi.fn() }));

// The real scanner needs a camera and html5-qrcode: replace it with two buttons we can press.
vi.mock('@/components/BarcodeScannerModal', async () => {
  const React = await import('react');
  return {
    default: (props: { isOpen: boolean; onClose: () => void; onDetectedProduct: (p: unknown) => void }) =>
      props.isOpen
        ? React.createElement(
            'div',
            { 'data-testid': 'scanner' },
            React.createElement('button', {
              onClick: () => {
                props.onDetectedProduct({ name: 'Sữa Vinamilk', calories: 64, protein: 3, carbs: 5, fat: 3.5, servingSize: '100ml' });
                props.onClose();
              },
            }, 'giả lập quét'),
            React.createElement('button', { onClick: props.onClose }, 'đóng máy quét'),
          )
        : null,
  };
});

const apiFetchMock = vi.mocked(apiFetch);

const foods: DbFood[] = [
  { _id: 'f1', name: 'Phở bò', servingSize: '1 tô', calories: 450, protein: 22, carbs: 55, fat: 12, isCustom: false },
  { _id: 'f2', name: 'Phở gà', servingSize: '1 tô', calories: 400, protein: 25, carbs: 50, fat: 8, isCustom: false },
  { _id: 'f3', name: 'Ức gà luộc', servingSize: '200g', calories: 220, protein: 46, carbs: 0, fat: 3.6, isCustom: false },
  { _id: 'c1', name: 'Cơm gà nhà làm', servingSize: '1 phần', calories: 520, protein: 30, carbs: 60, fat: 15, isCustom: true, image: 'https://img/c1.jpg' },
];

const NAME = 'VD: Phở bò, Ức gà, Cơm tấm...';
const CALORIES = 'VD: 400';
const SERVING = 'VD: Gói 200g, 100g, 1 tô...';

type Props = Partial<React.ComponentProps<typeof AddFoodModal>>;
const setup = (props: Props = {}) => {
  const onAddItem = vi.fn<(category: string, item: MealItem) => void>();
  const onClose = vi.fn();
  const mutateFoods = vi.fn();
  const user = userEvent.setup({ delay: null });
  const utils = render(
    <AddFoodModal category="Bữa Sáng" dbFoods={foods} dayLoaded mutateFoods={mutateFoods} onAddItem={onAddItem} onClose={onClose} {...props} />
  );
  const field = (placeholder: string) => screen.getByPlaceholderText(placeholder) as HTMLInputElement;
  const multiplier = () => screen.getAllByRole('spinbutton')[1] as HTMLInputElement; // [0] = calories, [1] = multiplier
  const total = () => screen.getByText('TỔNG CALO NẠP VÀO').parentElement!.nextElementSibling!.querySelector('span')!.textContent;
  const submit = () => user.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
  const addedItem = () => onAddItem.mock.calls[0][1];
  return { ...utils, user, onAddItem, onClose, mutateFoods, field, multiplier, total, submit, addedItem };
};

beforeEach(() => {
  apiFetchMock.mockReset();
  vi.stubGlobal('alert', vi.fn());
});

describe('AddFoodModal: opening', () => {
  test('shows which meal the food is added to and starts with an empty form', () => {
    const { field, total } = setup({ category: 'Bữa Tối' });
    expect(screen.getByText(/Thêm món vào/)).toHaveTextContent('Bữa Tối');
    expect(field(NAME).value).toBe('');
    expect(field(SERVING).value).toBe('1 phần');
    expect(field(CALORIES).value).toBe('');
    expect(total()).toBe('0');
  });

  test('every time it opens the form is fresh (the page mounts it only while open)', async () => {
    const first = setup();
    await first.user.type(first.field(NAME), 'Half typed');
    first.unmount();

    const second = setup();
    expect(second.field(NAME).value).toBe('');
  });

  test('the scanner is not shown until asked for', () => {
    setup();
    expect(screen.queryByTestId('scanner')).not.toBeInTheDocument();
  });
});

describe('AddFoodModal: calories and portions', () => {
  test('total = calories per serving x multiplier, rounded', async () => {
    const { user, field, multiplier, total } = setup();
    await user.type(field(CALORIES), '333');
    expect(total()).toBe('333');

    await user.clear(multiplier());
    await user.type(multiplier(), '1.5');
    expect(total()).toBe('500'); // 499.5 rounds up

    await user.click(screen.getByRole('button', { name: '½' }));
    expect(total()).toBe('167'); // 166.5
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(total()).toBe('999');
  });

  test('the quick multiplier buttons set the multiplier field', async () => {
    const { user, multiplier } = setup();
    for (const [label, value] of [['½', '0.5'], ['1.5', '1.5'], ['2', '2'], ['3', '3']] as const) {
      await user.click(screen.getByRole('button', { name: label }));
      expect(multiplier().value).toBe(value);
    }
  });

  test.each(['', '0', '-2'])('an empty / zero / negative multiplier (%j) gives 0 kcal, not NaN', async (value) => {
    const { user, field, multiplier, total } = setup();
    await user.type(field(CALORIES), '400');
    await user.clear(multiplier());
    if (value) await user.type(multiplier(), value);
    expect(total()).toBe('0');
  });

  test('quick suggestions are system foods of the database: they fill the form and keep the real macros', async () => {
    const { user, field, total, submit, addedItem } = setup();
    expect(screen.queryByRole('button', { name: /Cơm gà nhà làm \(/ })).not.toBeInTheDocument(); // custom foods are not suggested
    await user.click(screen.getByRole('button', { name: /Phở bò \(1 tô • 450 kcal/ }));
    expect(field(NAME).value).toBe('Phở bò');
    expect(field(SERVING).value).toBe('1 tô');
    expect(field(CALORIES).value).toBe('450');
    expect(total()).toBe('450');
    expect(screen.queryByTestId('macro-estimated')).not.toBeInTheDocument();
    await submit();
    expect(addedItem()).toMatchObject({ name: 'Phở bò', protein: 22, carbs: 55, fat: 12 });
  });

  test('a food saved without macros (null) is logged without them, so it is estimated, not counted as 0 g', async () => {
    const { user, field, submit, addedItem } = setup({ dbFoods: [{ _id: 'n1', name: 'Chè đậu', servingSize: '1 ly', calories: 300, protein: null, carbs: null, fat: null }] });
    await user.click(screen.getByRole('button', { name: /Chè đậu \(1 ly/ }));
    expect(field(CALORIES).value).toBe('300');
    expect(screen.getByTestId('macro-estimated')).toBeInTheDocument();
    await submit();
    expect(addedItem()).not.toHaveProperty('protein');
  });
});

describe('AddFoodModal: food search dropdown', () => {
  test('stays closed until something is typed', async () => {
    const { user, field } = setup();
    await user.click(field(NAME));
    expect(screen.queryByText('Phở gà')).not.toBeInTheDocument();
  });

  test('filters the database case-insensitively and shows calories', async () => {
    const { user, field } = setup();
    await user.type(field(NAME), 'PHỞ');
    expect(screen.getByText('Phở bò')).toBeInTheDocument();
    expect(screen.getByText('Phở gà')).toBeInTheDocument();
    expect(screen.queryByText('Ức gà luộc')).not.toBeInTheDocument();
    expect(screen.getByText('450 kcal')).toBeInTheDocument();
  });

  test('shows at most 8 results', async () => {
    const many: DbFood[] = Array.from({ length: 12 }, (_, i) => ({
      _id: `m${i}`, name: `Món số ${i}`, servingSize: '1', calories: 100 + i, isCustom: false,
    }));
    const { user, field } = setup({ dbFoods: many });
    await user.type(field(NAME), 'Món số');
    expect(screen.getAllByText(/^Món số \d+$/)).toHaveLength(8);
  });

  test('picking a result fills the form, closes the dropdown and keeps the real macros', async () => {
    const { user, field, total, submit, addedItem, onClose } = setup();
    await user.type(field(NAME), 'phở b');
    await user.click(screen.getByText('450 kcal'));

    expect(field(NAME).value).toBe('Phở bò');
    expect(field(SERVING).value).toBe('1 tô');
    expect(field(CALORIES).value).toBe('450');
    expect(total()).toBe('450');
    expect(screen.queryByText('Phở gà')).not.toBeInTheDocument(); // dropdown closed

    await submit();
    expect(addedItem()).toMatchObject({ name: 'Phở bò', calories: 450, protein: 22, carbs: 55, fat: 12 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a picked food that has a photo keeps it on the logged item', async () => {
    const { user, field, submit, addedItem } = setup();
    await user.type(field(NAME), 'cơm gà');
    await user.click(screen.getByText('520 kcal'));
    await submit();
    expect(addedItem().image).toBe('https://img/c1.jpg');
  });
});

describe('AddFoodModal: adding a food', () => {
  test('manual entry: no macros are invented, quantity is the serving text', async () => {
    const { user, field, submit, onAddItem, onClose, addedItem } = setup({ category: 'Ăn Vặt' });
    await user.type(field(NAME), '  Táo   đỏ ');
    await user.type(field(CALORIES), '95');
    await submit();

    expect(onAddItem).toHaveBeenCalledTimes(1);
    expect(onAddItem.mock.calls[0][0]).toBe('Ăn Vặt');
    const item = addedItem();
    expect(item).toMatchObject({ name: 'Táo đỏ', calories: 95, quantity: '1 phần' });
    expect(typeof item.id).toBe('string');
    expect(item.id.length).toBeGreaterThan(0);
    expect(item).not.toHaveProperty('protein');
    expect(item).not.toHaveProperty('carbs');
    expect(item).not.toHaveProperty('fat');
    expect(item.image).toBeUndefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a portion multiplier scales calories AND macros, and shows up in the quantity text', async () => {
    const { user, field, multiplier, submit, addedItem } = setup();
    await user.type(field(NAME), 'phở b');
    await user.click(screen.getByText('450 kcal'));
    await user.clear(multiplier());
    await user.type(multiplier(), '1.5');
    await submit();

    expect(addedItem()).toMatchObject({
      calories: 675, // 450 x 1.5
      protein: 33, // 22 x 1.5
      carbs: 82.5, // 55 x 1.5
      fat: 18, // 12 x 1.5
      quantity: '1.5 x (1 tô)',
    });
  });

  test('macros are rounded to one decimal after scaling', async () => {
    const { user, field, multiplier, submit, addedItem } = setup();
    await user.type(field(NAME), 'ức gà');
    await user.click(screen.getByText('220 kcal'));
    await user.clear(multiplier());
    await user.type(multiplier(), '1.5');
    await submit();
    expect(addedItem().fat).toBe(5.4); // 3.6 x 1.5
  });

  test('editing the calories by hand after picking a food drops its macros (they would no longer match)', async () => {
    const { user, field, submit, addedItem } = setup();
    await user.type(field(NAME), 'phở b');
    await user.click(screen.getByText('450 kcal'));
    await user.clear(field(CALORIES));
    await user.type(field(CALORIES), '300');
    await submit();
    expect(addedItem().calories).toBe(300);
    expect(addedItem()).not.toHaveProperty('protein');
  });

  test('a custom serving text is used in the quantity', async () => {
    const { user, field, multiplier, submit, addedItem } = setup();
    await user.type(field(NAME), 'Cơm');
    await user.clear(field(SERVING));
    await user.type(field(SERVING), '1 chén');
    await user.type(field(CALORIES), '200');
    await user.clear(multiplier());
    await user.type(multiplier(), '2');
    await submit();
    expect(addedItem()).toMatchObject({ calories: 400, quantity: '2 x (1 chén)' });
  });

  test('an empty serving text falls back to "1 phần"', async () => {
    const { user, field, submit, addedItem } = setup();
    await user.type(field(NAME), 'Cơm');
    await user.clear(field(SERVING));
    await user.type(field(CALORIES), '200');
    await submit();
    expect(addedItem().quantity).toBe('1 phần');
  });
});

describe('AddFoodModal: validation', () => {
  const rejected = (onAddItem: ReturnType<typeof vi.fn>, onClose: ReturnType<typeof vi.fn>) => {
    expect(onAddItem).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled(); // the modal stays open so the user can fix it
  };

  test('refuses while the selected day has not loaded, and says why', async () => {
    const { user, field, submit, onAddItem, onClose } = setup({ dayLoaded: false });
    await user.type(field(NAME), 'Cơm');
    await user.type(field(CALORIES), '200');
    await submit();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('chưa tải xong'));
    rejected(onAddItem, onClose);
  });

  test('a one-character name is refused with an alert', async () => {
    const { user, field, submit, onAddItem, onClose } = setup();
    await user.type(field(NAME), 'A');
    await user.type(field(CALORIES), '100');
    await submit();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('2 đến 60'));
    rejected(onAddItem, onClose);
  });

  test('a name that is only spaces never gets added', async () => {
    const { field, onAddItem, onClose } = setup();
    fireEvent.change(field(NAME), { target: { value: '     ' } });
    fireEvent.change(field(CALORIES), { target: { value: '100' } });
    fireEvent.submit(field(NAME).closest('form')!);
    rejected(onAddItem, onClose);
  });

  test('no calories -> nothing is added', async () => {
    const { field, onAddItem, onClose } = setup();
    fireEvent.change(field(NAME), { target: { value: 'Cơm' } });
    fireEvent.submit(field(NAME).closest('form')!);
    rejected(onAddItem, onClose);
  });

  test('a total over 10,000 kcal is refused (6000 kcal x 2)', async () => {
    const { user, field, multiplier, submit, onAddItem, onClose } = setup();
    await user.type(field(NAME), 'Buffet');
    await user.type(field(CALORIES), '6000');
    await user.clear(multiplier());
    await user.type(multiplier(), '2');
    await submit();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('10,000'));
    rejected(onAddItem, onClose);
  });

  test('exactly 10,000 kcal is allowed', async () => {
    const { user, field, submit, onAddItem } = setup();
    await user.type(field(NAME), 'Buffet');
    await user.type(field(CALORIES), '10000');
    await submit();
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });
});

describe('AddFoodModal: closing', () => {
  test('Hủy closes without adding anything', async () => {
    const { user, field, onAddItem, onClose } = setup();
    await user.type(field(NAME), 'Cơm');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAddItem).not.toHaveBeenCalled();
  });

  test('the × button and the backdrop also close it', async () => {
    const { user, onClose, container } = setup();
    await user.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(container.querySelector('.bg-black\\/70')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('AddFoodModal: "save to my foods"', () => {
  const fillAndSubmit = async (s: ReturnType<typeof setup>, opts: { save: boolean }) => {
    await s.user.type(s.field(NAME), 'phở b');
    await s.user.click(screen.getByText('450 kcal'));
    if (opts.save) await s.user.click(screen.getByRole('checkbox'));
    await s.submit();
  };

  test('unchecked: only the meal is logged, no custom food is created', async () => {
    const s = setup();
    await fillAndSubmit(s, { save: false });
    expect(s.onAddItem).toHaveBeenCalledTimes(1);
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  test('checked: creates the custom food from the per-serving values (not the multiplied ones), without auto-retry', async () => {
    apiFetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
    const s = setup();
    await s.user.type(s.field(NAME), 'phở b');
    await s.user.click(screen.getByText('450 kcal'));
    await s.user.click(screen.getByRole('checkbox'));
    await s.user.click(screen.getByRole('button', { name: '2' })); // 2 servings logged
    await s.submit();

    expect(s.addedItem().calories).toBe(900); // the meal gets the multiplied value
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const [path, options, retries] = apiFetchMock.mock.calls[0];
    expect(path).toBe('/api/foods/custom');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options!.body as string)).toEqual({
      name: 'Phở bò', servingSize: '1 tô', calories: 450, protein: 22, carbs: 55, fat: 12, image: '',
    });
    expect(retries).toBe(0); // a POST that may have succeeded must never be replayed
    await waitFor(() => expect(s.mutateFoods).toHaveBeenCalledTimes(1)); // refresh the list
  });

  test('a failing custom-food request does not break logging the meal', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('offline'));
    const s = setup();
    await fillAndSubmit(s, { save: true });
    expect(s.onAddItem).toHaveBeenCalledTimes(1);
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AddFoodModal: barcode scanner', () => {
  test('opens, fills the form with the scanned product and its macros, then logs it', async () => {
    const { user, field, total, submit, addedItem } = setup();
    await user.click(screen.getByRole('button', { name: /Quét mã vạch/ }));
    expect(screen.getByTestId('scanner')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'giả lập quét' }));
    expect(screen.queryByTestId('scanner')).not.toBeInTheDocument();
    expect(field(NAME).value).toBe('Sữa Vinamilk');
    expect(field(SERVING).value).toBe('100ml');
    expect(field(CALORIES).value).toBe('64');
    expect(total()).toBe('64');

    await submit();
    expect(addedItem()).toMatchObject({ name: 'Sữa Vinamilk', calories: 64, protein: 3, carbs: 5, fat: 3.5 });
  });

  test('a scan resets the multiplier to 1', async () => {
    const { user, multiplier } = setup();
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(multiplier().value).toBe('3');
    await user.click(screen.getByRole('button', { name: /Quét mã vạch/ }));
    await user.click(screen.getByRole('button', { name: 'giả lập quét' }));
    expect(multiplier().value).toBe('1');
  });

  test('closing the scanner without a result leaves the form untouched', async () => {
    const { user, field } = setup();
    await user.type(field(NAME), 'Giữ nguyên');
    await user.click(screen.getByRole('button', { name: /Quét mã vạch/ }));
    await user.click(screen.getByRole('button', { name: 'đóng máy quét' }));
    expect(screen.queryByTestId('scanner')).not.toBeInTheDocument();
    expect(field(NAME).value).toBe('Giữ nguyên');
  });
});

describe('AddFoodModal: "my foods" tab', () => {
  test('shows how many custom foods the user has', () => {
    setup();
    const tab = screen.getByRole('button', { name: /Món của tôi/ });
    expect(within(tab).getByText('1')).toBeInTheDocument();
  });

  test('picking a saved food fills the search form and switches back to it', async () => {
    const { user, field, total, submit, addedItem } = setup();
    await user.click(screen.getByRole('button', { name: /Món của tôi/ }));
    expect(screen.getByText('Danh sách món cá nhân')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(NAME)).not.toBeInTheDocument();

    await user.click(screen.getByText('Cơm gà nhà làm'));
    expect(field(NAME).value).toBe('Cơm gà nhà làm');
    expect(field(CALORIES).value).toBe('520');
    expect(total()).toBe('520');

    await submit();
    expect(addedItem()).toMatchObject({ name: 'Cơm gà nhà làm', calories: 520, protein: 30, carbs: 60, fat: 15, image: 'https://img/c1.jpg' });
  });

  test('"← Quay lại nhập món" returns to the search form', async () => {
    const { user, field } = setup();
    await user.click(screen.getByRole('button', { name: /Món của tôi/ }));
    await user.click(screen.getByRole('button', { name: /Quay lại nhập món/ }));
    expect(field(NAME)).toBeInTheDocument();
  });
});
