import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoutinesPage from './page';
import { apiFetch } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import type { Exercise, Routine } from '@/types/domain';
import { postAi } from '@/utils/ai';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
const hooks = vi.hoisted(() => ({
  routines: undefined as Routine[] | undefined,
  routinesError: undefined as unknown,
  mutate: vi.fn(async () => undefined),
  exercises: [] as Exercise[],
  profile: { lastActiveRoutineId: 'ppl' } as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/routines' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({
  useRoutines: () => ({ routines: hooks.routines, error: hooks.routinesError, isLoading: false, mutate: hooks.mutate }),
  useExercises: () => ({ exercises: hooks.exercises }),
  useProfile: () => ({ profile: hooks.profile }),
  refreshProfile: vi.fn(async () => undefined),
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

vi.mock('@/utils/ai', () => ({ postAi: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LIBRARY = [
  { _id: 'e1', name: 'Bench Press', muscle: 'chest', defaultSets: 4, defaultReps: '8-10' },
  { _id: 'e2', name: 'Incline Dumbbell Press', muscle: 'chest' },
  { _id: 'e3', name: 'Squat', muscle: 'quadriceps', defaultSets: 5, defaultReps: '5' },
];
const BUILTIN = { id: 'ppl', name: 'Push Pull Legs', isMine: false, schedule: [] };
const MINE = {
  id: 'u1-abc', name: 'My Split', isMine: true,
  schedule: [
    { day: 'Thứ 2', name: 'Push', isRestDay: false, exercises: [{ exerciseId: 'e1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '8-12', restTimeSeconds: 120 }] },
    { day: 'Thứ 3', name: 'Nghỉ', isRestDay: true, exercises: [] },
  ],
};

const setup = (routines: Routine[] = [BUILTIN, MINE]) => {
  hooks.routines = routines;
  const user = userEvent.setup({ delay: null });
  render(<RoutinesPage />);
  const day = (d: string) => screen.getByRole('region', { name: d });
  const setMode = (d: string, label: string) => user.click(within(screen.getByRole('group', { name: `Loại ngày ${d}` })).getByRole('button', { name: label }));
  const save = () => user.click(screen.getByRole('button', { name: /Lưu lịch tập|Đang lưu/ }));
  const addExercise = async (d: string, search: string, pick: string) => {
    await user.type(within(day(d)).getByLabelText(/Thêm bài tập/), search);
    await user.click(within(day(d)).getByRole('button', { name: new RegExp(pick) }));
  };
  return { user, day, setMode, save, addExercise };
};

beforeEach(() => {
  nav.push.mockClear();
  hooks.routines = undefined;
  hooks.routinesError = undefined;
  hooks.exercises = LIBRARY;
  hooks.profile = { lastActiveRoutineId: 'ppl' };
  hooks.mutate.mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiFetch).mockResolvedValue(json({}));
  vi.mocked(refreshProfile).mockClear();
  localStorage.clear();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

type Ctx = ReturnType<typeof setup>;

const bodyOf = (call = 0) => JSON.parse(vi.mocked(apiFetch).mock.calls[call][1]!.body as string);

describe('Routines: the list', () => {
  test('sits in the Tập luyện section: shared title, its tab current, create buttons in the header', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Tập luyện' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lịch tập' })).toHaveAttribute('aria-current', 'page');
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('button', { name: /Tạo bằng AI/ })).toBeInTheDocument();
    expect(header.getByRole('button', { name: /Tạo lịch mới/ })).toBeInTheDocument();
  });

  test('shows only my routines with a summary; built-in ones are not listed', () => {
    setup();
    const rows = screen.getAllByTestId('my-routine');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('My Split');
    expect(rows[0]).toHaveTextContent('1 ngày tập · 1 bài');
    expect(screen.queryByText('Push Pull Legs')).not.toBeInTheDocument();
  });

  test('marks the routine that is currently in use', () => {
    hooks.profile = { lastActiveRoutineId: 'u1-abc' };
    setup();
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();
  });

  test('an invitation when there are none', () => {
    setup([BUILTIN]);
    expect(screen.getByText(/chưa có lịch tập riêng/)).toBeInTheDocument();
  });

  test('"new" is disabled at the 10-routine limit', () => {
    setup(Array.from({ length: 10 }, (_, i) => ({ ...MINE, id: `m${i}`, name: `R${i}` })));
    expect(screen.getByRole('button', { name: /Tạo lịch mới/ })).toBeDisabled();
  });

  test('401 clears the session; another failure shows a retry banner', async () => {
    hooks.routinesError = { status: 401 };
    localStorage.setItem('token', 'x');
    const { unmount } = render(<RoutinesPage />);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
    unmount();

    nav.push.mockClear();
    hooks.routinesError = { status: 500 };
    hooks.routines = [];
    render(<RoutinesPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được danh sách');
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/chưa có lịch tập riêng/)).not.toBeInTheDocument();
  });
});

describe('Routines: using, deleting', () => {
  test('"use" makes it the active routine and refreshes the profile', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Dùng lịch này' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/users/profile');
    expect(options?.method).toBe('PUT');
    expect(bodyOf()).toEqual({ lastActiveRoutineId: 'u1-abc', lastActiveRoutineName: 'My Split' });
    expect(await screen.findByRole('status')).toHaveTextContent('Đang dùng lịch "My Split"');
    expect(refreshProfile).toHaveBeenCalled();
  });

  test('a failed "use" is reported and the profile is not refreshed', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 500));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Dùng lịch này' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đổi được');
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  test('delete asks first, then removes and reloads the list', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa lịch tập My Split' }));
    expect(confirm).toHaveBeenCalledWith('Xóa lịch tập "My Split"?');
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/routines/mine/u1-abc', { method: 'DELETE' }));
    await waitFor(() => expect(hooks.mutate).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Đã xóa');
  });

  test('cancelling the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa lịch tập My Split' }));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a failed delete is reported', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 500));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Xóa lịch tập My Split' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xóa được');
    expect(hooks.mutate).not.toHaveBeenCalled();
  });
});

