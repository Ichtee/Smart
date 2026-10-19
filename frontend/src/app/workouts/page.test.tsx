import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import Workouts from './page';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/workouts' }));
vi.mock('@/components/Sidebar', () => ({ default: () => null }));
// the 3D model needs a canvas/SVG engine: expose the muscles it was asked to highlight instead
vi.mock('react-body-highlighter', async () => {
  const React = await import('react');
  return { default: (props: { data: unknown }) => React.createElement('div', { 'data-testid': 'body-model' }, JSON.stringify(props.data)) };
});

// ---------------------------------------------------------------------------------------------------------
// Fixtures: today is Wed 7 Oct 2026 ("Thứ 4"). Dates of this week: T2=10-05, T3=10-06, T4=10-07, T5=10-08.
// ---------------------------------------------------------------------------------------------------------
const lib = (id: string, name: string, muscle: string) => ({ _id: id, name, muscle, defaultSets: 3, defaultReps: '10', equipment: 'Barbell', secondaryMuscles: [] });
const EXERCISES = [
  lib('e-bench', 'Bench Press', 'chest'), lib('e-incline', 'Incline Press', 'chest'), lib('e-pushdown', 'Triceps Pushdown', 'triceps'),
  lib('e-row', 'Barbell Row', 'upper-back'), lib('e-lat', 'Lat Pulldown', 'lats'),
  lib('e-squat', 'Squat', 'quadriceps'), lib('e-legpress', 'Leg Press', 'quadriceps'), lib('e-curl', 'Biceps Curl', 'biceps'),
];
const tmpl = (id: string, name: string, muscle: string, sets: number, reps: string, rest: number) =>
  ({ exerciseId: id, exerciseName: name, muscle, sets, repsRange: reps, rir: '1', restTimeSeconds: rest });
const ROUTINE = {
  id: 'ppl', name: 'Push Pull Legs',
  schedule: [
    { day: 'Thứ 2', name: 'Push', exercises: [tmpl('e-bench', 'Bench Press', 'chest', 3, '10', 90), tmpl('e-incline', 'Incline Press', 'chest', 3, '10', 90), tmpl('e-pushdown', 'Triceps Pushdown', 'triceps', 3, '12', 60)] },
    { day: 'Thứ 3', name: 'Pull', exercises: [tmpl('e-row', 'Barbell Row', 'upper-back', 4, '8', 120), tmpl('e-lat', 'Lat Pulldown', 'lats', 3, '10', 90)] },
    { day: 'Thứ 4', name: 'Legs', exercises: [tmpl('e-squat', 'Squat', 'quadriceps', 4, '8', 120), tmpl('e-legpress', 'Leg Press', 'quadriceps', 3, '12', 90)] },
    { day: 'Thứ 5', name: 'Upper', exercises: [tmpl('e-bench', 'Bench Press', 'chest', 3, '10', 60)] },
    { day: 'Chủ nhật', name: 'Nghỉ ngơi', isRestDay: true, exercises: [] },
  ],
};
const OTHER_ROUTINE = { id: 'fullbody', name: 'Fullbody', schedule: [{ day: 'Thứ 2', name: 'Full A', exercises: [tmpl('e-squat', 'Squat', 'quadriceps', 3, '10', 90)] }] };
const PROFILE = { name: 'Dana', lastActiveRoutineId: 'ppl', lastActiveRoutineName: 'Push Pull Legs', lastActiveDayIndex: 0 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// what the page POSTs to /api/workouts
type SavedLog = {
  date: string; routineId: string; routineName: string; dayName: string; dayIndex: number;
  selectedIds: string[]; completedIds: string[]; isSaved: boolean;
  detailsMap: Record<string, { sets: number; reps: string; rir?: string; restTimeSeconds?: number; completedSets: number[]; setWeights?: Record<string, string | number> }>;
  exercises: { name: string; sets: number; reps: string; completed: boolean }[];
};

// a tiny stateful backend
type Server = {
  routines: unknown[]; exercises: unknown[]; profile: Record<string, unknown>; streak: Record<string, unknown>;
  logs: Record<string, Record<string, unknown>>; posts: SavedLog[]; puts: Record<string, unknown>[];
  failGetLog: boolean; failPost: boolean; failRoutines: boolean;
};
let server: Server;
let fetchMock: ReturnType<typeof vi.fn>;
const emptyLog = (date: string) => ({ date, selectedIds: [], completedIds: [], detailsMap: {}, exercises: [], isSaved: false });
const lastPost = () => server.posts[server.posts.length - 1];

const respond = async (path: string, url: URL, init?: RequestInit) => {
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  if (method === 'GET' && path === '/api/routines') return server.failRoutines ? json({ message: 'down' }, 500) : json(server.routines);
  if (method === 'GET' && path === '/api/exercises') return server.failRoutines ? json({ message: 'down' }, 500) : json(server.exercises);
  if (method === 'GET' && path === '/api/users/profile') return json(server.profile);
  if (method === 'PUT' && path === '/api/users/profile') { server.puts.push(body); Object.assign(server.profile, body); return json(server.profile); }
  if (method === 'GET' && path === '/api/workouts/streak') return json(server.streak);
  if (method === 'GET' && path === '/api/workouts') {
    if (server.failGetLog) return json({ message: 'down' }, 500);
    const date = url.searchParams.get('date')!;
    return json(server.logs[date] ?? emptyLog(date));
  }
  if (method === 'POST' && path === '/api/workouts') {
    if (server.failPost) return json({ message: 'down' }, 500);
    server.posts.push(body);
    server.logs[body.date] = body;
    return json(body);
  }
  return json({ message: 'not found' }, 404);
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0, 0));
  nav.push.mockClear();
  server = {
    routines: [ROUTINE, OTHER_ROUTINE], exercises: EXERCISES, profile: { ...PROFILE },
    streak: { streakDates: [], current: 0, longest: 0, total: 0 }, logs: {}, posts: [], puts: [],
    failGetLog: false, failPost: false, failRoutines: false,
  };
  fetchMock = vi.fn(async (input: string, init?: RequestInit) => { const url = new URL(String(input)); return respond(url.pathname, url, init); });
  vi.stubGlobal('fetch', fetchMock);
  localStorage.setItem('token', 'tok');
});
afterEach(async () => {
  await act(async () => { vi.advanceTimersByTime(10_000); });
  vi.useRealTimers();
});

