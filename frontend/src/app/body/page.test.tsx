import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import BodyPage from './page';
import { apiFetch } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import { todayStr } from '@/utils/dateUtils';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/body' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({
  fetcher: vi.fn(),
  refreshProfile: vi.fn(async () => undefined),
  useProfile: vi.fn(() => ({ profile: undefined as unknown })),
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

import { fetcher, useProfile } from '@/hooks/useApi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const metric = (date: string, weight: number, bodyFat: number | null = null, waist: number | null = null) => ({ date, weight, bodyFat, waist });

const HISTORY = [metric('2026-05-01', 75), metric('2026-05-08', 73.5, 19.5, 85), metric('2026-05-15', 72.5)];

const setup = async (history: unknown[] = HISTORY) => {
  vi.mocked(fetcher).mockResolvedValue(history);
  const user = userEvent.setup({ delay: null });
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><BodyPage /></SWRConfig>);
  await screen.findByRole('heading', { name: /Số đo cơ thể/ });
  const field = (re: RegExp | string) => screen.getByLabelText(re) as HTMLInputElement;
  const save = () => user.click(screen.getByRole('button', { name: /Lưu số đo|Đang lưu/ }));
  const retype = async (re: RegExp | string, v: string) => { await user.clear(field(re)); if (v) await user.type(field(re), v); };
  return { user, field, save, retype };
};

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(fetcher).mockReset();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(refreshProfile).mockClear();
  vi.mocked(useProfile).mockReturnValue({ profile: undefined } as unknown as ReturnType<typeof useProfile>);
  vi.mocked(apiFetch).mockResolvedValue(json({ metric: {}, profileWeight: 72 }));
  localStorage.clear();
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Body page: showing the history', () => {
  test('summary cards: current weight, change since the first entry, lowest / highest', async () => {
    await setup();
    expect(screen.getByText('Hiện tại').parentElement).toHaveTextContent('72.5 kg');
    expect(screen.getByTestId('weight-change')).toHaveTextContent('-2.5 kg');
    expect(screen.getByText('72.5 / 75')).toBeInTheDocument();
  });

  test('a gain is shown with a plus sign', async () => {
    await setup([metric('2026-05-01', 70), metric('2026-05-02', 71.2)]);
    expect(screen.getByTestId('weight-change')).toHaveTextContent('+1.2 kg');
  });

  test('a single measurement has no change yet', async () => {
    await setup([metric('2026-05-01', 70)]);
    expect(screen.getByTestId('weight-change')).toHaveTextContent('—');
  });

  test('history lists newest first with the optional values', async () => {
    await setup();
    const rows = screen.getAllByTestId('history-row');
    expect(rows.map(r => r.textContent)).toEqual([
      expect.stringContaining('15/05/2026'),
      expect.stringContaining('08/05/2026'),
      expect.stringContaining('01/05/2026'),
    ]);
    expect(rows[1]).toHaveTextContent('19.5% mỡ');
    expect(rows[1]).toHaveTextContent('eo 85 cm');
    expect(rows[0]).not.toHaveTextContent('mỡ');
  });

  test('the chart is drawn with one point per measurement', async () => {
    await setup();
    const chart = screen.getByRole('img', { name: /Biểu đồ cân nặng từ 2026-05-01 đến 2026-05-15/ });
    expect(chart.querySelectorAll('circle')).toHaveLength(3);
    expect(chart.querySelector('path')).not.toBeNull();
  });

  test('with no measurements: an invitation, no history list, empty cards', async () => {
    await setup([]);
    expect(screen.getByText(/Chưa có số đo nào/)).toBeInTheDocument();
    expect(screen.queryByText('Lịch sử')).not.toBeInTheDocument();
    expect(screen.getByTestId('weight-change')).toHaveTextContent('—');
  });

  test('the form starts from the latest weight and today', async () => {
    const { field } = await setup();
    expect(field(/Cân nặng/).value).toBe('72.5');
    expect(field('Ngày').value).toBe(todayStr());
    expect(field('Ngày').max).toBe(todayStr());
  });

  test('requests the last 180 days up to today', async () => {
    await setup();
    const path = vi.mocked(fetcher).mock.calls[0][0] as string;
    const { searchParams } = new URL(path, 'http://x');
    expect(searchParams.get('to')).toBe(todayStr());
    const from = new Date(`${searchParams.get('from')}T00:00:00`);
    const to = new Date(`${searchParams.get('to')}T00:00:00`);
    expect(Math.round((to.getTime() - from.getTime()) / 86400000)).toBe(179);
  });
});

