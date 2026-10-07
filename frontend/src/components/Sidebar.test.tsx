import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

const nav = vi.hoisted(() => ({ push: vi.fn(), path: '/records' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => nav.path }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn() }));

beforeEach(() => {
  nav.push.mockClear();
  nav.path = '/records';
});

describe('Sidebar', () => {
  test.each([
    ['Routines', '/routines'],
    ['Records', '/records'],
    ['Activity', '/workouts'],
    ['Profile', '/profile'],
  ])('links to %s in both the desktop and the mobile nav', (label, href) => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link', { name: label });
    expect(links).toHaveLength(2);
    links.forEach(l => expect(l).toHaveAttribute('href', href));
  });

  test('the current page is highlighted, others are not', () => {
    render(<Sidebar />);
    const [desktopRecords] = screen.getAllByRole('link', { name: 'Records' });
    const [desktopRoutines] = screen.getAllByRole('link', { name: 'Routines' });
    expect(desktopRecords.className).toContain('text-primary');
    expect(desktopRoutines.className).not.toContain('bg-primary/15');
  });

  test('logging out clears the session and goes home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    localStorage.setItem('token', 'x');
    render(<Sidebar />);
    await userEvent.click(screen.getAllByRole('button', { name: /Đăng xuất/ })[0]);
    expect(localStorage.getItem('token')).toBeNull();
    expect(nav.push).toHaveBeenCalledWith('/');
  });
});
