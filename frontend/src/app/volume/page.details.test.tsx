import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  isUnauthorizedError: (e: unknown) => (e as { status?: number } | null)?.status === 401,
}));

const mondays = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10));
const DATA = (weekCount: number, muscles: { muscle: string; total: number; weekly: number[] }[]) =>
  ({ from: '2026-01-05', to: '2026-04-19', weeks: mondays(weekCount), muscles });
const label = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const renderPage = () => render(<SWRConfig value={{ provider: () => new Map() }}><VolumePage /></SWRConfig>);

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(fetcher).mockReset();
  localStorage.clear();
});

describe('Volume page: details', () => {
  test('with more than 12 weeks it labels and draws the most recent 12', async () => {
    const weeks = mondays(15);
    const weekly = Array(15).fill(0); weekly[14] = 4;
    vi.mocked(fetcher).mockResolvedValue(DATA(15, [{ muscle: 'chest', total: 4, weekly }]));
    renderPage();
    const chart = await screen.findByRole('img', { name: /Số hiệp .* theo tuần/ });
    const titles = [...chart.querySelectorAll('title')].map(t => t.textContent);
    expect(titles[0]).toBe(`Tuần ${label(weeks[3])}: 0 hiệp`);
    expect(titles[11]).toBe(`Tuần ${label(weeks[14])}: 4 hiệp`);
    const card = screen.getByTestId('volume-card');
    expect(within(card).getByText(label(weeks[3]))).toBeInTheDocument();
    expect(within(card).getByText(label(weeks[14]))).toBeInTheDocument();
  });

  test('an empty week is a thin grey bar, a busy week a taller coloured one', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, [{ muscle: 'chest', total: 6, weekly: [4, 0, 2] }]));
    renderPage();
    const rects = [...(await screen.findByRole('img', { name: /Số hiệp .* theo tuần/ })).querySelectorAll('rect')];
    expect(rects[1].getAttribute('class')).toContain('fill-border');
    expect(rects[1].getAttribute('height')).toBe('2');
    expect(rects[0].getAttribute('class')).toContain('fill-primary');
    expect(Number(rects[0].getAttribute('height'))).toBeGreaterThan(Number(rects[2].getAttribute('height')));
  });

  test('known muscles use their Vietnamese name, unknown ones their raw name', async () => {
    vi.mocked(fetcher).mockResolvedValue(DATA(3, [
      { muscle: 'chest', total: 1, weekly: [0, 0, 1] },
      { muscle: 'mystery', total: 1, weekly: [0, 0, 1] },
    ]));
    renderPage();
    expect(await screen.findByRole('region', { name: 'Ngực (Chest)' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'mystery' })).toBeInTheDocument();
  });

  test('a server error does not redirect and does not claim the history is empty', async () => {
    vi.mocked(fetcher).mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/Chưa có hiệp nào/)).not.toBeInTheDocument();
  });

  test('a 401 redirects without showing an error banner', async () => {
    vi.mocked(fetcher).mockRejectedValue(Object.assign(new Error('no'), { status: 401 }));
    renderPage();
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