describe('Routines: creating', () => {
  test('builds a routine from the library and POSTs the tidy body', async () => {
    const { user, setMode, addExercise, save } = setup([BUILTIN]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Upper Lower');
    await setMode('Thứ 2', 'Ngày tập');
    await user.type(screen.getByLabelText('Tên buổi tập'), 'Upper');
    await addExercise('Thứ 2', 'bench', 'Bench Press');
    await setMode('Thứ 3', 'Ngày nghỉ');
    await save();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/routines/mine');
    expect(options?.method).toBe('POST');
    expect(bodyOf()).toEqual({
      name: 'Upper Lower',
      description: '',
      schedule: [
        { day: 'Thứ 2', name: 'Upper', isRestDay: false, exercises: [{ exerciseId: 'e1', exerciseName: 'Bench Press', muscle: 'chest', sets: 4, repsRange: '8-10', restTimeSeconds: 90 }] },
        { day: 'Thứ 3', name: 'Nghỉ ngơi', isRestDay: true, exercises: [] },
      ],
    });
    expect(hooks.mutate).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Đã tạo lịch tập!');
    expect(screen.queryByLabelText('Tên lịch tập')).not.toBeInTheDocument(); // back to the list
  });

  test('exercise parameters can be edited and an exercise removed', async () => {
    const { user, setMode, addExercise, save } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Mine');
    await setMode('Thứ 2', 'Ngày tập');
    await user.type(screen.getByLabelText('Tên buổi tập'), 'A');
    await addExercise('Thứ 2', 'squat', 'Squat');
    await addExercise('Thứ 2', 'incline', 'Incline');
    expect(screen.getAllByTestId('draft-exercise')).toHaveLength(2);

    const sets = screen.getByLabelText('Hiệp - Squat (Thứ 2)');
    await user.clear(sets);
    await user.type(sets, '6');
    await user.click(screen.getByRole('button', { name: 'Bỏ Incline Dumbbell Press khỏi Thứ 2' }));
    expect(screen.getAllByTestId('draft-exercise')).toHaveLength(1);
    await save();

    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(bodyOf().schedule[0].exercises).toEqual([expect.objectContaining({ exerciseName: 'Squat', sets: 6, repsRange: '5' })]);
  });

  test('search shows matches, an empty result says so, and picking clears the box', async () => {
    const { user, setMode, day } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await setMode('Thứ 2', 'Ngày tập');
    const box = within(day('Thứ 2')).getByLabelText(/Thêm bài tập/) as HTMLInputElement;
    await user.type(box, 'press');
    expect(within(day('Thứ 2')).getAllByRole('button', { name: /Press/ })).toHaveLength(2);
    await user.clear(box);
    await user.type(box, 'zzz');
    expect(within(day('Thứ 2')).getByText('Không tìm thấy bài tập nào.')).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'squat');
    await user.click(within(day('Thứ 2')).getByRole('button', { name: /Squat/ }));
    expect(box.value).toBe('');
  });

  test('an off day shows no fields; switching a day to rest hides its exercises', async () => {
    const { user, setMode, day } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    expect(within(day('Thứ 2')).queryByLabelText('Tên buổi tập')).not.toBeInTheDocument();
    await setMode('Thứ 2', 'Ngày tập');
    expect(within(day('Thứ 2')).getByLabelText('Tên buổi tập')).toBeInTheDocument();
    await setMode('Thứ 2', 'Ngày nghỉ');
    expect(within(day('Thứ 2')).queryByLabelText('Tên buổi tập')).not.toBeInTheDocument();
    expect(within(day('Thứ 2')).getByRole('button', { name: 'Ngày nghỉ' })).toHaveAttribute('aria-pressed', 'true');
  });

  test.each([
    ['no name', async (u: Ctx) => { await u.setMode('Thứ 2', 'Ngày tập'); }, 'Tên lịch tập'],
    ['no training day', async (u: Ctx) => { await u.user.type(screen.getByLabelText('Tên lịch tập'), 'X1'); }, 'ít nhất một ngày tập'],
    ['a training day without exercises', async (u: Ctx) => {
      await u.user.type(screen.getByLabelText('Tên lịch tập'), 'X1');
      await u.setMode('Thứ 2', 'Ngày tập');
      await u.user.type(screen.getByLabelText('Tên buổi tập'), 'A');
    }, 'ít nhất một bài'],
  ])('%s is refused with a message and nothing is sent', async (_n, prepare, text) => {
    const ctx = setup([]);
    await ctx.user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await prepare(ctx);
    await ctx.save();
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a bad sets value is refused before sending', async () => {
    const { user, setMode, addExercise, save } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Mine');
    await setMode('Thứ 2', 'Ngày tập');
    await user.type(screen.getByLabelText('Tên buổi tập'), 'A');
    await addExercise('Thứ 2', 'squat', 'Squat');
    const sets = screen.getByLabelText('Hiệp - Squat (Thứ 2)');
    await user.clear(sets);
    await user.type(sets, '99');
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('số hiệp');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a server rejection shows its message and keeps the editor open', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Bạn chỉ có thể tạo tối đa 10 lịch tập.' }, 400));
    const { user, setMode, addExercise, save } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Mine');
    await setMode('Thứ 2', 'Ngày tập');
    await user.type(screen.getByLabelText('Tên buổi tập'), 'A');
    await addExercise('Thứ 2', 'squat', 'Squat');
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('tối đa 10 lịch tập');
    expect(screen.getByLabelText('Tên lịch tập')).toHaveValue('Mine');
    expect(hooks.mutate).not.toHaveBeenCalled();
  });

  test('a network failure is explained and the draft is kept', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const { user, setMode, addExercise, save } = setup([]);
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Mine');
    await setMode('Thứ 2', 'Ngày tập');
    await user.type(screen.getByLabelText('Tên buổi tập'), 'A');
    await addExercise('Thứ 2', 'squat', 'Squat');
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent(/kết nối|mạng/i);
    expect(screen.getByLabelText('Tên lịch tập')).toHaveValue('Mine');
  });

  test('cancel returns to the list without saving', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Tạo lịch mới/ }));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByLabelText('Tên lịch tập')).not.toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('Routines: editing', () => {
  test('opens the routine with its values and PUTs the changes to its own URL', async () => {
    const { user, save } = setup();
    await user.click(screen.getByRole('button', { name: 'Sửa' }));
    expect(screen.getByLabelText('Tên lịch tập')).toHaveValue('My Split');
    expect(screen.getByLabelText('Tên buổi tập')).toHaveValue('Push');
    expect(screen.getByLabelText('Hiệp - Bench Press (Thứ 2)')).toHaveValue('4');
    expect(screen.getByLabelText('Số lần - Bench Press (Thứ 2)')).toHaveValue('8-12');

    await user.clear(screen.getByLabelText('Tên lịch tập'));
    await user.type(screen.getByLabelText('Tên lịch tập'), 'Renamed');
    await save();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/routines/mine/u1-abc');
    expect(options?.method).toBe('PUT');
    expect(bodyOf().name).toBe('Renamed');
    expect(bodyOf().schedule).toHaveLength(2);
    expect(await screen.findByRole('status')).toHaveTextContent('Đã cập nhật lịch tập!');
  });

  test('while saving the button is disabled and a second submit is ignored', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { user, save } = setup();
    await user.click(screen.getByRole('button', { name: 'Sửa' }));
    await save();
    const busy = await screen.findByRole('button', { name: 'Đang lưu...' });
    expect(busy).toBeDisabled();
    busy.closest('form')!.requestSubmit?.();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(json({}));
    await screen.findByRole('status');
  });
});

describe('Routines: AI draft', () => {
  test('a generated routine opens in the editor and nothing is saved until "Lưu"', async () => {
    vi.mocked(postAi).mockResolvedValue({ routine: { ...MINE, name: 'AI Plan', id: undefined } });
    const { user, save } = setup([BUILTIN]);

    await user.click(screen.getByRole('button', { name: 'Tạo bằng AI' }));
    await user.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(await screen.findByLabelText('Tên lịch tập')).toHaveValue('AI Plan');
    expect(screen.getByRole('status')).toHaveTextContent('Đã tạo bản nháp bằng AI');
    expect(apiFetch).not.toHaveBeenCalled();

    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/routines/mine');
    expect(vi.mocked(apiFetch).mock.calls[0][1]!.method).toBe('POST');
  });

  test('"Tạo bằng AI" is disabled at the 10-routine limit', () => {
    setup(Array.from({ length: 10 }, (_, i) => ({ ...MINE, id: `u${i}` })));
    expect(screen.getByRole('button', { name: 'Tạo bằng AI' })).toBeDisabled();
  });
});