describe('Body page: saving', () => {
  test('POSTs numbers with the chosen date, then refreshes the history and the profile', async () => {
    const { retype, save } = await setup();
    await retype(/Cân nặng/, '71.8');
    await retype(/Tỷ lệ mỡ/, '18');
    await retype(/Vòng eo/, '80');
    await save();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/body-metrics');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(options!.body as string)).toEqual({ date: todayStr(), weight: 71.8, bodyFat: 18, waist: 80 });
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu số đo!');
    expect(refreshProfile).toHaveBeenCalled();
    await waitFor(() => expect(vi.mocked(fetcher).mock.calls.length).toBeGreaterThan(1)); // list reloaded
  });

  test('blank optional fields are not sent; the optional boxes are cleared afterwards', async () => {
    const { retype, save, field } = await setup();
    await retype(/Tỷ lệ mỡ/, '18');
    await save();
    await screen.findByRole('status');
    expect(field(/Tỷ lệ mỡ/).value).toBe('');

    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[1][1]!.body as string)).toEqual({ date: todayStr(), weight: 72.5 });
  });

  test('another date can be chosen (to back-fill or correct a day)', async () => {
    const { field, save } = await setup();
    fireEvent.change(field('Ngày'), { target: { value: '2026-05-08' } });
    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string).date).toBe('2026-05-08');
  });

  test.each([
    ['weight', /Cân nặng/, '9', 'Cân nặng'],
    ['weight', /Cân nặng/, '501', 'Cân nặng'],
    ['weight', /Cân nặng/, '', 'Cân nặng'],
    ['body fat', /Tỷ lệ mỡ/, '1', 'mỡ'],
    ['body fat', /Tỷ lệ mỡ/, '71', 'mỡ'],
    ['waist', /Vòng eo/, '29', 'eo'],
    ['waist', /Vòng eo/, '251', 'eo'],
  ])('%s = %j is refused with a message and nothing is sent', async (_n, label, value, text) => {
    const { retype, save } = await setup();
    await retype(label, value);
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a date in the future is refused', async () => {
    const { field, save } = await setup();
    fireEvent.change(field('Ngày'), { target: { value: '2999-01-01' } });
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('tương lai');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('an empty date is refused', async () => {
    const { field, save } = await setup();
    fireEvent.change(field('Ngày'), { target: { value: '' } });
    await save();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a server rejection shows its message and does not claim success', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Cân nặng không hợp lệ' }, 400));
    const { save } = await setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cân nặng không hợp lệ');
    expect(screen.queryByText('Đã lưu số đo!')).not.toBeInTheDocument();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  test('a rejection without a message gets a generic one', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 500));
    const { save } = await setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Lưu số đo thất bại');
  });

  test('a network failure is explained in plain words', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const { save } = await setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent(/kết nối|mạng/i);
  });

  test('while saving the button is disabled and a second submit is ignored', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { save } = await setup();
    await save();
    const busy = await screen.findByRole('button', { name: 'Đang lưu...' });
    expect(busy).toBeDisabled();
    fireEvent.submit(busy.closest('form')!);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(json({ metric: {}, profileWeight: 72 }));
    await screen.findByRole('status');
  });
});

describe('Body page: deleting', () => {
  test('asks first, then deletes that day and refreshes the profile', async () => {
    await setup();
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Xóa số đo ngày 2026-05-08' }));
    expect(confirm).toHaveBeenCalledWith('Xóa số đo ngày 2026-05-08?');
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/body-metrics?date=2026-05-08', { method: 'DELETE' }));
    expect(refreshProfile).toHaveBeenCalled();
  });

  test('cancelling the confirmation deletes nothing', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    await setup();
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Xóa số đo ngày 2026-05-08' }));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('a failed delete is reported', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 500));
    await setup();
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Xóa số đo ngày 2026-05-01' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xóa được số đo');
    expect(refreshProfile).not.toHaveBeenCalled();
  });
});

