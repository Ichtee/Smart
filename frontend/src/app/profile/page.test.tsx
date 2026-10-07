import { todayStr } from '@/utils/dateUtils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from './page';
import { apiFetch } from '@/utils/api';
import { refreshProfile, useProfile } from '@/hooks/useApi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router }));
vi.mock('@/components/Sidebar', () => ({ default: () => <nav data-testid="sidebar" /> }));
vi.mock('@/hooks/useApi', () => ({
  useProfile: vi.fn(),
  refreshProfile: vi.fn(async () => undefined),
  clearApiCache: vi.fn(),
  isUnauthorizedError: (e: unknown) => (e as { status?: number })?.status === 401,
}));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const PROFILE = {
  _id: 'u1', name: 'Dana Pham', username: 'dana', email: 'dana@example.com',
  age: 30, gender: 'Nữ', height: 165, weight: 58, goal: 'Giữ dáng',
};

const mockProfile = (over: Record<string, unknown> = {}) =>
  vi.mocked(useProfile).mockReturnValue({ profile: { ...PROFILE, ...over }, error: undefined, isLoading: false } as never);

beforeEach(() => {
  nav.push.mockClear();
  localStorage.clear();
  vi.mocked(refreshProfile).mockClear();
  vi.mocked(apiFetch).mockReset().mockResolvedValue(json({ ...PROFILE, token: 'new-token' }));
  mockProfile();
});

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<Profile />);
  const field = (re: RegExp | string) => screen.getByLabelText(re) as HTMLInputElement;
  const save = () => user.click(screen.getByRole('button', { name: /Lưu thay đổi/ }));
  const retype = async (label: RegExp | string, value: string) => {
    await user.clear(field(label));
    if (value) await user.type(field(label), value);
  };
  return { user, field, save, retype };
};

