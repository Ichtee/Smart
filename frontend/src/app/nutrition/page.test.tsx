import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nutrition from './page';
import { apiFetch } from '@/utils/api';
import type { MealPlan } from '@/types/domain';

const hooks = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  plans: undefined as MealPlan[] | undefined,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/nutrition' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/components/GoogleTranslate', () => ({ default: () => null }));
vi.mock('@/hooks/useApi', () => ({
  useFoods: () => ({ foods: [], mutate: vi.fn() }),
  useProfile: () => ({ profile: hooks.profile, error: undefined, isLoading: false, mutate: vi.fn() }),
  useMealPlans: () => ({ plans: hooks.plans, error: undefined, isLoading: false, mutate: vi.fn() }),
  isUnauthorizedError: () => false,
}));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const PROFILE = { weight: 70, height: 175, age: 30, gender: 'Nam', goal: 'Tăng cơ', activityLevel: 'Vận động vừa', activeMealPlanId: 'p1' };
const item = (id: string, name: string, calories: number) => ({ id, name, calories, quantity: '1 phần' });
// one day, so the plan day does not depend on the weekday the test runs on
const PLAN: MealPlan = {
  id: 'p1', name: 'Tuần ăn sạch', targetCalories: 2000,
  days: [{ name: 'Ngày 1', meals: { 'Bữa Sáng': [item('a', 'Yến mạch', 400)], 'Bữa Trưa': [item('b', 'Cơm gà', 600)] } }],
};
const EXISTING = { 'Bữa Sáng': [item('x', 'Trứng luộc', 150)], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] };

const saves = () => vi.mocked(apiFetch).mock.calls.filter(([url, init]) => url === '/api/nutrition' && init?.method === 'POST');
const lastSave = () => JSON.parse(saves()[saves().length - 1][1]!.body as string);

beforeEach(() => {
  hooks.profile = { ...PROFILE };
  hooks.plans = [PLAN];
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockImplementation(async (url) =>
    String(url).startsWith('/api/nutrition?date=') ? json({ waterGlasses: 2, mlPerGlass: 250, meals: EXISTING }) : json({}));
});

describe('Nutrition: today\'s meal plan', () => {
  test('applying the active plan appends its foods to the log and saves once', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Nutrition />);
    await screen.findByText('Trứng luộc'); // the day has loaded
    await user.click(screen.getByRole('button', { name: 'Thêm cả ngày vào nhật ký' }));

    await waitFor(() => expect(saves()).toHaveLength(1));
    const { meals } = lastSave();
    expect(meals['Bữa Sáng'].map((i: { name: string }) => i.name)).toEqual(['Trứng luộc', 'Yến mạch']);
    expect(meals['Bữa Trưa'].map((i: { name: string }) => i.name)).toEqual(['Cơm gà']);
    expect(meals['Bữa Sáng'][1].id).not.toBe('a'); // fresh ids: removing a logged food never touches the plan
    expect(await screen.findByRole('status')).toHaveTextContent('Đã thêm 2 món từ thực đơn');
  });

  test('a single meal can be added on its own', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Nutrition />);
    await screen.findByText('Trứng luộc');
    await user.click(screen.getByRole('button', { name: /Thực đơn hôm nay/ })); // the card is folded by default
    await user.click(screen.getByRole('button', { name: 'Thêm Bữa Trưa vào nhật ký' }));

    await waitFor(() => expect(saves()).toHaveLength(1));
    const { meals } = lastSave();
    expect(meals['Bữa Trưa'].map((i: { name: string }) => i.name)).toEqual(['Cơm gà']);
    expect(meals['Bữa Sáng'].map((i: { name: string }) => i.name)).toEqual(['Trứng luộc']);
  });

  test('applying is blocked until the day has loaded', async () => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise<Response>(() => {})); // the day never loads
    render(<Nutrition />);
    expect(await screen.findByRole('button', { name: 'Thêm cả ngày vào nhật ký' })).toBeDisabled();
    expect(saves()).toHaveLength(0);
  });

  test('no card when the active plan is not in the list (deleted elsewhere)', async () => {
    hooks.plans = [{ ...PLAN, id: 'other' }];
    render(<Nutrition />);
    await screen.findByText('Trứng luộc');
    expect(screen.queryByText(/Thực đơn hôm nay/)).not.toBeInTheDocument();
  });

  test('no card without an active plan, and none while the plans are loading', async () => {
    hooks.profile = { ...PROFILE, activeMealPlanId: '' };
    const { unmount } = render(<Nutrition />);
    await screen.findByText('Trứng luộc');
    expect(screen.queryByText(/Thực đơn hôm nay/)).not.toBeInTheDocument();
    unmount();

    hooks.profile = { ...PROFILE };
    hooks.plans = undefined;
    render(<Nutrition />);
    await screen.findByText('Trứng luộc');
    expect(screen.queryByText(/Thực đơn hôm nay/)).not.toBeInTheDocument();
  });
});
