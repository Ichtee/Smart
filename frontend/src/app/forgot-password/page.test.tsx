import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPassword from './page';
import { API_URL } from '@/utils/api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => json({ message: 'If that email exists, a reset link has been sent.' }));
  vi.stubGlobal('fetch', fetchMock);
});

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<ForgotPassword />);
  const email = screen.getByLabelText('Địa chỉ Email') as HTMLInputElement;
  const submit = () => user.click(screen.getByRole('button', { name: /Gửi link đặt lại mật khẩu/ }));
  const form = () => email.closest('form')!;
  return { user, email, submit, form };
};

describe('Forgot password: the form', () => {
  test('explains what happens and links back to login', () => {
    setup();
    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });

  test('is an email field that browsers can autofill', () => {
    const { email } = setup();
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
  });
});

describe('Forgot password: client-side check', () => {
  test.each(['not-an-email', 'user@host', 'a b@example.com', '@example.com'])('%j is refused and nothing is sent', async (value) => {
    const { email, form } = setup();
    fireEvent.change(email, { target: { value } });
    fireEvent.submit(form()); // bypass the browser's own type=email check to reach ours
    expect(await screen.findByRole('alert')).toHaveTextContent(/đúng định dạng/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Forgot password: requesting the link', () => {
  test('sends the trimmed, lower-cased email', async () => {
    const { user, email, submit } = setup();
    await user.type(email, '  Dana@Example.COM ');
    await submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/forgot-password`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'dana@example.com' });
  });

  test('always shows the same neutral confirmation (it never says whether the account exists)', async () => {
    const { user, email, submit } = setup();
    await user.type(email, 'nobody@example.com');
    await submit();
    expect(await screen.findByText(/Nếu email/)).toBeInTheDocument();
    expect(screen.getByText(/tồn tại trong hệ thống/)).toBeInTheDocument();
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Nhập email của bạn...')).not.toBeInTheDocument(); // form replaced
    expect(screen.getByRole('link', { name: /Quay lại đăng nhập/ })).toHaveAttribute('href', '/login');
  });

  test('a server error is shown and the form stays so the user can retry', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Lỗi gửi email: provider down' }, 500));
    const { user, email, submit } = setup();
    await user.type(email, 'dana@example.com');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi gửi email: provider down');
    expect(email.value).toBe('dana@example.com');
    expect(screen.getByRole('button', { name: /Gửi link đặt lại mật khẩu/ })).toBeEnabled();
  });

  test('an unreachable server gives a friendly message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { user, email, submit } = setup();
    await user.type(email, 'dana@example.com');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ');
  });

  test('while sending, the button is disabled and says so (no duplicate emails)', async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { user, email, submit } = setup();
    await user.type(email, 'dana@example.com');
    await submit();

    const busy = await screen.findByRole('button', { name: 'Đang gửi...' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    finish(json({ message: 'ok' }));
    expect(await screen.findByText(/Nếu email/)).toBeInTheDocument();
  });

  test('an earlier error disappears when the next attempt works', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'boom' }, 500));
    const { user, email, submit } = setup();
    await user.type(email, 'dana@example.com');
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(json({ message: 'ok' }));
    await submit();
    expect(await screen.findByText(/Nếu email/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
