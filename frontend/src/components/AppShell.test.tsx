import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppShell from './AppShell';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => '/dashboard' }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn(), useProfile: () => ({ profile: { name: 'An', email: 'an@example.com' } }) }));

beforeEach(() => nav.push.mockClear());

describe('AppShell', () => {
  test('the title is the one level-1 heading of the page', () => {
    render(<AppShell title="Kỷ lục cá nhân"><p>nội dung</p></AppShell>);
    expect(screen.getByRole('heading', { level: 1, name: 'Kỷ lục cá nhân' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('shows the subtitle, the icon and the actions next to the title', () => {
    render(
      <AppShell title="Tổng quan" subtitle="Xin chào, An!" icon={<svg data-testid="page-icon" />} actions={<button type="button">Admin Panel</button>}>
        <p>nội dung</p>
      </AppShell>,
    );
    const header = within(screen.getByRole('banner'));
    expect(header.getByText('Xin chào, An!')).toBeInTheDocument();
    expect(header.getByTestId('page-icon')).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Admin Panel' })).toBeInTheDocument();
  });

  test('the children live inside the single main landmark', () => {
    render(<AppShell title="Cơ thể"><p>nội dung trang</p></AppShell>);
    expect(within(screen.getByRole('main')).getByText('nội dung trang')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  const openMenu = async () => {
    render(<AppShell title="Cơ thể"><p>nội dung</p></AppShell>);
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Tài khoản' }));
  };

  test('the profile button opens a menu with profile, change password and sign out', async () => {
    await openMenu();
    expect(screen.getByRole('menuitem', { name: /Thông tin cá nhân/ })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('menuitem', { name: /Đổi mật khẩu/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Đăng xuất/ })).toBeInTheDocument();
  });

  test('sign out calls the server, then goes home', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Đăng xuất/ }));
    expect(fetchMock.mock.calls[0][0]).toContain('/api/users/logout');
    expect(nav.push).toHaveBeenCalledWith('/');
    vi.unstubAllGlobals();
  });

  test('change password sends the current and the new password', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Đổi mật khẩu/ }));
    await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'old-pass-1');
    await userEvent.type(screen.getByLabelText("Mật khẩu mới (8–100 ký tự)"), 'new-pass-22');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'new-pass-22');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/users/profile');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ password: 'new-pass-22', currentPassword: 'old-pass-1' });
    vi.unstubAllGlobals();
  });

  test('change password refuses when the two new passwords differ', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Đổi mật khẩu/ }));
    await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'old-pass-1');
    await userEvent.type(screen.getByLabelText("Mật khẩu mới (8–100 ký tự)"), 'new-pass-22');
    await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'other-pass-3');
    await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(screen.getByRole('alert')).toHaveTextContent('chưa khớp');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test('renders the navigation: the desktop sidebar and the mobile bottom bar', () => {
    render(<AppShell title="Cơ thể"><p>nội dung</p></AppShell>);
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng nhanh' })).toBeInTheDocument();
  });
});