const renderPage = () =>
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><Workouts /></SWRConfig>);

/** Render and wait until today's plan (Thứ 4 / Legs) is on screen. */
const setup = async () => {
  const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
  const view = renderPage();
  await screen.findByText(/^1\.\s*Squat/);
  const exerciseTicks = () => screen.getAllByRole('button').filter(b => b.getAttribute('title') === 'Đánh dấu hoàn thành');
  const lockedTicks = () => screen.queryAllByTitle('Vui lòng bấm LƯU ở trên để bắt đầu tập');
  const save = () => user.click(screen.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ }));
  const setTick = (n: number) => screen.getAllByRole('button').filter(b => (b.getAttribute('title') || '').startsWith('Đánh dấu hoàn thành Hiệp'))[n];
  const saveAndWait = async () => {
    const before = server.posts.length;
    await save();
    await waitFor(() => expect(server.posts.length).toBe(before + 1));
  };
  const tab = (day: string) => screen.getByRole('button', { name: new RegExp(day) });
  return { user, view, exerciseTicks, lockedTicks, save, saveAndWait, setTick, tab };
};
const pageText = () => document.body.textContent!.replace(/\s+/g, ' ');

// =========================================================================================================
describe('Workouts: loading the plan', () => {
  test("opens on today's tab with the template exercises, parameters and the routine chosen on the profile", async () => {
    await setup();
    expect(screen.getByRole('combobox')).toHaveValue('ppl');
    expect(screen.getByText(/Thứ 4 \(Legs\)/)).toBeInTheDocument();
    expect(screen.getByText('📌 HÔM NAY').closest('button')).toHaveTextContent('Thứ 4');

    expect(screen.getByText(/^1\.\s*Squat/)).toBeInTheDocument();
    expect(screen.getByText(/^2\.\s*Leg Press/)).toBeInTheDocument();
    expect(screen.queryByText(/Bench Press/, { selector: 'h4, h3, span.font-extrabold' })).not.toBeInTheDocument();
    // template sets/reps/rest are applied
    expect(screen.getAllByDisplayValue('4').length).toBeGreaterThan(0); // 4 sets
    expect(screen.getAllByDisplayValue('8').length).toBeGreaterThan(0); // 8 reps ("repsRange")
    expect(screen.getAllByDisplayValue('12').length).toBeGreaterThan(0); // leg press reps
    expect(pageText()).toContain('Nghỉ: 2p'); // squat rests 120 s
  });

  test('before saving: nothing can be ticked, progress says "Chọn bài...", streak 0', async () => {
    const { exerciseTicks, lockedTicks } = await setup();
    expect(exerciseTicks()).toHaveLength(0);
    expect(lockedTicks()).toHaveLength(2);
    expect(screen.getByText('Chọn bài...')).toBeInTheDocument();
    expect(screen.getByText('0 Ngày')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ })).toBeInTheDocument();
  });

  test('every day of the routine is a tab, in Monday..Sunday order', async () => {
    await setup();
    const tabs = screen.getAllByRole('button').filter(b => /^(HÔM NAY\s*)?Thứ [2-7]|Chủ nhật/.test((b.textContent || '').replace('📌 ', '')));
    expect(tabs.map(t => (t.textContent || '').match(/Thứ \d|Chủ nhật/)![0])).toEqual(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Chủ nhật']);
  });

  test('the routine choices include the free "no schedule" mode', async () => {
    await setup();
    const options = within(screen.getByRole('combobox')).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['Tự do (Không theo lịch)', 'Push Pull Legs', 'Fullbody']));
  });

  test('a profile without a saved routine falls back to the first routine', async () => {
    server.profile = { name: 'Dana' };
    await setup();
    expect(screen.getByRole('combobox')).toHaveValue('ppl');
  });

  test('a saved routine that no longer exists falls back to the first routine', async () => {
    server.profile = { ...PROFILE, lastActiveRoutineId: 'deleted-routine' };
    await setup();
    expect(screen.getByRole('combobox')).toHaveValue('ppl');
  });

  test("another saved routine is honoured (and its today's plan appears)", async () => {
    server.profile = { ...PROFILE, lastActiveRoutineId: 'fullbody' };
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText(/^1\.\s*Squat/);
    expect(screen.getByRole('combobox')).toHaveValue('fullbody');
    // that routine has no tab for Wednesday: it opens on the first day it has
    expect(screen.getByText(/Thứ 2 \(Full A\)/)).toBeInTheDocument();
    void user;
  });

  test('when today has no tab, the last tab the user saved is restored', async () => {
    server.routines = [{ ...ROUTINE, schedule: ROUTINE.schedule.filter(d => d.day !== 'Thứ 4') }];
    server.profile = { ...PROFILE, lastActiveDayIndex: 2 }; // sorted: T2, T3, T5, CN -> index 2 = Thứ 5
    renderPage();
    await screen.findByText(/Thứ 5 \(Upper\)/);
  });

  test('a saved tab index beyond the schedule is ignored (first tab)', async () => {
    server.routines = [{ ...ROUTINE, schedule: ROUTINE.schedule.filter(d => d.day !== 'Thứ 4') }];
    server.profile = { ...PROFILE, lastActiveDayIndex: 6 };
    renderPage();
    await screen.findByText(/Thứ 2 \(Push\)/);
  });

  test('the template is matched by exerciseId, so renaming an exercise does not lose it from the plan', async () => {
    server.exercises = EXERCISES.map(e => (e._id === 'e-squat' ? { ...e, name: 'Back Squat (renamed)' } : e));
    renderPage();
    await screen.findByText(/^1\.\s*Back Squat \(renamed\)/);
  });

  test('a template exercise that is not in the library is left out instead of crashing', async () => {
    server.exercises = EXERCISES.filter(e => e._id !== 'e-legpress');
    renderPage();
    await screen.findByText(/^1\.\s*Squat/);
    expect(screen.queryByText(/^\d+\.\s*Leg Press/)).not.toBeInTheDocument();
    // named once, instead of silently missing from the list and stuck at 0/N in the muscle targets
    expect(screen.getByText(/không còn trong thư viện nên bị bỏ qua: Leg Press/)).toBeInTheDocument();
  });

  test('a rest day shows the rest message and an empty list', async () => {
    const { tab } = await setup();
    await userEventClick(tab('Chủ nhật'));
    expect(await screen.findByText(/Hôm nay là ngày nghỉ/)).toBeInTheDocument();
  });
});

