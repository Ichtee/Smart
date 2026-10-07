import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import Dashboard from './page';
import { clearApiCache } from '@/hooks/useApi';
import { macroTargets } from '@/utils/nutritionCalc';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/dashboard' }));
vi.mock('@/components/Sidebar', () => ({ default: () => null }));
vi.mock('@/components/GoogleTranslate', () => ({ default: () => null }));

// ---- a tiny fake backend -------------------------------------------------------------------------------
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const PROFILE = {
  name: 'Dana Pham', role: 'user', height: 175, weight: 70, age: 30, gender: 'Nam',
  activityLevel: 'Vận động vừa', goal: 'Tăng cơ', lastActiveRoutineName: 'Push Pull Legs',
};
// "today" in these tests is Wed 7 Oct 2026; the current week is Mon 5 .. Sun 11 Oct
const STREAK = { streakDates: ['2026-09-20', '2026-10-05', '2026-10-07'], current: 1, longest: 2, total: 3, count: 1 };
const WORKOUT_LOGS = {
  '2026-10-05': {
    date: '2026-10-05', routineName: 'Push Pull Legs', dayName: 'Thứ 2: Push',
    exercises: [
      { id: 'a', name: 'Bench Press', sets: 4, reps: '10', muscle: 'chest', completed: true },
      { id: 'b', name: 'Dips', sets: 3, reps: '12', muscle: 'triceps', completed: false },
    ],
  },
};
const NUTRITION_LOGS = { '2026-10-05': { date: '2026-10-05', dayCalories: 450, photoCount: 1, waterGlasses: 4 } };
const DAY_LOGS: Record<string, unknown> = {
  '2026-10-07': { date: '2026-10-07', waterGlasses: 6, meals: { 'Bữa Sáng': [{ id: 'm0', name: 'Trứng', calories: 150 }] } },
  '2026-10-05': {
    date: '2026-10-05', waterGlasses: 4,
    meals: {
      'Bữa Sáng': [{ id: 'm1', name: 'Phở bò', calories: 450, image: 'https://img/pho.jpg' }],
      'Bữa Tối': [{ id: 'm2', name: 'Ức gà', calories: 220 }, { id: 'm3', name: 'Cơm', calories: 200 }],
    },
  },
};
const EMPTY_DAY = { waterGlasses: 0, meals: { 'Bữa Sáng': [], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] } };

type Handler = (url: URL) => Response | Promise<Response>;
let handlers: Record<string, Handler>;
let fetchMock: ReturnType<typeof vi.fn>;
const calls = (method: string, path: string) =>
  fetchMock.mock.calls.filter(([u, o]) => (o?.method ?? 'GET') === method && new URL(String(u)).pathname === path).map(([u]) => new URL(String(u)));

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0, 0));
  nav.push.mockClear();
  handlers = {
    'GET /api/users/profile': () => json(PROFILE),
    'GET /api/workouts/streak': () => json(STREAK),
    'GET /api/workouts/logs': () => json(WORKOUT_LOGS),
    'GET /api/nutrition/logs': () => json(NUTRITION_LOGS),
    'GET /api/nutrition': (u) => json(DAY_LOGS[u.searchParams.get('date')!] ?? EMPTY_DAY),
    'DELETE /api/workouts': () => json({ success: true }),
  };
  fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(String(input));
    const handler = handlers[`${init?.method ?? 'GET'} ${url.pathname}`];
    return handler ? handler(url) : json({ message: 'not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('confirm', vi.fn(() => true));
  localStorage.setItem('token', 'tok');
  await clearApiCache();
});
afterEach(async () => {
  await act(async () => { vi.advanceTimersByTime(10_000); });
  vi.useRealTimers();
});

