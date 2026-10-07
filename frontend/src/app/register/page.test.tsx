import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from './page';
import { API_URL } from '@/utils/api';

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  fetchMock = vi.fn(async () => json({ message: 'ok', email: 'x@example.com' }, 201));
  vi.stubGlobal('fetch', fetchMock);
});

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<Register />);
  const name = screen.getByPlaceholderText('Nhập họ và tên...') as HTMLInputElement;
  const username = screen.getByPlaceholderText('Chọn username...') as HTMLInputElement;
  const email = screen.getByPlaceholderText('name@example.com...') as HTMLInputElement;
  const form = () => name.closest('form')!;
  const fill = async (v: { name?: string; username?: string; email?: string }) => {
    if (v.name !== undefined) await user.type(name, v.name);
    if (v.username !== undefined) await user.type(username, v.username);
    if (v.email !== undefined) await user.type(email, v.email);
  };
  const valid = { name: 'Nguyễn Văn A', username: 'vana', email: 'vana@example.com' };
  const submit = () => user.click(screen.getByRole('button', { name: /Đăng ký/ }));
  return { user, name, username, email, form, fill, valid, submit };
};

describe('Register page: the form', () => {
  test('asks for name, username and email only. There is no password field', () => {
    setup();
    expect(screen.getByPlaceholderText('Nhập họ và tên...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Chọn username...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com...')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByText('Mật khẩu')).not.toBeInTheDocument();
  });

  test('tells the user the password is chosen after confirming the email', () => {
    setup();
    expect(screen.getByText(/đặt mật khẩu sau khi xác nhận email/i)).toBeInTheDocument();
  });

  test('links to the login page', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });
});

describe('Register page: client-side validation (nothing is sent when it fails)', () => {
  test.each([
    ['a one-character name', { name: 'A', username: 'vana', email: 'a@b.co' }, /2 đến 50/],
    ['a username with a space', { name: 'Văn A', username: 'van a', email: 'a@b.co' }, /không được chứa khoảng trắng/],
    ['a too-short username', { name: 'Văn A', username: 'ab', email: 'a@b.co' }, /3 đến 30/],
    ['a username with symbols', { name: 'Văn A', username: 'van@a', email: 'a@b.co' }, /chữ cái, chữ số/],
    ['an email without a domain', { name: 'Văn A', username: 'vana', email: 'user@host' }, /đúng định dạng/],
  ])('%s', async (_label, values, message) => {
    const { fill, form } = setup();
    await fill(values);
    fireEvent.submit(form()); // bypass the browser's own validation to reach ours
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('when several fields are wrong, the first one in the form is reported', async () => {
    const { fill, form } = setup();
    await fill({ name: 'A', username: 'x', email: 'nope' });
    fireEvent.submit(form());
    expect(await screen.findByText(/Họ và tên/)).toBeInTheDocument();
    expect(screen.queryByText(/độ dài từ 3 đến 30/)).not.toBeInTheDocument(); // the username error is not shown
  });

  test('a previous error is cleared on the next attempt', async () => {
    const { fill, form, user, username } = setup();
    await fill({ name: 'Văn A', username: 'x', email: 'vana@example.com' });
    fireEvent.submit(form());
    expect(await screen.findByText(/3 đến 30/)).toBeInTheDocument();

    await user.clear(username);
    await user.type(username, 'vana');
    fireEvent.submit(form());
    await waitFor(() => expect(screen.queryByText(/3 đến 30/)).not.toBeInTheDocument());
  });
});

describe('Register page: submitting', () => {
  test('sends only name, username and email (normalized), never a password', async () => {
    const { fill, submit } = setup();
    await fill({ name: '  Nguyễn   Văn  A ', username: '  vana ', email: ' VanA@Example.COM ' });
    await submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/register`);
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    const body = JSON.parse(options.body);
    expect(body).toEqual({ name: 'Nguyễn Văn A', username: 'vana', email: 'vana@example.com' });
    expect(body).not.toHaveProperty('password');
  });

  test('on success explains the email step: open the link to set a password within 10 minutes', async () => {
    const { fill, submit, valid } = setup();
    await fill(valid);
    await submit();

    expect(await screen.findByText('Xác minh Email')).toBeInTheDocument();
    expect(screen.getByText(valid.email)).toBeInTheDocument();
    expect(screen.getByText(/đặt mật khẩu/i, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/10 phút/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toHaveAttribute('href', '/login');
    expect(screen.queryByPlaceholderText('Nhập họ và tên...')).not.toBeInTheDocument(); // form is gone
  });

  test('a pending-verification conflict (409) shows the server\'s guidance and keeps the form filled', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Tên đăng nhập hoặc Email này đang chờ xác thực. Hãy đăng nhập để gửi lại email.', pendingVerification: true }, 409));
    const { fill, submit, valid, name, username, email } = setup();
    await fill(valid);
    await submit();

    expect(await screen.findByText(/đang chờ xác thực/)).toBeInTheDocument();
    expect(name.value).toBe(valid.name);
    expect(username.value).toBe(valid.username);
    expect(email.value).toBe(valid.email);
    expect(screen.queryByText('Xác minh Email')).not.toBeInTheDocument();
  });

  test('a validation error from the server (400) is shown as is', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Tên đăng nhập hoặc Email đã tồn tại trên hệ thống.' }, 400));
    const { fill, submit, valid } = setup();
    await fill(valid);
    await submit();
    expect(await screen.findByText('Tên đăng nhập hoặc Email đã tồn tại trên hệ thống.')).toBeInTheDocument();
  });

  test('a response without a message falls back to a generic one', async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { fill, submit, valid } = setup();
    await fill(valid);
    await submit();
    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
  });

  test('an unreachable server gives a friendly message, not "Failed to fetch"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { fill, submit, valid } = setup();
    await fill(valid);
    await submit();
    expect(await screen.findByText(/Không thể kết nối tới máy chủ/)).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  test('while the request is running the button is disabled (no double sign-up), then usable again after an error', async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { fill, submit, valid, user } = setup();
    await fill(valid);
    await submit();

    const busy = await screen.findByRole('button', { name: /Đang tạo tài khoản/ });
    expect(busy).toBeDisabled();
    await user.click(busy); // ignored
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(json({ message: 'nope' }, 409));
    expect(await screen.findByRole('button', { name: /Đăng ký/ })).toBeEnabled();
  });
});