const userEventClick = async (el: HTMLElement) => userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime }).click(el);

// =========================================================================================================
describe('Workouts: loading problems', () => {
  test('banners use icons, not emoji', async () => {
    server.failRoutines = true;
    renderPage();
    const banner = (await screen.findByText('Không thể kết nối tới máy chủ!')).closest('[class*="border-destructive"]')!;
    expect(banner.textContent).not.toMatch(/⚠️|🔄|💡/);
    expect(within(banner as HTMLElement).getByRole('button', { name: /Thử lại ngay/ })).toBeInTheDocument();
  });

  test('if routines/exercises cannot be loaded a retry banner appears, and retrying recovers', async () => {
    server.failRoutines = true;
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();
    expect(await screen.findByText('Không thể kết nối tới máy chủ!')).toBeInTheDocument();

    server.failRoutines = false;
    await user.click(screen.getByRole('button', { name: /Thử lại ngay/ }));
    await screen.findByText(/^1\.\s*Squat/);
    expect(screen.queryByText('Không thể kết nối tới máy chủ!')).not.toBeInTheDocument();
  });

  test('a day whose saved log cannot be read is LOCKED, never replaced by the template', async () => {
    server.failGetLog = true;
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();
    expect(await screen.findByText(/Không tải được nhật ký ngày 2026-10-07/)).toBeInTheDocument();
    expect(screen.queryByText(/^1\.\s*Squat/)).not.toBeInTheDocument(); // the template is NOT shown as if it were the log

    await user.click(screen.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ }));
    expect(await screen.findByText(/Chưa tải được nhật ký ngày này/)).toBeInTheDocument();
    expect(server.posts).toHaveLength(0); // nothing is sent: it could overwrite the real log
  });

  describe('a day that was loaded, then fails to reload (server hiccup when coming back to its tab)', () => {
    // The previous state of that day is still on screen, so every write must be refused:
    // sending it could overwrite whatever the server really has.
    const goStale = async () => {
      const ctx = await setup();
      await ctx.saveAndWait();
      await ctx.user.click(ctx.tab('Thứ 3'));
      await screen.findByText(/Thứ 3 \(Pull\)/);
      server.failGetLog = true;
      await ctx.user.click(ctx.tab('Thứ 4'));
      await screen.findByText(/Không tải được nhật ký ngày 2026-10-07/);
      return ctx;
    };

    test('the old (locked) plan is still visible and the banner explains the day is blocked', async () => {
      const { exerciseTicks } = await goStale();
      expect(screen.getByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument();
      expect(exerciseTicks()).toHaveLength(2);
    });

    test('ticking an exercise is refused and nothing is sent', async () => {
      const { user, exerciseTicks } = await goStale();
      const before = server.posts.length;
      await user.click(exerciseTicks()[0]);
      expect(await screen.findByText(/Chưa tải được nhật ký ngày này/)).toBeInTheDocument();
      expect(server.posts.length).toBe(before);
    });

    test('ticking a set is refused and nothing is sent', async () => {
      const { user, setTick } = await goStale();
      const before = server.posts.length;
      await user.click(setTick(0));
      expect(await screen.findByText(/Chưa tải được nhật ký ngày này/)).toBeInTheDocument();
      expect(server.posts.length).toBe(before);
    });

    test('"Sửa lại" (unlock) is refused and nothing is sent', async () => {
      const { user } = await goStale();
      const before = server.posts.length;
      await user.click(screen.getByRole('button', { name: /Sửa lại/ }));
      expect(await screen.findByText(/Chưa tải được nhật ký ngày này/)).toBeInTheDocument();
      expect(server.posts.length).toBe(before);
      expect(screen.getByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument(); // still locked locally too
    });

    test('after a successful retry the day works again', async () => {
      const { user, exerciseTicks } = await goStale();
      server.failGetLog = false;
      await user.click(screen.getByRole('button', { name: /Thử lại$/ }));
      await waitFor(() => expect(screen.queryByText(/Không tải được nhật ký ngày/)).not.toBeInTheDocument());
      const before = server.posts.length;
      await user.click(exerciseTicks()[0]);
      await waitFor(() => expect(server.posts.length).toBe(before + 1));
    });
  });

  test('retrying after a failed day load unlocks it', async () => {
    server.failGetLog = true;
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText(/Không tải được nhật ký ngày/);

    server.failGetLog = false;
    await user.click(screen.getByRole('button', { name: /Thử lại$/ }));
    await screen.findByText(/^1\.\s*Squat/);
    expect(screen.queryByText(/Không tải được nhật ký ngày/)).not.toBeInTheDocument();
  });
});

