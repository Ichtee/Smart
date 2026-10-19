import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlansPage from './page';
import { apiFetch } from '@/utils/api';
import { postAi } from '@/utils/ai';
import { refreshProfile } from '@/hooks/useApi';
import { calcEnergyPlan, macroTargets } from '@/utils/nutritionCalc';
import type { MealPlan } from '@/types/domain';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
const hooks = vi.hoisted(() => ({
  plans: undefined as MealPlan[] | undefined,
  plansError: undefined as unknown,
  mutate: vi.fn(async () => undefined),
  profile: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/meal-plans' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({
  useMealPlans: () => ({ plans: hooks.plans, error: hooks.plansError, isLoading: false, mutate: hooks.mutate }),
  useProfile: () => ({ profile: hooks.profile }),
  refreshProfile: vi.fn(async () => undefined),
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));
vi.mock('@/utils/ai', () => ({ postAi: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const PROFILE = { weight: 70, height: 175, age: 30, gender: 'Nam', goal: 'Tăng cơ', activityLevel: 'Vận động vừa', activeMealPlanId: '' };
const item = (id: string, name: string, calories: number) => ({ id, name, calories, quantity: '1 phần', protein: 10, carbs: 20, fat: 5 });
const PLAN: MealPlan = {
  id: 'p1', name: 'Tuần ăn sạch', targetCalories: 2000,
  days: [
    { name: 'Ngày 1', meals: { 'Bữa Sáng': [item('a', 'Yến mạch', 400)], 'Bữa Trưa': [item('b', 'Cơm gà', 600)] } },
    { name: 'Ngày 2', meals: { 'Bữa Tối': [item('c', 'Cá kho', 1000)] } },
  ],
};
const bodyOf = (call = 0) => JSON.parse(vi.mocked(apiFetch).mock.calls[call][1]!.body as string);

const setup = (plans: MealPlan[] = [PLAN]) => {
  hooks.plans = plans;
  const user = userEvent.setup({ delay: null });
  render(<MealPlansPage />);
  return { user };
};

beforeEach(() => {
  nav.push.mockClear();
  hooks.plans = undefined;
  hooks.plansError = undefined;
  hooks.profile = { ...PROFILE };
  hooks.mutate.mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue(json({}));
  vi.mocked(postAi).mockReset();
  vi.mocked(refreshProfile).mockClear();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Meal plans: the list', () => {
  test('sits in the Dinh dưỡng section and lists my plans with a summary', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Dinh dưỡng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thực đơn' })).toHaveAttribute('aria-current', 'page');
    const row = screen.getByTestId('my-meal-plan');
    expect(row).toHaveTextContent('Tuần ăn sạch');
    expect(row).toHaveTextContent('2 ngày · ~1000 kcal/ngày');
  });

  test('marks the plan that is in use', () => {
    hooks.profile = { ...PROFILE, activeMealPlanId: 'p1' };
    setup();
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();
  });

  test('an invitation when there are none', () => {
    setup([]);
    expect(screen.getByText(/chưa có thực đơn/i)).toBeInTheDocument();
  });

  test('"Xem" shows the plan read-only', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xem' }));
    expect(screen.getByText('Yến mạch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Bỏ / })).not.toBeInTheDocument();
  });

  test('401 goes to /login; another failure shows a retry banner', () => {
    hooks.plansError = { status: 401 };
    hooks.plans = [];
    render(<MealPlansPage />);
    expect(nav.push).toHaveBeenCalledWith('/login');
  });

  test('a load failure shows a retry banner and does not redirect', () => {
    hooks.plansError = { status: 500 };
    hooks.plans = [];
    render(<MealPlansPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được');
    expect(nav.push).not.toHaveBeenCalled();
  });

  test('creating is disabled at the 10-plan limit', () => {
    setup(Array.from({ length: 10 }, (_, i) => ({ ...PLAN, id: `p${i}` })));
    expect(screen.getByRole('button', { name: /Tạo bằng AI/ })).toBeDisabled();
  });
});

describe('Meal plans: using and deleting', () => {
  test('"Dùng thực đơn này" sets activeMealPlanId and refreshes the profile', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Dùng thực đơn này' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/users/profile');
    expect(options?.method).toBe('PUT');
    expect(bodyOf()).toEqual({ activeMealPlanId: 'p1' });
    expect(await screen.findByRole('status')).toHaveTextContent('Đang dùng thực đơn "Tuần ăn sạch"');
    expect(refreshProfile).toHaveBeenCalled();
  });

  test('a failed "use" is reported and the profile is not refreshed', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 500));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Dùng thực đơn này' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đổi được');
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  test('delete asks first, then removes, reloads the list and the profile', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa thực đơn Tuần ăn sạch' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/meal-plans/p1');
    expect(vi.mocked(apiFetch).mock.calls[0][1]!.method).toBe('DELETE');
    await waitFor(() => expect(hooks.mutate).toHaveBeenCalled());
    expect(refreshProfile).toHaveBeenCalled(); // the server may have cleared the active plan
  });

  test('declining the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa thực đơn Tuần ăn sạch' }));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('Meal plans: AI draft', () => {
  const DRAFT = { name: 'AI Plan', description: 'd', targetCalories: 2000, days: PLAN.days };

  test('a generated plan opens in the editor and nothing is saved until "Lưu thực đơn"', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: DRAFT });
    const { user } = setup([]);

    await user.click(screen.getByRole('button', { name: /Tạo bằng AI/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));

    const target = calcEnergyPlan(PROFILE)!.target;
    expect(postAi).toHaveBeenCalledWith('/api/ai/meal-plan', { days: 3, targetCalories: target, proteinG: macroTargets(target, PROFILE).protein, notes: '' });
    expect(await screen.findByLabelText('Tên thực đơn')).toHaveValue('AI Plan');
    expect(screen.getByRole('status')).toHaveTextContent('Đã tạo bản nháp bằng AI');
    expect(apiFetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Lưu thực đơn' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/meal-plans');
    expect(vi.mocked(apiFetch).mock.calls[0][1]!.method).toBe('POST');
    expect(bodyOf()).toMatchObject({ name: 'AI Plan', targetCalories: 2000 });
    expect(bodyOf().days).toHaveLength(2);
    await waitFor(() => expect(hooks.mutate).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thực đơn');
  });

  test('items can be removed from the draft before saving', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: DRAFT });
    const { user } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo bằng AI/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Bỏ Yến mạch' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thực đơn' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(bodyOf().days[0].meals['Bữa Sáng']).toEqual([]);
  });

  test('a failed save shows the server message and keeps the draft', async () => {
    vi.mocked(postAi).mockResolvedValue({ plan: DRAFT });
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Bạn chỉ có thể lưu tối đa 10 thực đơn.' }, 400));
    const { user } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo bằng AI/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Lưu thực đơn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tối đa 10 thực đơn');
    expect(screen.getByLabelText('Tên thực đơn')).toHaveValue('AI Plan');
  });

  test('without a complete profile the AI form is replaced by a hint', async () => {
    hooks.profile = {};
    const { user } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo bằng AI/ }));
    expect(screen.getByText(/Hoàn thiện hồ sơ/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạo thực đơn' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: /hồ sơ/i })).toHaveAttribute('href', '/profile');
  });

  test('editing a saved plan saves with PUT', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Sửa' }));
    await user.clear(screen.getByLabelText('Tên thực đơn'));
    await user.type(screen.getByLabelText('Tên thực đơn'), 'Tên mới');
    await user.click(screen.getByRole('button', { name: 'Lưu thực đơn' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/meal-plans/p1');
    expect(vi.mocked(apiFetch).mock.calls[0][1]!.method).toBe('PUT');
    expect(bodyOf().name).toBe('Tên mới');
  });
});
