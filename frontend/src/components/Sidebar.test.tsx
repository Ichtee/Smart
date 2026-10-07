import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';
import { clearApiCache } from '@/hooks/useApi';

const nav = vi.hoisted(() => ({ push: vi.fn(), path: '/records' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => nav.path }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn() }));

beforeEach(() => {
  nav.push.mockClear();
  nav.path = '/records';
  localStorage.clear();
  document.documentElement.classList.remove('light');
});

describe('Sidebar', () => {
  test.each([
    ['Tổng quan', '/dashboard'],
    ['Tập luyện', '/workouts'],
    ['Lịch tập', '/routines'],
    ['Kỷ lục', '/records'],
    ['Khối lượng', '/volume'],
    ['Dinh dưỡng', '/nutrition'],
    ['Cơ thể', '/body'],
    ['Hồ sơ', '/profile'],
  ])('the desktop sidebar links to %s', (label, href) => {
    render(<Sidebar />);
    const desktop = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
    expect(desktop.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  test('the desktop sidebar groups the pages', () => {
    render(<Sidebar />);
    const desktop = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
    expect(desktop.getByText('Tập luyện', { selector: 'p' })).toBeInTheDocument();
    expect(desktop.getByText('Sức khỏe')).toBeInTheDocument();
  });

  test('the mobile bar has the 4 main pages and "Thêm"; the rest are behind it', async () => {
    render(<Sidebar />);
    const bar = within(screen.getByRole('navigation', { name: 'Điều hướng nhanh' }));
    expect(bar.getAllByRole('link').map(l => l.textContent)).toEqual(['Tổng quan', 'Tập luyện', 'Dinh dưỡng', 'Cơ thể']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(bar.getByRole('button', { name: /Thêm/ }));
    const menu = within(screen.getByRole('dialog', { name: 'Menu' }));
    expect(menu.getAllByRole('link').map(l => l.getAttribute('href'))).toEqual(['/routines', '/records', '/volume', '/profile']);
    expect(menu.getByRole('button', { name: /Đăng xuất/ })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('the current page is highlighted, others are not', () => {
    render(<Sidebar />);
    const desktop = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
    const records = desktop.getByRole('link', { name: 'Kỷ lục' });
    expect(records).toHaveAttribute('aria-current', 'page');
    expect(records.className).toContain('text-primary');
    expect(desktop.getByRole('link', { name: 'Lịch tập' })).not.toHaveAttribute('aria-current');
  });

  test('"Thêm" is highlighted when the current page is one of its pages', () => {
    render(<Sidebar />);
    const bar = within(screen.getByRole('navigation', { name: 'Điều hướng nhanh' }));
    expect(bar.getByRole('button', { name: /Thêm/ }).className).toContain('text-primary');
  });

  test('logging out clears the session and goes home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    localStorage.setItem('token', 'x');
    render(<Sidebar />);
    await userEvent.click(screen.getAllByRole('button', { name: /Đăng xuất/ })[0]);
    expect(localStorage.getItem('token')).toBeNull();
    expect(nav.push).toHaveBeenCalledWith('/');
    expect(clearApiCache).toHaveBeenCalled();
  });

  test('the theme button switches to light and back, and remembers the choice', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Chuyển sang giao diện sáng' })[0]);
    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem('theme')).toBe('light');
    await userEvent.click(screen.getAllByRole('button', { name: 'Chuyển sang giao diện tối' })[0]);
    expect(document.documentElement).not.toHaveClass('light');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