describe('Profile: loading the form', () => {
  test('shows a spinner (no form) while the first load runs', () => {
    vi.mocked(useProfile).mockReturnValue({ profile: undefined, error: undefined, isLoading: true } as never);
    render(<Profile />);
    expect(screen.queryByRole('button', { name: /Lưu thay đổi/ })).not.toBeInTheDocument();
  });

  test('fills every field from the profile; username and email are read-only', () => {
    const { field } = setup();
    expect(field('Họ và tên').value).toBe('Dana Pham');
    expect(field('Giới tính').value).toBe('Nữ');
    expect(field('Tuổi').value).toBe('30');
    expect(field(/Chiều cao/).value).toBe('165');
    expect(field(/Cân nặng/).value).toBe('58');
    expect(field('Mục tiêu tập luyện').value).toBe('Giữ dáng');
    expect(screen.getByDisplayValue('dana')).toBeDisabled();
    expect(screen.getByDisplayValue('dana@example.com')).toBeDisabled();
  });

  test('a profile with missing measurements leaves the fields empty (not "undefined"/"0")', () => {
    mockProfile({ age: undefined, height: undefined, weight: undefined, gender: undefined, goal: undefined });
    const { field } = setup();
    for (const re of ['Tuổi', /Chiều cao/, /Cân nặng/]) expect(field(re).value).toBe('');
    expect(field('Giới tính').value).toBe('');
    expect(screen.queryByText('Mục tiêu')).not.toBeInTheDocument();
  });

  test('every goal the backend accepts is offered, including "Sức bền"', () => {
    setup();
    const goal = screen.getByLabelText('Mục tiêu tập luyện');
    expect(within(goal).getAllByRole('option').map(o => (o as HTMLOptionElement).value)).toEqual(
      ['', 'Tăng cơ', 'Giảm mỡ', 'Tăng cân', 'Giữ dáng', 'Sức bền']);
  });

  test('a session that has expired (401) clears the token and goes to login', () => {
    localStorage.setItem('token', 'old');
    vi.mocked(useProfile).mockReturnValue({ profile: undefined, error: { status: 401 }, isLoading: false } as never);
    render(<Profile />);
    expect(localStorage.getItem('token')).toBeNull();
    expect(nav.push).toHaveBeenCalledWith('/login');
  });

  test('another load failure tells the user to retry and keeps the session', () => {
    localStorage.setItem('token', 'keep');
    vi.mocked(useProfile).mockReturnValue({ profile: undefined, error: { status: 500 }, isLoading: false } as never);
    render(<Profile />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được hồ sơ');
    expect(localStorage.getItem('token')).toBe('keep');
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe('Profile: the BMI card', () => {
  test('shows the value and category for the loaded measurements', () => {
    setup();
    expect(screen.getByText('21.3')).toBeInTheDocument(); // 58 / 1.65^2
    expect(screen.getByText('Bình thường')).toBeInTheDocument();
  });

  test('updates live as the fields change', async () => {
    const { retype } = setup();
    await retype(/Cân nặng/, '90');
    expect(screen.getByText('33.1')).toBeInTheDocument();
    expect(screen.getByText('Béo phì')).toBeInTheDocument();
    await retype(/Cân nặng/, '45');
    expect(screen.getByText('Thiếu cân')).toBeInTheDocument();
  });

  test('asks for the measurements when one is missing', async () => {
    const { retype } = setup();
    await retype(/Chiều cao/, '');
    expect(screen.getByText(/Vui lòng nhập chiều cao và cân nặng/)).toBeInTheDocument();
  });

  test('shows the name initial and the goal chip', () => {
    setup();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('Mục tiêu')).toBeInTheDocument();
  });
});

describe('Profile: client-side checks (nothing is sent)', () => {
  test.each(['', ' ', ' a ', 'a'])('name %j is refused', async (name) => {
    const { retype, save } = setup();
    await retype('Họ và tên', name);
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Họ và tên');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test.each([['Tuổi', '0', 'Tuổi'], ['Tuổi', '121', 'Tuổi'], [/Chiều cao/, '29', 'Chiều cao'], [/Chiều cao/, '301', 'Chiều cao'], [/Cân nặng/, '9', 'Cân nặng'], [/Cân nặng/, '501', 'Cân nặng']])(
    '%s = %s is refused (%s)', async (label, value, text) => {
      const { retype, save } = setup();
      await retype(label, value);
      await save();
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(apiFetch).not.toHaveBeenCalled();
    });

  test('the limits themselves are accepted', async () => {
    const { retype, save } = setup();
    await retype('Tuổi', '120');
    await retype(/Chiều cao/, '300');
    await retype(/Cân nặng/, '500');
    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  });
});

describe('Profile: saving', () => {
  test('PUTs the cleaned name and numeric values', async () => {
    const { retype, save, user, field } = setup();
    await retype('Họ và tên', '  Dana   Pham  Nguyen ');
    await retype('Tuổi', '31');
    await user.selectOptions(field('Mục tiêu tập luyện'), 'Sức bền');
    await save();

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/users/profile');
    expect(options?.method).toBe('PUT');
    expect(JSON.parse(options!.body as string)).toEqual({
      name: 'Dana Pham Nguyen', age: 31, gender: 'Nữ', height: 165, weight: 58, goal: 'Sức bền', metricDate: todayStr(),
    });
  });

  test('a cleared optional measurement is left out of the request', async () => {
    const { retype, save } = setup();
    await retype('Tuổi', '');
    await save();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)).not.toHaveProperty('age');
  });

  test('success: refreshes the shared cache, updates the stored user and token, and confirms', async () => {
    const { save } = setup();
    await save();
    expect(await screen.findByText('Cập nhật hồ sơ thành công!')).toBeInTheDocument();
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 'u1', name: 'Dana Pham', email: 'dana@example.com', username: 'dana' });
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a reply without a token leaves the stored token alone', async () => {
    localStorage.setItem('token', 'kept');
    vi.mocked(apiFetch).mockResolvedValue(json({ ...PROFILE }));
    const { save } = setup();
    await save();
    await screen.findByText('Cập nhật hồ sơ thành công!');
    expect(localStorage.getItem('token')).toBe('kept');
  });

  test('a rejected save shows the server message and does not refresh', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Mục tiêu không hợp lệ' }, 400));
    const { save } = setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mục tiêu không hợp lệ');
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(screen.queryByText('Cập nhật hồ sơ thành công!')).not.toBeInTheDocument();
  });

  test('an unreadable error reply falls back to a generic message', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('<html/>', { status: 500 }));
    const { save } = setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cập nhật thất bại');
  });

  test('a network failure shows a connection error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const { save } = setup();
    await save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Đã xảy ra lỗi kết nối.');
  });

  test('the button is disabled while saving; a new attempt clears the old message', async () => {
    let done!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValueOnce(new Promise<Response>(r => { done = r; }));
    const { save, user } = setup();
    await save();
    const busy = await screen.findByRole('button', { name: /Đang lưu/ });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(apiFetch).toHaveBeenCalledTimes(1);

    done(json({ message: 'boom' }, 500));
    await screen.findByRole('alert');
    vi.mocked(apiFetch).mockResolvedValueOnce(json({ ...PROFILE }));
    await save();
    expect(await screen.findByText('Cập nhật hồ sơ thành công!')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
