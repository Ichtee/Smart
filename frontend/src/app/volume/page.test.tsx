import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import VolumePage from './page';
import { fetcher } from '@/hooks/useApi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/volume' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({
  fetcher: vi.fn(),
  useProfile: () => ({ profile: undefined }),
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));

const mondays = (n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 5 + i * 7)); // 2026-01-05 is a Monday
  return d.toISOString().slice(0, 10);
});

const DATA = (weekCount = 3, muscles = [
  { muscle: 'chest', total: 0, weekly: [] as number[] },
]) => ({ from: '2026-01-05', to: '2026-02-01', weeks: mondays(weekCount), muscles });

const renderPage = () => render(<SWRConfig value={{ provider: () => new Map() }}><VolumePage /></SWRConfig>);

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(fetcher).mockReset();
  localStorage.clear();
});

describe('Volume page', () => {
  test('asks for the volume endpoint', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, []));
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Tập luyện' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khối lượng' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(vi.mocked(fetcher).mock.calls[0]?.[0]).toBe('/api/workouts/volume'));
  });

  test('a card per muscle, busiest first, with Vietnamese names, totals, this week and the average', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, [
      { muscle: 'quads', total: 3, weekly: [0, 0, 3] },
      { muscle: 'chest', total: 9, weekly: [3, 4, 2] },
    ]));
    renderPage();
    const cards = await screen.findAllByTestId('volume-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('9 hiệp')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/Trung bình 3\.0 hiệp\/tuần/)).toBeInTheDocument();
    expect(within(cards[0]).getByText('2')).toBeInTheDocument(); // sets this week
    expect(within(cards[1]).getByText('3 hiệp')).toBeInTheDocument();
    expect(within(cards[1]).getByText(/Trung bình 1\.0 hiệp\/tuần/)).toBeInTheDocument();
  });

  test('one bar per week, with a tooltip of the sets', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, [{ muscle: 'chest', total: 5, weekly: [3, 0, 2] }]));
    renderPage();
    const chart = await screen.findByRole('img', { name: /Số hiệp .* theo tuần/ });
    expect(chart.querySelectorAll('rect')).toHaveLength(3);
    expect(chart.querySelectorAll('title')[0].textContent).toBe('Tuần 05/01: 3 hiệp');
    expect(chart.querySelectorAll('title')[1].textContent).toBe('Tuần 12/01: 0 hiệp');
  });

  test('only the most recent 12 weeks are shown, and muscles quiet in them are dropped', async () => {
    const weeklyOld = Array(15).fill(0); weeklyOld[0] = 5; // trained only 15 weeks ago
    const weeklyNew = Array(15).fill(0); weeklyNew[14] = 4;
    vi.mocked(fetcher).mockResolvedValue(DATA(15, [
      { muscle: 'back', total: 5, weekly: weeklyOld },
      { muscle: 'chest', total: 4, weekly: weeklyNew },
    ]));
    renderPage();
    const cards = await screen.findAllByTestId('volume-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('4 hiệp')).toBeInTheDocument();
    expect(cards[0].querySelectorAll('rect')).toHaveLength(12);
  });

  test('shows an empty state with a link to the workouts page', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, []));
    renderPage();
    expect(await screen.findByText(/Chưa có hiệp nào/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đến trang tập luyện/ })).toHaveAttribute('href', '/workouts');
  });

  test('a server error offers a retry', async () => {
    vi.mocked(fetcher).mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));
    vi.mocked(fetcher).mockResolvedValue(DATA(3, [{ muscle: 'chest', total: 1, weekly: [0, 0, 1] }]));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được khối lượng tập');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findAllByTestId('volume-card')).toHaveLength(1);
  });

  test('a 401 clears the token and goes to /login', async () => {
    localStorage.setItem('token', 'tok');
    vi.mocked(fetcher).mockRejectedValue(Object.assign(new Error('no'), { status: 401 }));
    renderPage();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });
});
