import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import RecordsPage from './page';
import { fetcher } from '@/hooks/useApi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/records' }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/hooks/useApi', () => ({
  fetcher: vi.fn(),
  useProfile: () => ({ profile: undefined }),
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));

const BENCH = {
  name: 'Bench Press',
  best: { weight: 65, date: '2026-05-08' },
  last: { weight: 62.5, date: '2026-05-15' },
  sessions: [
    { date: '2026-05-01', maxWeight: 60, pr: true },
    { date: '2026-05-08', maxWeight: 65, pr: true },
    { date: '2026-05-15', maxWeight: 62.5, pr: false },
  ],
};
const SQUAT = { name: 'Squat', best: { weight: 100, date: '2026-05-02' }, last: { weight: 100, date: '2026-05-02' }, sessions: [{ date: '2026-05-02', maxWeight: 100, pr: true }] };

const renderPage = () => render(<SWRConfig value={{ provider: () => new Map() }}><RecordsPage /></SWRConfig>);

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(fetcher).mockReset();
  localStorage.clear();
});

describe('Records page', () => {
  test('asks for the records endpoint', async () => {
    vi.mocked(fetcher).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Tập luyện' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kỷ lục' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(vi.mocked(fetcher).mock.calls[0]?.[0]).toBe('/api/workouts/records'));
  });

  test('a card per exercise: record, latest, number of sessions', async () => {
    vi.mocked(fetcher).mockResolvedValue([BENCH, SQUAT]);
    renderPage();
    const bench = await screen.findByRole('region', { name: 'Bench Press' });
    expect(within(bench).getByText('65 kg')).toBeInTheDocument();
    expect(within(bench).getByText('2026-05-08')).toBeInTheDocument();
    expect(within(bench).getByText('62.5 kg')).toBeInTheDocument();
    expect(within(bench).getByText('3 buổi')).toBeInTheDocument();
    const squat = screen.getByRole('region', { name: 'Squat' });
    expect(within(squat).getAllByText('100 kg')).toHaveLength(2);
    expect(within(squat).getByText('1 buổi')).toBeInTheDocument();
  });

  test('the sparkline has one point per session and marks the record days', async () => {
    vi.mocked(fetcher).mockResolvedValue([BENCH]);
    renderPage();
    const chart = await screen.findByRole('img', { name: 'Mức tạ Bench Press theo thời gian' });
    const dots = chart.querySelectorAll('circle');
    expect(dots).toHaveLength(3);
    expect([...dots].map(d => d.querySelector('title')!.textContent)).toEqual([
      '2026-05-01: 60 kg (kỷ lục)',
      '2026-05-08: 65 kg (kỷ lục)',
      '2026-05-15: 62.5 kg',
    ]);
    expect(chart.querySelector('path')).not.toBeNull();
  });

  test('a single session draws a point and no line', async () => {
    vi.mocked(fetcher).mockResolvedValue([SQUAT]);
    renderPage();
    const chart = await screen.findByRole('img', { name: 'Mức tạ Squat theo thời gian' });
    expect(chart.querySelectorAll('circle')).toHaveLength(1);
    expect(chart.querySelector('path')).toBeNull();
  });

  test('no records yet: an invitation with a link to the workouts', async () => {
    vi.mocked(fetcher).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/Chưa có kỷ lục nào/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đến trang tập luyện' })).toHaveAttribute('href', '/workouts');
    expect(screen.queryByTestId('record-card')).not.toBeInTheDocument();
  });

  test('401 clears the session and goes to /login', async () => {
    vi.mocked(fetcher).mockRejectedValue({ status: 401 });
    localStorage.setItem('token', 'old');
    renderPage();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('another failure shows a retry banner instead of the empty invitation', async () => {
    vi.mocked(fetcher).mockRejectedValueOnce({ status: 500 }).mockResolvedValue([BENCH]);
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không tải được kỷ lục');
    expect(screen.queryByText(/Chưa có kỷ lục nào/)).not.toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    await userEvent.setup({ delay: null }).click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('region', { name: 'Bench Press' })).toBeInTheDocument();
  });
});
