import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './page';
import { API_URL } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const SESSION = { _id: 'u1', name: 'Dana Pham', username: 'dana', email: 'dana@example.com', role: 'user', height: 175, weight: 70, age: 30, token: 'jwt-123' };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(clearApiCache).mockClear();
  fetchMock = vi.fn(async () => json(SESSION));
  vi.stubGlobal('fetch', fetchMock);
});

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<Login />);
  const identifier = screen.getByLabelText('Tên đăng nhập / Email') as HTMLInputElement;
  const password = screen.getByLabelText('Mật khẩu') as HTMLInputElement;
  const submit = () => user.click(screen.getByRole('button', { name: /Đăng nhập/ }));
  const signIn = async (id = 'dana', pw = 'secret-pass-1') => {
    await user.type(identifier, id);
    await user.type(password, pw);
    await submit();
  };
  return { user, identifier, password, submit, signIn };
};

describe('Login: the form', () => {
  test('has the two fields, links to register and to the forgotten-password page', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute('href', '/register');
  });

  test('the password is masked and browsers know which field is which (password managers)', () => {
    const { identifier, password } = setup();
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(identifier).toHaveAttribute('autocomplete', 'username');
  });

  test('someone who already has a session is sent straight to the dashboard', () => {
    localStorage.setItem('token', 'existing');
    render(<Login />);
    expect(nav.push).toHaveBeenCalledWith('/dashboard');
  });

  test('without a session it stays on the form', () => {
    setup();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe('Login: client-side checks (nothing is sent)', () => {
  test('a blank / spaces-only identifier is refused', async () => {
    const { user, identifier, password, submit } = setup();
    await user.type(identifier, '    ');
    await user.type(password, 'x');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập Tên đăng nhập hoặc Email.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('a missing password is refused', async () => {
    const { user, identifier, submit } = setup();
    await user.type(identifier, 'dana');
    // the field is `required`, so bypass the browser check by submitting the form directly
    identifier.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập Mật khẩu.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Login: signing in', () => {
  test('POSTs the trimmed identifier and the password exactly as typed, with cookies', async () => {
    const { signIn } = setup();
    await signIn('  dana  ', '  secret with spaces ');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/login`);
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body)).toEqual({ username: 'dana', password: '  secret with spaces ' }); // passwords are never trimmed
  });

  test('stores the session, drops the previous account\'s cached data FIRST, then goes to the dashboard', async () => {
    const order: string[] = [];
    vi.mocked(clearApiCache).mockImplementation(() => { order.push('clear-cache'); });
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { order.push(`set:${k}`); return realSet.call(this, k, v); });

    const { signIn } = setup();
    await signIn();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard'));

    expect(localStorage.getItem('token')).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 'u1', name: 'Dana Pham', email: 'dana@example.com', username: 'dana' });
    expect(order).toContain('clear-cache');
    expect(order.indexOf('clear-cache')).toBeLessThan(order.indexOf('set:token'));
  });

  test.each([
    ['an admin', { ...SESSION, role: 'admin' }, '/dashboard/admin'],
    ['a new user without measurements', { ...SESSION, height: null, weight: null, age: null }, '/onboarding'],
    ['a user missing only the age', { ...SESSION, age: null }, '/onboarding'],
    ['a user missing only the weight', { ...SESSION, weight: 0 }, '/onboarding'],
    ['a user with a complete profile', SESSION, '/dashboard'],
  ])('%s is sent to %s', async (_label, session, destination) => {
    fetchMock.mockResolvedValue(json(session));
    const { signIn } = setup();
    await signIn();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith(destination));
    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  test('an admin goes to the admin area even without a complete profile', async () => {
    fetchMock.mockResolvedValue(json({ ...SESSION, role: 'admin', height: null }));
    const { signIn } = setup();
    await signIn();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard/admin'));
  });

  test('wrong credentials: shows the server message, stores nothing, does not navigate', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Invalid credentials' }, 401));
    const { signIn } = setup();
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(localStorage.getItem('token')).toBeNull();
    expect(clearApiCache).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/chưa được kích hoạt/)).not.toBeInTheDocument();
  });

  test('a reply without a message falls back to a generic one', async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { signIn } = setup();
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('Login failed');
  });

  test('an unreachable server gives a friendly message, not "Failed to fetch"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { signIn } = setup();
    await signIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ');
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  test('while the request runs the button is disabled (no double submit); afterwards it works again', async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { user, signIn } = setup();
    await signIn();

    const busy = await screen.findByRole('button', { name: 'Đang đăng nhập...' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    fireEvent.submit(busy.closest('form')!); // Enter key / programmatic submit bypasses the disabled button
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(json({ message: 'Invalid credentials' }, 401));
    expect(await screen.findByRole('button', { name: /Đăng nhập$/ })).toBeEnabled();
  });

  test('a new attempt clears the previous error', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Invalid credentials' }, 401));
    const { user, submit } = setup();
    await user.type(screen.getByLabelText('Tên đăng nhập / Email'), 'dana');
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrong');
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(json(SESSION));
    await submit();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

describe('Login: an account that is not activated yet', () => {
  const unverified = () => json({ message: 'Email chưa được xác thực.', notVerified: true, email: 'dana@example.com' }, 403);

  test('explains it and offers to resend the email', async () => {
    fetchMock.mockResolvedValue(unverified());
    const { signIn } = setup();
    await signIn();
    expect(await screen.findByText(/chưa được kích hoạt qua email/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại email xác thực' })).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('resending posts the email the server reported (not what was typed) and confirms', async () => {
    fetchMock.mockResolvedValueOnce(unverified()).mockResolvedValueOnce(json({ message: 'Email xác thực đã được gửi lại!' }));
    const { user, signIn } = setup();
    await signIn('DANA-username', 'pw-1');
    await user.click(await screen.findByRole('button', { name: 'Gửi lại email xác thực' }));

    expect(await screen.findByText('Email xác thực đã được gửi lại!')).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe(`${API_URL}/api/users/resend-verification`);
    expect(JSON.parse(options.body)).toEqual({ email: 'dana@example.com' });
    expect(screen.queryByRole('button', { name: 'Gửi lại email xác thực' })).not.toBeInTheDocument(); // done
  });

  test('if the server gave no email the typed identifier is used', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'x', notVerified: true }, 403)).mockResolvedValueOnce(json({ message: 'ok' }));
    const { user, signIn } = setup();
    await signIn('dana', 'pw-1');
    await user.click(await screen.findByRole('button', { name: 'Gửi lại email xác thực' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email: 'dana' });
  });

  test('a failed resend shows why and leaves the button available', async () => {
    fetchMock.mockResolvedValueOnce(unverified()).mockResolvedValueOnce(json({ message: 'Không tìm thấy tài khoản chưa xác thực.' }, 404));
    const { user, signIn } = setup();
    await signIn();
    await user.click(await screen.findByRole('button', { name: 'Gửi lại email xác thực' }));
    expect(await screen.findByText('Không tìm thấy tài khoản chưa xác thực.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại email xác thực' })).toBeEnabled();
  });

  test('a network error while resending is friendly', async () => {
    fetchMock.mockResolvedValueOnce(unverified()).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { user, signIn } = setup();
    await signIn();
    await user.click(await screen.findByRole('button', { name: 'Gửi lại email xác thực' }));
    expect(await screen.findByText(/Không thể kết nối tới máy chủ/)).toBeInTheDocument();
  });

  test('the notice disappears on the next login attempt', async () => {
    fetchMock.mockResolvedValueOnce(unverified());
    const { submit, signIn } = setup();
    await signIn();
    await screen.findByText(/chưa được kích hoạt qua email/);

    fetchMock.mockResolvedValueOnce(json({ message: 'Invalid credentials' }, 401));
    await submit();
    await waitFor(() => expect(screen.queryByText(/chưa được kích hoạt qua email/)).not.toBeInTheDocument());
  });
});