describe('Body page: loading problems', () => {
  test('401 clears the session and goes to /login', async () => {
    vi.mocked(fetcher).mockRejectedValue({ status: 401 });
    localStorage.setItem('token', 'old');
    render(<SWRConfig value={{ provider: () => new Map() }}><BodyPage /></SWRConfig>);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('another failure shows a retry banner (and keeps the page usable)', async () => {
    vi.mocked(fetcher).mockRejectedValueOnce({ status: 500 }).mockResolvedValue(HISTORY);
    render(<SWRConfig value={{ provider: () => new Map() }}><BodyPage /></SWRConfig>);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không tải được lịch sử số đo');
    expect(nav.push).not.toHaveBeenCalled();
    await userEvent.setup({ delay: null }).click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('72.5 / 75')).toBeInTheDocument();
  });
});

describe('Body page: calorie advice', () => {
  const PROFILE = { weight: 72.5, height: 175, age: 30, gender: 'Nam', activityLevel: 'Vận động vừa', goal: 'Giảm mỡ', calorieAdjustment: 0 };
  const FLAT = [metric('2026-05-01', 72), metric('2026-05-08', 72), metric('2026-05-15', 72), metric('2026-05-22', 72)];

  test('shows the advice once the profile is loaded', async () => {
    vi.mocked(useProfile).mockReturnValue({ profile: PROFILE } as unknown as ReturnType<typeof useProfile>);
    await setup(FLAT);
    expect(screen.getByRole('heading', { name: /Gợi ý điều chỉnh calo/ })).toBeInTheDocument();
    expect(screen.getByTestId('advice-text')).toHaveTextContent('Nên giảm');
  });

  test('is not shown without a profile', async () => {
    await setup(FLAT);
    expect(screen.queryByRole('heading', { name: /Gợi ý điều chỉnh calo/ })).not.toBeInTheDocument();
  });
});

describe('Body page: body composition and the US Navy estimate', () => {
  const man = { weight: 72.5, height: 175, age: 30, gender: 'Nam', activityLevel: 'Vận động vừa', goal: 'Giảm mỡ', calorieAdjustment: 0 };

  test('the latest body fat gives lean / fat mass and the ACE category', async () => {
    vi.mocked(useProfile).mockReturnValue({ profile: man } as unknown as ReturnType<typeof useProfile>);
    await setup();
    const card = screen.getByTestId('body-composition');
    expect(card).toHaveTextContent('19.5%');
    expect(card).toHaveTextContent('Trung bình (ACE)'); // men 18-24 %
    expect(card).toHaveTextContent('Khối nạc59.2 kg'); // 73.5 * 0.805
    expect(card).toHaveTextContent('Khối mỡ14.3 kg');
    expect(screen.getByTestId('body-fat-change')).toHaveTextContent('—');
  });

  test('without any body fat there is no composition card', async () => {
    vi.mocked(useProfile).mockReturnValue({ profile: man } as unknown as ReturnType<typeof useProfile>);
    await setup([metric('2026-05-01', 70)]);
    expect(screen.queryByTestId('body-composition')).not.toBeInTheDocument();
  });

  test('waist + neck give a Navy estimate that can be copied into the body-fat field', async () => {
    vi.mocked(useProfile).mockReturnValue({ profile: man } as unknown as ReturnType<typeof useProfile>);
    const { user, field } = await setup();
    expect(screen.queryByTestId('navy-estimate')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Vòng hông/)).not.toBeInTheDocument(); // men: no hip
    await user.type(field(/Vòng eo/), '85');
    await user.type(field(/Vòng cổ/), '38');
    expect(screen.getByTestId('navy-estimate')).toHaveTextContent('16.9%');
    await user.click(screen.getByRole('button', { name: 'Dùng giá trị này' }));
    expect(field(/Tỷ lệ mỡ/).value).toBe('16.9');
    expect(screen.queryByTestId('navy-estimate')).not.toBeInTheDocument();
  });

  test('women also enter the hip, and the measurements are sent with the weight', async () => {
    vi.mocked(useProfile).mockReturnValue({ profile: { ...man, gender: 'Nữ', height: 160 } } as unknown as ReturnType<typeof useProfile>);
    const { user, field, save } = await setup();
    await user.type(field(/Vòng eo/), '72');
    await user.type(field(/Vòng cổ/), '34');
    expect(screen.queryByTestId('navy-estimate')).not.toBeInTheDocument();
    await user.type(field(/Vòng hông/), '92');
    expect(screen.getByTestId('navy-estimate')).toHaveTextContent('24.6%');
    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]!.body))).toMatchObject({ waist: 72, neck: 34, hip: 92 });
  });
});