// =========================================================================================================
describe('Workouts: saving the plan', () => {
  test('POSTs a full snapshot of the day: date, routine, ids, parameters and zero progress', async () => {
    const { saveAndWait } = await setup();
    await saveAndWait();

    const p = lastPost();
    expect(p).toMatchObject({
      date: '2026-10-07', routineId: 'ppl', routineName: 'Push Pull Legs', dayName: 'Thứ 4: Legs', dayIndex: 2,
      selectedIds: ['e-squat', 'e-legpress'], completedIds: [], isSaved: true,
    });
    expect(p.detailsMap['e-squat']).toMatchObject({ sets: 4, reps: '8', rir: '1', restTimeSeconds: 120, completedSets: [] });
    expect(p.detailsMap['e-legpress']).toMatchObject({ sets: 3, reps: '12', restTimeSeconds: 90, completedSets: [] });
    expect(p.exercises.map(e => [e.name, e.sets, e.reps, e.completed])).toEqual([['Squat', 4, '8', false], ['Leg Press', 3, '12', false]]);
  });

  test('then the plan is locked in ("ĐÃ CHỐT LỊCH"), editing controls disappear and ticking is possible', async () => {
    const { saveAndWait, exerciseTicks, lockedTicks } = await setup();
    await saveAndWait();
    expect(await screen.findByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument();
    expect(screen.getByText(/Đã chốt lịch tập thành công/)).toBeInTheDocument();
    expect(exerciseTicks()).toHaveLength(2);
    expect(lockedTicks()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Tăng số/ })).not.toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('remembers the routine and tab on the profile (one PUT, only when the plan is saved)', async () => {
    const { saveAndWait } = await setup();
    expect(server.puts).toHaveLength(0);
    await saveAndWait();
    await waitFor(() => expect(server.puts).toHaveLength(1));
    expect(server.puts[0]).toEqual({ lastActiveRoutineId: 'ppl', lastActiveRoutineName: 'Push Pull Legs', lastActiveDayIndex: 2 });
  });

  test('an empty plan cannot be saved', async () => {
    const { user, save } = await setup();
    for (const remove of screen.getAllByRole('button', { name: /Xóa/ })) await user.click(remove);
    await save();
    expect(await screen.findByText(/Vui lòng chọn ít nhất 1 bài tập/)).toBeInTheDocument();
    expect(server.posts).toHaveLength(0);
  });

  test('a failed save is shown with a retry that re-sends the latest snapshot', async () => {
    server.failPost = true;
    const { user, save } = await setup();
    await save();
    expect(await screen.findByText(/Chưa lưu được lên máy chủ/)).toBeInTheDocument();
    expect(server.posts).toHaveLength(0);
    expect(screen.getByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument(); // the UI does not pretend it failed to lock

    server.failPost = false;
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(server.posts).toHaveLength(1));
    expect(lastPost()).toMatchObject({ date: '2026-10-07', isSaved: true });
    await waitFor(() => expect(screen.queryByText(/Chưa lưu được lên máy chủ/)).not.toBeInTheDocument());
  });

  test('"Sửa lại" unlocks the plan and tells the server it is no longer locked', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    const before = server.posts.length;
    await user.click(await screen.findByRole('button', { name: /Sửa lại/ }));
    await waitFor(() => expect(server.posts.length).toBe(before + 1));
    expect(lastPost().isSaved).toBe(false);
    expect(screen.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ })).toBeInTheDocument();
  });
});