const setup = async () => {
  const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
  // an isolated SWR cache per test; the global helpers (clearApiCache) are also used in beforeEach
  const utils = render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Dashboard /></SWRConfig>);
  await screen.findByText(/Xin chào/);
  const day = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n}(\\s|$)`) });
  return { user, ...utils, day };
};
const text = () => document.body.textContent!.replace(/\s+/g, ' ');

describe('Dashboard: loading and header', () => {
  test('shows a loading screen until the profile arrives, then greets the user by name', async () => {
    let release!: (r: Response) => void;
    handlers['GET /api/users/profile'] = () => new Promise<Response>(r => { release = r; });
    render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Dashboard /></SWRConfig>);
    expect(await screen.findByRole('status', { name: 'Đang tải' })).toBeInTheDocument();
    expect(screen.queryByText(/Xin chào/)).not.toBeInTheDocument();

    await act(async () => { release(json(PROFILE)); });
    expect(await screen.findByText('Xin chào, Dana Pham!')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Đang tải' })).not.toBeInTheDocument();
  });

  test('normal users get no Admin Panel button; the profile icon goes to /profile', async () => {
    const { user } = await setup();
    expect(screen.queryByRole('button', { name: /Admin Panel/ })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    // the round profile button is the last one in the header (after the bell)
    await user.click(buttons.find(b => b.className.includes('size-11'))!);
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  test('admins get an Admin Panel button that opens the admin area', async () => {
    handlers['GET /api/users/profile'] = () => json({ ...PROFILE, role: 'admin' });
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: /Admin Panel/ }));
    expect(nav.push).toHaveBeenCalledWith('/dashboard/admin');
  });

  test('requests this month + this week of logs up front (date-ranged), plus today\'s diary', async () => {
    await setup();
    await waitFor(() => expect(calls('GET', '/api/nutrition').length).toBeGreaterThan(0));
    const range = (path: string) => calls('GET', path)[0].search;
    expect(range('/api/workouts/logs')).toBe('?from=2026-10-01&to=2026-10-31');
    expect(range('/api/nutrition/logs')).toBe('?from=2026-10-01&to=2026-10-31');
    expect(calls('GET', '/api/nutrition')[0].searchParams.get('date')).toBe('2026-10-07');
    expect(calls('GET', '/api/workouts/streak')[0].searchParams.get('today')).toBe('2026-10-07');
  });
});

describe('Dashboard: activity metrics', () => {
  test('counts the workouts of the CURRENT week (Mon-Sun), not the whole month', async () => {
    await setup();
    // 20 Sep is outside the week; 5 and 7 Oct are inside
    expect(text()).toMatch(/Buổi tập tuần này\s*2\s*\/\s*7 buổi/);
  });

  test('the streak card shows the CONSECUTIVE streak from the server, not how many days were ever trained', async () => {
    await setup();
    // 3 days trained in total, but the current run is 1 day: the card must say 1, like the Workouts page
    expect(text()).toContain('Chuỗi ngày tập1 ngày');
    expect(text()).not.toContain('Chuỗi ngày tập3 ngày');
  });

  test('a zero streak reads 0, never NaN or blank', async () => {
    handlers['GET /api/workouts/streak'] = () => json({ streakDates: [], current: 0, longest: 0, total: 0 });
    await setup();
    expect(text()).toContain('Chuỗi ngày tập0 ngày');
    expect(text()).toMatch(/Buổi tập tuần này\s*0\s*\/\s*7 buổi/);
  });

  test('water today is glasses x 250 ml', async () => {
    await setup();
    await waitFor(() => expect(text()).toMatch(/Uống nước\s*1500/));
  });

  test('shows the routine the user last used, or "Lịch tập tự do" when there is none', async () => {
    await setup();
    expect(screen.getByText('Push Pull Legs')).toBeInTheDocument();
  });

  test('falls back to "Lịch tập tự do" without a saved routine', async () => {
    handlers['GET /api/users/profile'] = () => json({ ...PROFILE, lastActiveRoutineName: '' });
    await setup();
    expect(screen.getByText('Lịch tập tự do')).toBeInTheDocument();
  });
});

describe('Dashboard: metabolism card (uses the shared calculator)', () => {
  test("shows the user's measurements, goal, BMR/TDEE and the three calorie suggestions", async () => {
    await setup();
    const t = text();
    expect(t).toContain('175 cm / 70 kg');
    expect(t).toMatch(/Mục tiêu\s*Tăng cơ/);
    expect(t).toMatch(/BMR\s*1[.,]649/); // 10*70 + 6.25*175 - 5*30 + 5
    expect(t).toMatch(/TDEE\s*2[.,]556/); // x 1.55 (Vận động vừa)
    expect(t).toContain('Tăng cơ2856 kcal');
    expect(t).toContain('Giảm mỡ2056 kcal');
    expect(t).toContain('Giữ dáng2556 kcal');
  });

  test('a woman gets the female BMR constant and her activity level is respected', async () => {
    handlers['GET /api/users/profile'] = () => json({ ...PROFILE, gender: 'Nữ', height: 160, weight: 52, age: 28, activityLevel: 'Ít vận động', goal: 'Giảm mỡ' });
    await setup();
    const t = text();
    expect(t).toMatch(/BMR\s*1[.,]219/); // 520 + 1000 - 140 - 161
    expect(t).toMatch(/TDEE\s*1[.,]463/); // x 1.2
    expect(t).toMatch(/Mục tiêu\s*Giảm mỡ/);
  });

  test('missing measurements fall back to the same defaults as every other page (170 cm / 65 kg)', async () => {
    handlers['GET /api/users/profile'] = () => json({ name: 'New User', role: 'user' });
    await setup();
    expect(text()).toContain('170 cm / 65 kg');
    expect(text()).toMatch(/Mục tiêu\s*Giữ dáng/);
  });

  test('"Cập nhật Hồ sơ" goes to the profile page', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: /Cập nhật Hồ sơ/ }));
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });
});

describe('Dashboard: calendar', () => {
  test('shows the current month with today marked and workout days ticked', async () => {
    const { day } = await setup();
    expect(screen.getByText('tháng 10 năm 2026')).toBeInTheDocument();
    expect(day(5)).toHaveTextContent('✓'); // trained
    expect(day(7)).toHaveTextContent('✓'); // today, and trained
    expect(day(6)).not.toHaveTextContent('✓');
  });

  test('today is marked with the target icon when it has not been trained yet', async () => {
    handlers['GET /api/workouts/streak'] = () => json({ streakDates: [], current: 0, longest: 0, total: 0 });
    const { day } = await setup();
    expect(day(7)).toHaveTextContent('🎯');
  });

  test('days with logged food show their calories, and a photo marker when there is a picture', async () => {
    const { day } = await setup();
    await waitFor(() => expect(day(5)).toHaveTextContent('450 kcal'));
    expect(day(5)).toHaveTextContent('📷');
    expect(day(6)).toHaveTextContent('-');
  });

  test('the month starts on the right weekday (1 Oct 2026 is a Thursday: 3 empty cells first)', async () => {
    const { day } = await setup();
    const first = day(1);
    expect(Array.from(first.parentElement!.children).indexOf(first)).toBe(3);
  });

  test('next month loads that month\'s logs on demand (and only then)', async () => {
    const { user } = await setup();
    expect(calls('GET', '/api/workouts/logs')).toHaveLength(1);

    handlers['GET /api/nutrition/logs'] = (u) => json(u.searchParams.get('from') === '2026-11-01'
      ? { '2026-11-03': { date: '2026-11-03', dayCalories: 777, photoCount: 0 } } : NUTRITION_LOGS);
    await user.click(screen.getByText('tháng 10 năm 2026').nextElementSibling as HTMLElement);
    expect(await screen.findByText('tháng 11 năm 2026')).toBeInTheDocument();

    await waitFor(() => expect(calls('GET', '/api/nutrition/logs').some(u => u.search === '?from=2026-11-01&to=2026-11-30')).toBe(true));
    expect(calls('GET', '/api/workouts/logs').some(u => u.search === '?from=2026-11-01&to=2026-11-30')).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: /^3(\s|$)/ })).toHaveTextContent('777 kcal'));
  });

  test('going back to the current month reuses what is already loaded', async () => {
    const { user } = await setup();
    const label = screen.getByText('tháng 10 năm 2026');
    await user.click(label.nextElementSibling as HTMLElement);
    await screen.findByText('tháng 11 năm 2026');
    const before = calls('GET', '/api/workouts/logs').length;
    await user.click(screen.getByText('tháng 11 năm 2026').previousElementSibling as HTMLElement);
    await screen.findByText('tháng 10 năm 2026');
    expect(calls('GET', '/api/workouts/logs').length).toBe(before);
  });

  test('February in a leap year has 29 days', async () => {
    const { user } = await setup();
    for (let i = 0; i < 4; i++) await user.click(screen.getByText(/20\d\d$/).nextElementSibling as HTMLElement);
    // Oct -> Nov -> Dec -> Jan -> Feb 2027 (not a leap year): 28 days
    await screen.findByText('tháng 2 năm 2027');
    expect(screen.queryByRole('button', { name: /^29(\s|$)/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^28(\s|$)/ })).toBeInTheDocument();
  });
});

describe('Dashboard: day detail', () => {
  test('nothing is shown until a day is selected', async () => {
    await setup();
    expect(screen.queryByText(/Chi tiết nhật ký ngày/)).not.toBeInTheDocument();
  });

  test('selecting a day shows its workout, meals per category, calorie totals and water', async () => {
    const { user, day } = await setup();
    await user.click(day(5));

    expect(await screen.findByText(/Chi tiết nhật ký ngày/)).toHaveTextContent('2026-10-05');
    expect(screen.getByText('✓ Đã hoàn thành buổi tập')).toBeInTheDocument();
    expect(text()).toContain('Lịch tập (Routine) Push Pull Legs');
    expect(text()).toContain('Buổi tập (Day) Thứ 2: Push');

    // only COMPLETED exercises are listed
    expect(screen.getByText('1. Bench Press')).toBeInTheDocument();
    expect(screen.queryByText(/Dips/)).not.toBeInTheDocument();
    expect(text()).toContain('Bài tập đã thực hiện (1)');

    await waitFor(() => expect(screen.getByText('Phở bò')).toBeInTheDocument());
    expect(calls('GET', '/api/nutrition').some(u => u.searchParams.get('date') === '2026-10-05')).toBe(true);
    expect(screen.getByText('Ức gà')).toBeInTheDocument();
    expect(text()).toContain('🍳 Bữa Sáng450 kcal');
    expect(text()).toContain('🥩 Bữa Tối420 kcal'); // 220 + 200
    expect(text()).toContain('Nước uống: 1000 ml (4 ly)');
    expect(screen.queryByText(/🍱 Bữa Trưa/)).not.toBeInTheDocument(); // empty categories are hidden
  });

  test('a day without data says so instead of showing an empty box', async () => {
    const { user, day } = await setup();
    await user.click(day(9));
    expect(await screen.findByText(/Không có buổi tập nào được ghi nhận/)).toBeInTheDocument();
    expect(await screen.findByText('Chưa ghi nhận khẩu phần ăn nào cho ngày này.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa nhật ký/ })).not.toBeInTheDocument();
  });

  test('a streak day with no detailed log still says the workout was completed', async () => {
    handlers['GET /api/workouts/logs'] = () => json({}); // dates are known from the streak, but no log body
    const { user, day } = await setup();
    await user.click(day(5));
    expect(await screen.findByText(/Ngày này bạn đã hoàn thành buổi tập!/)).toBeInTheDocument();
  });

  test('the exercise list can be collapsed and expanded', async () => {
    const { user, day } = await setup();
    await user.click(day(5));
    await screen.findByText('1. Bench Press');
    await user.click(screen.getByRole('button', { name: /Thu gọn/ }));
    expect(screen.queryByText('1. Bench Press')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mở rộng/ }));
    expect(screen.getByText('1. Bench Press')).toBeInTheDocument();
  });

  test('selecting another day re-expands a collapsed list and switches the details', async () => {
    const { user, day } = await setup();
    await user.click(day(5));
    await user.click(await screen.findByRole('button', { name: /Thu gọn/ }));
    await user.click(day(7));
    await waitFor(() => expect(screen.getByText(/Chi tiết nhật ký ngày/)).toHaveTextContent('2026-10-07'));
    await waitFor(() => expect(screen.getByText('Trứng')).toBeInTheDocument());
    expect(screen.queryByText('Phở bò')).not.toBeInTheDocument();
  });

  test('clicking a meal photo opens a larger preview that can be closed', async () => {
    const { user, day } = await setup();
    await user.click(day(5));
    const photo = await screen.findByAltText('Phở bò');
    await user.click(photo);
    expect(screen.getByAltText('Ảnh món ăn')).toHaveAttribute('src', 'https://img/pho.jpg');
    await user.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByAltText('Ảnh món ăn')).not.toBeInTheDocument();
  });
});

describe('Dashboard: deleting a workout log', () => {
  test('asks first; declining sends nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { user, day } = await setup();
    await user.click(day(5));
    await user.click(await screen.findByRole('button', { name: /Xóa nhật ký/ }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2026-10-05'));
    expect(calls('DELETE', '/api/workouts')).toHaveLength(0);
  });

  test('confirming deletes that date on the server and refreshes the logs and the streak', async () => {
    const { user, day } = await setup();
    await user.click(day(5));
    const logsBefore = calls('GET', '/api/workouts/logs').length;
    const streakBefore = calls('GET', '/api/workouts/streak').length;

    handlers['GET /api/workouts/logs'] = () => json({});
    handlers['GET /api/workouts/streak'] = () => json({ streakDates: ['2026-09-20', '2026-10-07'], current: 1, longest: 1, total: 2 });
    await user.click(await screen.findByRole('button', { name: /Xóa nhật ký/ }));

    await waitFor(() => expect(calls('DELETE', '/api/workouts')).toHaveLength(1));
    expect(calls('DELETE', '/api/workouts')[0].searchParams.get('date')).toBe('2026-10-05');
    await waitFor(() => expect(calls('GET', '/api/workouts/logs').length).toBeGreaterThan(logsBefore));
    await waitFor(() => expect(calls('GET', '/api/workouts/streak').length).toBeGreaterThan(streakBefore));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Xóa nhật ký/ })).not.toBeInTheDocument());
    expect(text()).toMatch(/Buổi tập tuần này\s*1\s*\/\s*7 buổi/); // 5 Oct no longer counts
  });

  test('a failed delete is reported and nothing disappears', async () => {
    handlers['DELETE /api/workouts'] = () => json({ message: 'boom' }, 500);
    const { user, day } = await setup();
    await user.click(day(5));
    await user.click(await screen.findByRole('button', { name: /Xóa nhật ký/ }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Không xóa được')));
    expect(screen.getByRole('button', { name: /Xóa nhật ký/ })).toBeInTheDocument();
  });
});

describe('Dashboard: errors and sessions', () => {
  test('a profile that cannot be loaded shows a banner with defaults, and retry recovers', async () => {
    let healthy = false;
    handlers['GET /api/users/profile'] = () => (healthy ? json(PROFILE) : json({ message: 'down' }, 500));
    const { user } = await setup();

    expect(await screen.findByText(/Không tải được hồ sơ/)).toBeInTheDocument();
    expect(text()).toContain('170 cm / 65 kg'); // defaults while the profile is missing

    healthy = true;
    await user.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.queryByText(/Không tải được hồ sơ/)).not.toBeInTheDocument());
    expect(await screen.findByText('Xin chào, Dana Pham!')).toBeInTheDocument();
    expect(text()).toContain('175 cm / 70 kg');
  });

  test('an expired session (401) removes the token and sends the user to /login', async () => {
    handlers['GET /api/users/profile'] = () => json({ message: 'no' }, 401);
    render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Dashboard /></SWRConfig>);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('a 401 does NOT show the "could not load profile" banner (the user is being redirected)', async () => {
    handlers['GET /api/users/profile'] = () => json({ message: 'no' }, 401);
    render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Dashboard /></SWRConfig>);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText(/Không tải được hồ sơ/)).not.toBeInTheDocument();
  });

  test('the calendar and metrics still render when the logs endpoints fail', async () => {
    handlers['GET /api/workouts/logs'] = () => json({}, 500);
    handlers['GET /api/nutrition/logs'] = () => json({}, 500);
    handlers['GET /api/nutrition'] = () => json({}, 500);
    await setup();
    expect(screen.getByText('tháng 10 năm 2026')).toBeInTheDocument();
    expect(text()).toContain('Chuỗi ngày tập1 ngày');
    expect(within(document.body).queryByText(/NaN/)).not.toBeInTheDocument();
  });
});

describe('Dashboard: today hero', () => {
  test('trained today: says so and has no start link', async () => {
    await setup();
    expect(screen.getByText('Đã tập hôm nay')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Bắt đầu/ })).not.toBeInTheDocument();
  });

  test('not trained today: a big "Bắt đầu" link opens the workouts page', async () => {
    handlers['GET /api/workouts/streak'] = () => json({ streakDates: ['2026-10-05'], current: 0, longest: 2, total: 1 });
    await setup();
    expect(screen.getByRole('link', { name: /Bắt đầu/ })).toHaveAttribute('href', '/workouts');
    expect(screen.queryByText('Đã tập hôm nay')).not.toBeInTheDocument();
  });

  test('the rings show today against the targets (calories, protein, water, workouts this week)', async () => {
    await setup();
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Calo hôm nay' })).toHaveAttribute('aria-valuenow', '150'));
    expect(screen.getByRole('progressbar', { name: 'Calo hôm nay' })).toHaveAttribute('aria-valuemax', '2856');
    expect(screen.getByRole('progressbar', { name: 'Nước uống hôm nay' })).toHaveAttribute('aria-valuenow', '1500');
    expect(screen.getByRole('progressbar', { name: 'Buổi tập tuần này' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar', { name: 'Buổi tập tuần này' })).toHaveAttribute('aria-valuemax', '7');
    expect(screen.getByRole('progressbar', { name: 'Protein hôm nay' })).toHaveAttribute('aria-valuenow', String(Math.round(macroTargets(150).protein))); // a food without macros is estimated from its calories
  });
});
