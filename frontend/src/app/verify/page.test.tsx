import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyEmail from './page';
import { API_URL } from '@/utils/api';

// The page reads ?token= from the URL
let tokenParam: string | null = 'tok123';
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'token' ? tokenParam : null) }),
}));

let fetchMock: ReturnType<typeof vi.fn>;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const VALID_LINK = { valid: true, name: 'Nguyễn Văn A', email: 'vana@example.com' };

beforeEach(() => {
  tokenParam = 'tok123';
  fetchMock = vi.fn(async () => json(VALID_LINK));
  vi.stubGlobal('fetch', fetchMock);
});

/** Render and wait until the "set your password" form is showing. */
const openForm = async () => {
  const user = userEvent.setup({ delay: null });
  render(<VerifyEmail />);
  await screen.findByText('Đặt mật khẩu');
  const password = document.getElementById('new-password') as HTMLInputElement;
  const confirm = document.getElementById('confirm-password') as HTMLInputElement;
  const submit = () => user.click(screen.getByRole('button', { name: /Đặt mật khẩu & kích hoạt|Đang kích hoạt/ }));
  const fill = async (p: string, c = p) => {
    await user.clear(password); await user.clear(confirm);
    if (p) await user.type(password, p);
    if (c) await user.type(confirm, c);
  };
  const postCalls = () => fetchMock.mock.calls.filter(c => c[1]?.method === 'POST');
  return { user, password, confirm, submit, fill, postCalls };
};

describe('Verify page: checking the link', () => {
  test('shows a "checking" state while the link is being validated', async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never settles
    render(<VerifyEmail />);
    expect(await screen.findByText('Đang kiểm tra liên kết...')).toBeInTheDocument();
  });

  test('validates the token with ONE GET and does not activate anything yet', async () => {
    await openForm();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/verify/tok123`);
    expect(options).toBeUndefined(); // plain GET
  });

  test('a token with special characters is URL-encoded', async () => {
    tokenParam = 'a/b?c=d e';
    await openForm();
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/api/users/verify/${encodeURIComponent('a/b?c=d e')}`);
  });

  test('a valid link greets the person and shows which email the account is for', async () => {
    await openForm();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('vana@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByLabelText('Nhập lại mật khẩu')).toBeInTheDocument();
  });

  test('both fields are real password inputs that browsers recognise as "new password"', async () => {
    const { password, confirm } = await openForm();
    for (const input of [password, confirm]) {
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveAttribute('autocomplete', 'new-password');
    }
  });

  test('no token in the URL -> error screen, no request at all', async () => {
    tokenParam = null;
    render(<VerifyEmail />);
    expect(await screen.findByText('Xác thực thất bại')).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy mã xác thực/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Quay lại trang đăng nhập' })).toHaveAttribute('href', '/login');
  });

  test('an expired / used link shows the server\'s reason', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại.', linkInvalid: true }, 400));
    render(<VerifyEmail />);
    expect(await screen.findByText('Xác thực thất bại')).toBeInTheDocument();
    expect(screen.getByText('Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại.')).toBeInTheDocument();
    expect(screen.queryByText('Đặt mật khẩu')).not.toBeInTheDocument();
  });

  test('a failure without a message gets a generic one', async () => {
    fetchMock.mockResolvedValue(json({}, 400));
    render(<VerifyEmail />);
    expect(await screen.findByText(/không hợp lệ hoặc đã hết hạn/)).toBeInTheDocument();
  });

  test('a network error is reported', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<VerifyEmail />);
    expect(await screen.findByText(/Lỗi kết nối mạng/)).toBeInTheDocument();
  });
});