// =========================================================================================================
describe('Workouts: ticking exercises and sets', () => {
  test('ticking an exercise completes all its sets, saves it, starts that exercise\'s own rest timer', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    const before = server.posts.length;
    await user.click(exerciseTicks()[0]);

    await waitFor(() => expect(server.posts.length).toBe(before + 1));
    const p = lastPost();
    expect(p.completedIds).toEqual(['e-squat']);
    expect(p.detailsMap['e-squat'].completedSets).toEqual([0, 1, 2, 3]); // 4 sets
    expect(p.detailsMap['e-legpress'].completedSets).toEqual([]);
    expect(p.exercises.find(e => e.name === 'Squat')?.completed).toBe(true);

    expect(screen.getByText('50%')).toBeInTheDocument(); // 1 of 2
    // Squat rests 120 s: the timer starts at 2:00, not the old fixed 3:00
    expect(screen.getByText(/^(2:00|1:59)$/)).toBeInTheDocument();
    expect(screen.getByText('Nghỉ giữa set/bài:')).toBeInTheDocument();
  });

  test("the timer follows the exercise's own rest time (leg press: 90 s)", async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[1]);
    expect(await screen.findByText(/^(1:30|1:29)$/)).toBeInTheDocument();
  });

  test('the rest timer counts down, can be paused and skipped', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[0]);
    await screen.findByText(/^(2:00|1:59)$/);

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByText(/^(1:50|1:49|1:48)$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tạm dừng/ }));
    const frozen = screen.getByText(/^\d:\d\d$/).textContent;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText(frozen!)).toBeInTheDocument(); // did not move while paused
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Bỏ qua/ }));
    expect(screen.queryByText('Nghỉ giữa set/bài:')).not.toBeInTheDocument();
  });

  test('the rest timer floats on screen (role timer) and names the exercise it is for', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(exerciseTicks()[0]);
    const timer = await screen.findByRole('timer', { name: 'Đồng hồ nghỉ' });
    expect(timer).toHaveTextContent('Squat');
    expect(timer.parentElement).toBe(document.body); // outside the scrolling card, so it stays visible
  });

  test('the "Hoàn thành buổi tập!" banner appears only when every exercise is done', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[0]);
    await screen.findByText('50%');
    expect(screen.queryByText('Hoàn thành buổi tập!')).not.toBeInTheDocument();
    await user.click(exerciseTicks()[1]);
    expect(await screen.findByText('Hoàn thành buổi tập!')).toBeInTheDocument();
    await user.click(exerciseTicks()[1]); // un-tick: not finished any more
    await waitFor(() => expect(screen.queryByText('Hoàn thành buổi tập!')).not.toBeInTheDocument());
  });

  test('un-ticking an exercise clears its sets and stops its timer', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[0]);
    await screen.findByText('50%');
    const before = server.posts.length;
    await user.click(exerciseTicks()[0]);

    await waitFor(() => expect(server.posts.length).toBeGreaterThan(before));
    expect(lastPost().completedIds).toEqual([]);
    expect(lastPost().detailsMap['e-squat'].completedSets).toEqual([]);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('Nghỉ giữa set/bài:')).not.toBeInTheDocument();
  });

  test('ticking one set saves that set only; the exercise stays open', async () => {
    const { user, saveAndWait, setTick } = await setup();
    await saveAndWait();
    const before = server.posts.length;
    await user.click(setTick(0));

    await waitFor(() => expect(server.posts.length).toBe(before + 1));
    expect(lastPost().completedIds).toEqual([]);
    expect(lastPost().detailsMap['e-squat'].completedSets).toEqual([0]);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/^(2:00|1:59)$/)).toBeInTheDocument(); // a set also starts the rest timer
  });

  test('ticking the LAST set completes the exercise automatically', async () => {
    const { user, saveAndWait, setTick } = await setup();
    await saveAndWait();
    for (let i = 0; i < 4; i++) await user.click(setTick(i)); // squat has 4 sets

    await waitFor(() => expect(lastPost().completedIds).toEqual(['e-squat']));
    expect(lastPost().detailsMap['e-squat'].completedSets).toEqual([0, 1, 2, 3]);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('un-ticking a set of a completed exercise re-opens it', async () => {
    const { user, saveAndWait, exerciseTicks, setTick } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[0]);
    await screen.findByText('50%');
    await user.click(setTick(1)); // un-tick set 2 of the squat

    await waitFor(() => expect(lastPost().completedIds).toEqual([]));
    expect(lastPost().detailsMap['e-squat'].completedSets).toEqual([0, 2, 3]);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test('progress is the share of completed exercises', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    await user.click(exerciseTicks()[0]);
    await user.click(exerciseTicks()[1]);
    expect(await screen.findByText('100%')).toBeInTheDocument();
  });

  test('after a confirmed save the streak is re-read from the server', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    expect(screen.getByText('0 Ngày')).toBeInTheDocument();

    server.streak = { streakDates: ['2026-10-07'], current: 1, longest: 1, total: 1 };
    await user.click(exerciseTicks()[0]);
    expect(await screen.findByText('1 Ngày')).toBeInTheDocument();
  });

  test('a failed tick is reported and not shown as saved', async () => {
    const { user, saveAndWait, exerciseTicks } = await setup();
    await saveAndWait();
    server.failPost = true;
    await user.click(exerciseTicks()[0]);
    expect(await screen.findByText(/Chưa lưu được lên máy chủ/)).toBeInTheDocument();
    expect(screen.getByText('0 Ngày')).toBeInTheDocument(); // streak not bumped by an unsaved tick
  });

  test('ticks on a FUTURE day are refused: a day cannot be completed in advance', async () => {
    const { user, tab, save, exerciseTicks } = await setup();
    await user.click(tab('Thứ 5'));
    await screen.findByText(/Thứ 5 \(Upper\)/);
    await save();
    await waitFor(() => expect(server.posts.length).toBe(1));
    expect(lastPost().date).toBe('2026-10-08'); // planning ahead is allowed

    const before = server.posts.length;
    await user.click(exerciseTicks()[0]);
    expect(await screen.findByText(/Không thể đánh dấu hoàn thành cho ngày trong tương lai/)).toBeInTheDocument();
    expect(server.posts.length).toBe(before);
  });

  test('a past day of this week can still be completed (forgot to log yesterday)', async () => {
    const { user, tab, saveAndWait, exerciseTicks } = await setup();
    await user.click(tab('Thứ 3'));
    await screen.findByText(/Thứ 3 \(Pull\)/);
    await saveAndWait();
    expect(lastPost().date).toBe('2026-10-06');
    await user.click(exerciseTicks()[0]);
    await waitFor(() => expect(lastPost().completedIds).toEqual(['e-row']));
  });
});

