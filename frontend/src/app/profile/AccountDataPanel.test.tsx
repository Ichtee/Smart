import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountDataPanel from './AccountDataPanel';
import { apiFetch } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn() }));
vi.mock('@/utils/api', async (orig) => ({ ...(await orig<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(clearApiCache).mockClear();
  localStorage.clear();
  localStorage.setItem('token', 'tok');
});

describe('AccountDataPanel: export', () => {
  test('downloads the export file', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{"profile":{}}'));
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AccountDataPanel />);
    await userEvent.click(screen.getByRole('button', { name: /Xuất dữ liệu/ }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/api/users/me/export');
    expect(create).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });

  test('a server error is shown and nothing is downloaded', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Server error' }, 500));
    const create = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create }));
    render(<AccountDataPanel />);
    await userEvent.click(screen.getByRole('button', { name: /Xuất dữ liệu/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
    expect(create).not.toHaveBeenCalled();
  });

  test('a 401 ends the session locally and goes to /login', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'no' }, 401));
    render(<AccountDataPanel />);
    await userEvent.click(screen.getByRole('button', { name: /Xuất dữ liệu/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('AccountDataPanel: delete account', () => {
  const open = async () => {
    render(<AccountDataPanel />);
    await userEvent.click(screen.getByRole('button', { name: /Xóa tài khoản/ }));
  };

  test('nothing is sent until the password form is confirmed', async () => {
    await open();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Xóa vĩnh viễn/ })).toBeDisabled();
  });

  test('cancel closes the form and forgets the typed password', async () => {
    await open();
    await userEvent.type(screen.getByLabelText(/Nhập mật khẩu/), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByLabelText(/Nhập mật khẩu/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Xóa tài khoản/ }));
    expect(screen.getByLabelText(/Nhập mật khẩu/)).toHaveValue('');
  });

  test('sends the password, then clears the local session and goes home', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'ok' }));
    await open();
    await userEvent.type(screen.getByLabelText(/Nhập mật khẩu/), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /Xóa vĩnh viễn/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/'));
    const [path, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe('/api/users/me');
    expect(init).toMatchObject({ method: 'DELETE' });
    expect(JSON.parse(String(init!.body))).toEqual({ password: 'secret123' });
    expect(localStorage.getItem('token')).toBeNull();
    expect(clearApiCache).toHaveBeenCalled();
  });

  test('a wrong password shows the message and keeps the user signed in', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Mật khẩu không đúng.' }, 400));
    await open();
    await userEvent.type(screen.getByLabelText(/Nhập mật khẩu/), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /Xóa vĩnh viễn/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu không đúng.');
    expect(nav.push).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('tok');
  });
});