describe('Verify page: choosing the password (client-side checks, nothing is sent)', () => {
  test.each([
    ['empty', '', '', /Vui lòng nhập mật khẩu/],
    ['too short', 'short', 'short', /8 đến 100/],
    ['7 characters', '1234567', '1234567', /8 đến 100/],
    ['too long', 'p'.repeat(101), 'p'.repeat(101), /8 đến 100/],
    ['with a leading space', ' password123', ' password123', /khoảng trắng/],
    ['with a trailing space', 'password123 ', 'password123 ', /khoảng trắng/],
    ['not confirmed the same', 'password123', 'password124', /không khớp/],
    ['confirmation in a different case', 'password123', 'Password123', /không khớp/],
  ])('rejects a password that is %s', async (_label, password, confirm, message) => {
    const { fill, submit, postCalls } = await openForm();
    await fill(password, confirm);
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(postCalls()).toHaveLength(0);
    expect(screen.getByText('Đặt mật khẩu')).toBeInTheDocument(); // still on the form
  });

  test('exactly 8 and exactly 100 characters are accepted', async () => {
    for (const pw of ['12345678', 'p'.repeat(100)]) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockResolvedValueOnce(json({ message: 'ok' }));
      const { fill, submit, postCalls } = await openForm();
      await fill(pw);
      await submit();
      await waitFor(() => expect(postCalls()).toHaveLength(1));
      document.body.innerHTML = '';
    }
  });
});

describe('Verify page: activating the account', () => {
  test('POSTs only the password to the same URL and shows success with a link to log in', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockResolvedValueOnce(json({ message: 'Đã đặt mật khẩu và kích hoạt tài khoản!' }));
    const { fill, submit, postCalls } = await openForm();
    await fill('my-own-password1');
    await submit();

    expect(await screen.findByText('Thành công!')).toBeInTheDocument();
    expect(screen.getByText('Đã đặt mật khẩu và kích hoạt tài khoản!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tiếp tục đăng nhập' })).toHaveAttribute('href', '/login');

    expect(postCalls()).toHaveLength(1);
    const [url, options] = postCalls()[0];
    expect(url).toBe(`${API_URL}/api/users/verify/tok123`);
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({ password: 'my-own-password1' }); // not the confirmation, nothing else
  });

  test('the password is never put in the URL', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockResolvedValueOnce(json({ message: 'ok' }));
    const { fill, submit } = await openForm();
    await fill('secret-password1');
    await submit();
    await screen.findByText('Thành công!');
    for (const [url] of fetchMock.mock.calls) expect(String(url)).not.toContain('secret-password1');
  });

  test('the button is disabled while saving, so a double click cannot send twice', async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockReturnValueOnce(new Promise<Response>(r => { finish = r; }));
    const { fill, submit, postCalls, user } = await openForm();
    await fill('password123');
    await submit();

    const busy = await screen.findByRole('button', { name: 'Đang kích hoạt...' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(postCalls()).toHaveLength(1);

    finish(json({ message: 'ok' }));
    expect(await screen.findByText('Thành công!')).toBeInTheDocument();
  });

  test('a password the server rejects stays on the form with the reason, and can be corrected', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK))
      .mockResolvedValueOnce(json({ message: 'Mật khẩu phải từ 8 đến 100 ký tự.' }, 400))
      .mockResolvedValueOnce(json({ message: 'ok' }));
    const { fill, submit, password, postCalls } = await openForm();
    await fill('password123');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu phải từ 8 đến 100 ký tự.');
    expect(screen.getByText('Đặt mật khẩu')).toBeInTheDocument();
    expect(password.value).toBe('password123'); // what they typed is kept
    expect(screen.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ })).toBeEnabled();

    await submit(); // try again
    expect(await screen.findByText('Thành công!')).toBeInTheDocument();
    expect(postCalls()).toHaveLength(2);
  });

  test('if the LINK dies while the form is open (expired / already used) the page says so instead of a password error', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK))
      .mockResolvedValueOnce(json({ message: 'Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại.', linkInvalid: true }, 400));
    const { fill, submit } = await openForm();
    await fill('password123');
    await submit();

    expect(await screen.findByText('Xác thực thất bại')).toBeInTheDocument();
    expect(screen.getByText('Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
  });

  test('a network error while saving is shown inline and the form stays usable', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { fill, submit } = await openForm();
    await fill('password123');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Lỗi kết nối mạng/);
    expect(screen.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ })).toBeEnabled();
  });

  test('a server error without a message gets a generic inline message', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockResolvedValueOnce(json({}, 500));
    const { fill, submit } = await openForm();
    await fill('password123');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể đặt mật khẩu');
  });

  test('a validation error disappears once a valid submit goes through', async () => {
    fetchMock.mockResolvedValueOnce(json(VALID_LINK)).mockResolvedValueOnce(json({ message: 'ok' }));
    const { fill, submit } = await openForm();
    await fill('short');
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await fill('a-good-password1');
    await submit();
    expect(await screen.findByText('Thành công!')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