// =========================================================================================================
describe('Workouts: restoring a saved day from the server', () => {
  const savedLegs = (over: Record<string, unknown> = {}) => ({
    date: '2026-10-07', routineId: 'ppl', routineName: 'Push Pull Legs', dayName: 'Thứ 4: Legs', dayIndex: 2,
    selectedIds: ['e-squat'], completedIds: ['e-squat'],
    detailsMap: { 'e-squat': { sets: 5, reps: '6', rir: '2', restTimeSeconds: 150, completedSets: [0, 1, 2, 3, 4] } },
    exercises: [], isSaved: true, ...over,
  });

  test('shows exactly the saved exercises with their saved parameters, locked, with progress', async () => {
    server.logs['2026-10-07'] = savedLegs();
    const { exerciseTicks } = await setup();
    expect(screen.getByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument();
    expect(screen.queryByText(/Leg Press/, { selector: 'span.font-extrabold, h4, h3' })).not.toBeInTheDocument(); // not the template
    expect(exerciseTicks()).toHaveLength(1);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(pageText()).toContain('Hiệp: 5');
    expect(pageText()).toContain('Lần: 6');
    expect(screen.getByText(/5 \/ 5 Hoàn thành/)).toBeInTheDocument(); // all five sets show as done
  });

  test('the per-set rows are folded until the header is clicked', async () => {
    const { user } = await setup();
    const header = screen.getAllByRole('button', { name: /Các hiệp tập/ })[0];
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header.nextElementSibling).toHaveClass('hidden');
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(header.nextElementSibling).not.toHaveClass('hidden');
  });

  test('per-set progress survives a reload (it comes back from detailsMap.completedSets)', async () => {
    server.logs['2026-10-07'] = savedLegs({ completedIds: [], detailsMap: { 'e-squat': { sets: 4, reps: '8', completedSets: [0, 1] } } });
    await setup();
    expect(screen.getByText(/2 \/ 4 Hoàn thành/)).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  test("a log saved for a DIFFERENT routine is ignored: that routine's template is shown", async () => {
    server.logs['2026-10-07'] = savedLegs({ routineId: 'fullbody' });
    await setup();
    expect(screen.getByText(/^2\.\s*Leg Press/)).toBeInTheDocument();
    expect(screen.queryByText(/ĐÃ CHỐT LỊCH/)).not.toBeInTheDocument();
  });

  test('a log of another routine on this date is announced, and saving over it asks first', async () => {
    server.logs['2026-10-07'] = savedLegs({ routineId: 'fullbody', routineName: 'Full Body' });
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { save } = await setup();
    expect(screen.getByRole('status')).toHaveTextContent('Ngày này đã có buổi tập của lịch "Full Body" (1/1 bài đã xong)');

    const posts = server.posts.length;
    await save();
    expect(ask).toHaveBeenCalledWith(expect.stringContaining('sẽ thay thế buổi tập đó'));
    expect(server.posts.length).toBe(posts); // declined: nothing overwritten

    ask.mockReturnValue(true);
    await save();
    await waitFor(() => expect(server.posts.length).toBe(posts + 1));
    ask.mockRestore();
  });

  test('an unlocked (isSaved:false) log is not restored either: the template is shown again', async () => {
    server.logs['2026-10-07'] = savedLegs({ isSaved: false });
    await setup();
    expect(screen.getByText(/^2\.\s*Leg Press/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ })).toBeInTheDocument();
  });

  test('each tab loads its own date', async () => {
    server.logs['2026-10-06'] = savedLegs({ date: '2026-10-06', selectedIds: ['e-row'], completedIds: [], detailsMap: { 'e-row': { sets: 4, reps: '8', completedSets: [] } } });
    const { user, tab } = await setup();
    await user.click(tab('Thứ 3'));
    await screen.findByText(/^1\.\s*Barbell Row/);
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/api/workouts?date=2026-10-06'))).toBe(true);
    expect(screen.getByText(/ĐÃ CHỐT LỊCH/)).toBeInTheDocument();
  });
});

// =========================================================================================================
describe('Workouts: editing the plan before saving', () => {
  test('sets can be changed with - and +, never below 1 or above 50', async () => {
    const { user } = await setup();
    const minus = () => screen.getAllByRole('button', { name: /^Giảm số hiệp/ })[0];
    const plus = () => screen.getAllByRole('button', { name: /^Tăng số hiệp/ })[0];

    await user.click(plus());
    expect(screen.getAllByDisplayValue('5').length).toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) await user.click(minus()); // 5 -> would be -1
    expect(screen.queryAllByDisplayValue('0')).toHaveLength(0);
    expect(screen.queryAllByDisplayValue('-1')).toHaveLength(0);
    expect(screen.getAllByDisplayValue('1').length).toBeGreaterThan(0); // floor

    // typing a huge number is clamped to 50, and 0 / empty to 1
    const field = screen.getAllByRole('textbox').find(el => (el as HTMLInputElement).value === '1') as HTMLInputElement;
    fireEvent.change(field, { target: { value: '999' } });
    expect(screen.getAllByDisplayValue('50').length).toBeGreaterThan(0);
    expect(screen.queryAllByDisplayValue('999')).toHaveLength(0);
    fireEvent.change(screen.getAllByRole('textbox').find(el => (el as HTMLInputElement).value === '50') as HTMLInputElement, { target: { value: '' } });
    expect(screen.getAllByDisplayValue('1').length).toBeGreaterThan(0);
  });

  test('reps can be changed with - and + (never below 1)', async () => {
    const { user } = await setup();
    const repsMinus = () => screen.getAllByRole('button', { name: /^Giảm số lần/ })[0]; // [sets, reps] of the first exercise
    const repsPlus = () => screen.getAllByRole('button', { name: /^Tăng số lần/ })[0];
    await user.click(repsPlus());
    expect(screen.getAllByDisplayValue('9').length).toBeGreaterThan(0); // 8 -> 9
    for (let i = 0; i < 9; i++) await user.click(repsMinus()); // 9 -> would be 0
    expect(screen.getAllByDisplayValue('1').length).toBeGreaterThan(0);
  });

  test('edited sets/reps are what gets saved', async () => {
    const { user, saveAndWait } = await setup();
    await user.click(screen.getAllByRole('button', { name: /^Tăng số hiệp/ })[0]); // squat sets 4 -> 5
    await user.click(screen.getAllByRole('button', { name: /^Tăng số lần/ })[0]); // squat reps 8 -> 9
    await saveAndWait();
    expect(lastPost().detailsMap['e-squat']).toMatchObject({ sets: 5, reps: '9' });
    expect(lastPost().exercises[0]).toMatchObject({ name: 'Squat', sets: 5, reps: '9' });
  });

  test('an exercise can be removed from the day and is not saved', async () => {
    const { user, saveAndWait } = await setup();
    await user.click(screen.getAllByRole('button', { name: /Xóa/ })[1]); // Leg Press
    expect(screen.queryByText(/^2\.\s*Leg Press/)).not.toBeInTheDocument();
    await saveAndWait();
    expect(lastPost().selectedIds).toEqual(['e-squat']);
  });

  test('an exercise can be added from the library; already-added ones say so', async () => {
    const { user, saveAndWait } = await setup();
    expect(screen.getAllByRole('button', { name: 'Đã thêm' })).toHaveLength(2); // squat + leg press
    const addButtons = screen.getAllByRole('button', { name: '+ Thêm bài này' });
    expect(addButtons.length).toBe(6);

    const curlRow = screen.getAllByText('Biceps Curl')[0].closest('div.flex.items-center.justify-between, div')!;
    await user.click(within(curlRow.parentElement!).getAllByRole('button', { name: '+ Thêm bài này' })[0]);
    expect(await screen.findByText(/^3\.\s*Biceps Curl/)).toBeInTheDocument();

    await saveAndWait();
    expect(lastPost().selectedIds).toEqual(['e-squat', 'e-legpress', 'e-curl']);
  });

  test('the library can be searched by name, equipment or muscle', async () => {
    const { user } = await setup();
    const search = screen.getByPlaceholderText('Tìm tên bài tập, dụng cụ...');
    await user.type(search, 'pulldown');
    expect(screen.getAllByText('Lat Pulldown').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Biceps Curl')).toHaveLength(0);

    await user.clear(search);
    await user.type(search, 'zzz-nothing');
    expect(screen.getByText(/Không tìm thấy bài tập nào khớp từ khóa "zzz-nothing"/)).toBeInTheDocument();
  });

  test('"Khôi phục lịch gốc" brings the template back after edits', async () => {
    const { user } = await setup();
    await user.click(screen.getAllByRole('button', { name: /Xóa/ })[0]);
    await user.click(screen.getAllByRole('button', { name: /Xóa/ })[0]);
    expect(screen.getByText(/Chưa có bài tập nào được chọn/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Khôi phục lịch gốc/ }));
    expect(await screen.findByText(/^1\.\s*Squat/)).toBeInTheDocument();
    expect(screen.getByText(/^2\.\s*Leg Press/)).toBeInTheDocument();
    expect(screen.getByText(/Đã khôi phục danh sách bài tập về lịch gốc/)).toBeInTheDocument();
  });

  test('below xl the library opens from "Thêm bài tập" as a dialog; Escape closes it', async () => {
    const { user } = await setup();
    expect(screen.queryByRole('dialog', { name: 'Thư viện bài tập' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thêm bài tập' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Thư viện bài tập' }));
    expect(dialog.getByPlaceholderText(/Tìm tên bài tập/)).toBeInTheDocument();

    await user.click(dialog.getAllByRole('button', { name: '+ Thêm bài này' })[0]);
    expect(await screen.findByText(/^3\.\s/)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Thư viện bài tập' })).not.toBeInTheDocument();
  });

  test('once the plan is locked, the library is locked too', async () => {
    const { saveAndWait } = await setup();
    await saveAndWait();
    expect(screen.queryAllByRole('button', { name: '+ Thêm bài này' })).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Đã chốt' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Khôi phục lịch gốc/ })).not.toBeInTheDocument();
  });
});

// =========================================================================================================
describe('Workouts: muscle targets and the body model', () => {
  test('shows a counter per muscle group: done / target', async () => {
    await setup();
    expect(pageText()).toMatch(/Đùi trước \(Quads\)\s*2\/2 Bài ✓/);
  });

  test('choosing more exercises for a muscle than the plan suggests shows a warning, and it goes away again', async () => {
    const { user, tab } = await setup();
    await user.click(tab('Thứ 5')); // "Upper": a single chest exercise planned
    await screen.findByText(/Thứ 5 \(Upper\)/);
    expect(pageText()).toMatch(/Ngực \(Chest\)\s*1\/1 Bài ✓/);
    expect(screen.queryByText(/CẢNH BÁO VƯỢT QUÁ/)).not.toBeInTheDocument();

    const inclineRow = screen.getAllByText('Incline Press')[0].closest('div')!.parentElement!;
    await user.click(within(inclineRow).getAllByRole('button', { name: '+ Thêm bài này' })[0]);

    expect(await screen.findByText(/CẢNH BÁO VƯỢT QUÁ LỊCH TẬP ĐỀ XUẤT/)).toBeInTheDocument();
    expect(pageText()).toContain('Ngực (Chest) (2/1)');
    expect(pageText()).toMatch(/Ngực \(Chest\)\s*2\/1 Bài/);

    await user.click(screen.getAllByRole('button', { name: /Xóa/ })[1]); // remove it again
    await waitFor(() => expect(screen.queryByText(/CẢNH BÁO VƯỢT QUÁ/)).not.toBeInTheDocument());
  });

  test('a muscle that is not in the plan at all gets a counter as soon as an exercise for it is added', async () => {
    const { user } = await setup();
    expect(pageText()).not.toMatch(/Tay trước \(Biceps\)\s*\d\/\d Bài/); // no counter yet (the name only appears in the library)
    const curlRow = screen.getAllByText('Biceps Curl')[0].closest('div')!.parentElement!;
    await user.click(within(curlRow).getAllByRole('button', { name: '+ Thêm bài này' })[0]);
    expect(pageText()).toMatch(/Tay trước \(Biceps\)\s*1\/1 Bài/);
  });

  test('the model highlights the muscles trained today', async () => {
    await setup();
    const data = JSON.parse(screen.getByTestId('body-model').textContent!);
    expect(data[0].muscles).toEqual(['quadriceps']);
  });

  test("'lats' is drawn on the upper back (the model has no lats region)", async () => {
    const { user, tab } = await setup();
    await user.click(tab('Thứ 3'));
    await screen.findByText(/^2\.\s*Lat Pulldown/);
    const muscles = JSON.parse(screen.getByTestId('body-model').textContent!)[0].muscles;
    expect(muscles).toContain('upper-back');
    expect(muscles).not.toContain('lats');
  });

  test('clicking a muscle filter narrows the library to that muscle; clicking again clears it', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: /Đùi trước \(Quads\)/ }));
    expect(screen.getByText(/Thư viện bài tập: Đùi trước/)).toBeInTheDocument();
    expect(screen.queryAllByText('Biceps Curl')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /Đùi trước \(Quads\)/ }));
    expect(screen.getByText('Thư viện bài tập (Tất cả)')).toBeInTheDocument();
  });
});

