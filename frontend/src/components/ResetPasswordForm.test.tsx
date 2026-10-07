import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordForm from './ResetPasswordForm';
import { API_URL } from '@/utils/api';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  nav.push.mockClear();
  fetchMock = vi.fn(async () => json({ message: 'Đặt lại mật khẩu thành công!' }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.useRealTimers());

const setup = (token?: string) => {
  const user = userEvent.setup({ delay: null, advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  const view = render(<ResetPasswordForm token={token} />);
  const field = (re: RegExp) => screen.getByLabelText(re) as HTMLInputElement;
  const submit = () => user.click(screen.getByRole('button', { name: /Đặt lại mật khẩu|Đang lưu/ }));
  const fill = async (pw: string, confirm = pw) => {
    await user.type(field(/^Mật khẩu mới/), pw);
    await user.type(field(/^Xác nhận mật khẩu/), confirm);
  };
  return { user, view, field, submit, fill };
};

describe('ResetPasswordForm: token source', () => {
  test('with a token in the link there is no token box', () => {
    setup('abc123');
    expect(screen.queryByLabelText(/Token/)).not.toBeInTheDocument();
  });

  test('without one the user can paste it', () => {
    setup();
    expect(screen.getByLabelText(/Token/)).toBeInTheDocument();
  });

  test('no token anywhere: refused with a clear message, nothing sent', async () => {
    const { fill, submit } = setup();
    await fill('longenough1');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã đặt lại mật khẩu (Token) bị thiếu');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('a token that is only spaces counts as missing', async () => {
    const { user, fill, submit } = setup();
    await user.type(screen.getByLabelText(/Token/), '   ');
    await fill('longenough1');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordForm: client-side password checks', () => {
  test('a short password is refused and nothing is sent', async () => {
    const { fill, submit } = setup('tok');
    await fill('short');
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('mismatching passwords: live hint while typing, refused on submit', async () => {
    const { field, fill, submit } = setup('tok');
    await fill('longenough1', 'longenough2');
    expect(screen.getByText('Mật khẩu không khớp')).toBeInTheDocument();
    expect(field(/^Xác nhận/)).toHaveAttribute('aria-invalid', 'true');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu nhập lại không khớp.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('no mismatch hint while the confirmation is still empty or when they match', async () => {
    const { user, field } = setup('tok');
    await user.type(field(/^Mật khẩu mới/), 'longenough1');
    expect(screen.queryByText('Mật khẩu không khớp')).not.toBeInTheDocument();
    await user.type(field(/^Xác nhận/), 'longenough1');
    expect(screen.queryByText('Mật khẩu không khớp')).not.toBeInTheDocument();
    expect(field(/^Xác nhận/)).toHaveAttribute('aria-invalid', 'false');
  });

  test('both fields are masked and flagged new-password for password managers', () => {
    const { field } = setup('tok');
    for (const re of [/^Mật khẩu mới/, /^Xác nhận/]) {
      expect(field(re)).toHaveAttribute('type', 'password');
      expect(field(re)).toHaveAttribute('autocomplete', 'new-password');
    }
  });
});

describe('ResetPasswordForm: resetting', () => {
  test('POSTs the password (inner spaces kept) to the URL-encoded token endpoint', async () => {
    const { fill, submit } = setup('a/b c');
    await fill('spaced pass1');
    await submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/reset-password/a%2Fb%20c`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ password: 'spaced pass1' });
  });

  test('a pasted token is trimmed', async () => {
    const { user, fill, submit } = setup();
    await user.type(screen.getByLabelText(/Token/), '  pasted-token  ');
    await fill('longenough1');
    await submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/api/users/reset-password/pasted-token`);
  });

  test('success: confirmation, login link, and a redirect to /login after 2.5 s (not before)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();

    expect(await screen.findByText('Đặt lại mật khẩu thành công!')).toBeInTheDocument();
    expect(screen.getByText(/Đang chuyển hướng/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập ngay' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText(/^Mật khẩu mới/)).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2300); });
    expect(nav.push).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(nav.push).toHaveBeenCalledWith('/login');
    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  test('leaving the page before the redirect cancels it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { view, fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();
    await screen.findByText(/Đang chuyển hướng/);
    view.unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(nav.push).not.toHaveBeenCalled();
  });

  test('an invalid or expired link shows the server message and the form stays usable', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Token không hợp lệ hoặc đã hết hạn.' }, 400));
    const { fill, submit } = setup('old');
    await fill('longenough1');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Token không hợp lệ hoặc đã hết hạn.');
    expect(screen.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeEnabled();
    expect(nav.push).not.toHaveBeenCalled();
  });

  test('a reply without a message falls back to a generic one', async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi khi đặt lại mật khẩu');
  });

  test('an unreachable server gives a friendly message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ');
  });

  test('while saving the button is disabled (the link is single-use, so no double submit)', async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { finish = r; }));
    const { user, fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();

    const busy = await screen.findByRole('button', { name: 'Đang lưu...' });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(json({ message: 'ok' }));
    await screen.findByText(/Đang chuyển hướng/);
  });

  test('an earlier error is cleared by the next attempt', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'nope' }, 400));
    const { fill, submit } = setup('tok');
    await fill('longenough1');
    await submit();
    await screen.findByRole('alert');
    await submit();
    await screen.findByText(/Đang chuyển hướng/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
