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

  test('the profile button goes to /profile', async () => {
    render(<AppShell title="Cơ thể"><p>nội dung</p></AppShell>);
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Hồ sơ' }));
    expect(nav.push).toHaveBeenCalledWith('/profile');
  });

  test('renders the navigation: the desktop sidebar and the mobile bottom bar', () => {
    render(<AppShell title="Cơ thể"><p>nội dung</p></AppShell>);
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng nhanh' })).toBeInTheDocument();
  });
});