// =========================================================================================================
describe('Workouts: routines and tabs', () => {
  test('switching tab changes the plan and the date, and does NOT write the profile (rate-limit regression)', async () => {
    const { user, tab } = await setup();
    await user.click(tab('Thứ 2'));
    expect(await screen.findByText(/^1\.\s*Bench Press/)).toBeInTheDocument();
    expect(screen.getByText(/Thứ 2 \(Push\)/)).toBeInTheDocument();
    await user.click(tab('Thứ 3'));
    await screen.findByText(/^1\.\s*Barbell Row/);
    expect(server.puts).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
  });

  test('choosing another routine saves the choice on the profile and shows that routine', async () => {
    const { user } = await setup();
    await user.selectOptions(screen.getByRole('combobox'), 'fullbody');
    await waitFor(() => expect(server.puts).toHaveLength(1));
    expect(server.puts[0]).toEqual({ lastActiveRoutineId: 'fullbody', lastActiveRoutineName: 'Fullbody' });
    expect(screen.getByRole('combobox')).toHaveValue('fullbody');
    expect(await screen.findByText(/Thứ 2 \(Full A\)/)).toBeInTheDocument();
  });

  test('the free mode has no day tabs', async () => {
    const { user } = await setup();
    await user.selectOptions(screen.getByRole('combobox'), 'none');
    await waitFor(() => expect(server.puts.length).toBe(1));
    expect(screen.queryByText('📌 HÔM NAY')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thứ 2/ })).not.toBeInTheDocument();
  });

  test('the stats card shows the active routine name', async () => {
    await setup();
    expect(screen.getAllByText('Push Pull Legs').length).toBeGreaterThan(0);
  });
});

// =========================================================================================================
describe('Workouts: exercise details', () => {
  test('"Chi tiết" opens a modal with the exercise and a YouTube search fallback when there is no video', async () => {
    const { user } = await setup();
    await user.click(screen.getAllByText(/Chi tiết/)[0]);
    expect(await screen.findByText('Chi Tiết Bài Tập')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: /Xem thêm/ })).toHaveAttribute('href', 'https://www.youtube.com/results?search_query=Squat');
  });

  test('an exercise with a YouTube URL embeds the video', async () => {
    server.exercises = EXERCISES.map(e => (e._id === 'e-squat' ? { ...e, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' } : e));
    const { user } = await setup();
    await user.click(screen.getAllByText(/Chi tiết/)[0]);
    await screen.findByText('Chi Tiết Bài Tập');
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });
});

// =========================================================================================================
describe('Workouts: weight lifted per set', () => {
  const weightBox = (set: number) => screen.getByLabelText(new RegExp(`^Mức tạ Hiệp ${set} của Squat`)) as HTMLInputElement;

  test('the boxes are locked until the plan is saved', async () => {
    await setup();
    expect(weightBox(1)).toBeDisabled();
  });

  test('typing a weight and leaving the box saves it with the log', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    const before = server.posts.length;
    await user.type(weightBox(1), '60');
    expect(server.posts.length).toBe(before); // saved when the box loses focus, not per keystroke
    await user.tab();

    await waitFor(() => expect(server.posts.length).toBe(before + 1));
    expect(lastPost().detailsMap['e-squat'].setWeights).toEqual({ 0: '60' });
    expect(lastPost().completedIds).toEqual([]);
  });

  test('weights of several sets are kept together; a decimal comma becomes a point', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    await user.type(weightBox(1), '60');
    await user.tab();
    await user.type(weightBox(2), '62,5');
    await user.tab();
    await waitFor(() => expect(lastPost().detailsMap['e-squat'].setWeights).toEqual({ 0: '60', 1: '62.5' }));
  });

  test('the box refuses letters, negatives and absurd values', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    await user.type(weightBox(1), 'a-5');
    expect(weightBox(1).value).toBe('5');
    await user.clear(weightBox(1));
    await user.type(weightBox(1), '1001');
    expect(weightBox(1).value).toBe('100');
  });

  test('tabbing through a box without changing it does not save', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    const before = server.posts.length;
    await user.click(weightBox(1));
    await user.tab();
    expect(server.posts.length).toBe(before);
  });

  test('ticking a set saves the weights typed so far in the same snapshot', async () => {
    const { user, saveAndWait, setTick } = await setup();
    await saveAndWait();
    await user.type(weightBox(1), '70');
    await user.click(setTick(0)); // the click blurs the box first
    await waitFor(() => expect(lastPost().detailsMap['e-squat'].completedSets).toEqual([0]));
    expect(lastPost().detailsMap['e-squat'].setWeights).toEqual({ 0: '70' });
  });

  test('clearing a weight removes it from the saved log', async () => {
    const { user, saveAndWait } = await setup();
    await saveAndWait();
    await user.type(weightBox(1), '70');
    await user.tab();
    await waitFor(() => expect(lastPost().detailsMap['e-squat'].setWeights).toEqual({ 0: '70' }));
    await user.clear(weightBox(1));
    await user.tab();
    await waitFor(() => expect(lastPost().detailsMap['e-squat'].setWeights).toEqual({}));
  });

  test('saved weights come back in the boxes after a reload', async () => {
    server.logs['2026-10-07'] = {
      date: '2026-10-07', routineId: 'ppl', routineName: 'Push Pull Legs', dayName: 'Thứ 4: Legs', dayIndex: 2,
      selectedIds: ['e-squat'], completedIds: [],
      detailsMap: { 'e-squat': { sets: 4, reps: '8', completedSets: [0], setWeights: { 0: 80, 1: '82.5' } } },
      exercises: [], isSaved: true,
    };
    await setup();
    expect(weightBox(1).value).toBe('80');
    expect(weightBox(2).value).toBe('82.5');
    expect(weightBox(3).value).toBe('');
  });

  test('the section tabs lead to the routines, records and volume pages', async () => {
    await setup();
    const tabs = within(screen.getByRole('navigation', { name: 'Mục Tập luyện' }));
    expect(tabs.getByRole('link', { name: 'Kỷ lục' })).toHaveAttribute('href', '/records');
    expect(tabs.getByRole('link', { name: 'Lịch tập' })).toHaveAttribute('href', '/routines');
    expect(tabs.getByRole('link', { name: 'Khối lượng' })).toHaveAttribute('href', '/volume');
    expect(tabs.getByRole('link', { name: 'Buổi tập' })).toHaveAttribute('aria-current', 'page');
  });
});
