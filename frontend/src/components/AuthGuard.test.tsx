import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import AuthGuard from './AuthGuard';
import { API_URL, isAuthRecentlyVerified, markAuthVerified, resetAuthVerified } from '@/utils/api';
import { clearApiCache, seedProfileCache } from '@/hooks/useApi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { pathname: '/dashboard', push, router: { push } };
});
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => nav.router }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn(), seedProfileCache: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const USER = { _id: 'u1', name: 'Dana', username: 'dana', role: 'user', height: 175 };
const ADMIN = { ...USER, _id: 'a1', name: 'Admin', username: 'admin1', role: 'admin' };

let fetchMock: ReturnType<typeof vi.fn>;
const CHILD = <div data-testid="page">protected page</div>;
const renderGuard = () => render(<AuthGuard>{CHILD}</AuthGuard>);
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  nav.pathname = '/dashboard';
  nav.push.mockClear();
  fetchMock = vi.fn(async () => json(USER));
  vi.stubGlobal('fetch', fetchMock);
  resetAuthVerified();
  vi.mocked(clearApiCache).mockClear();
  vi.mocked(seedProfileCache).mockClear();
  localStorage.setItem('token', 'tok');
});
afterEach(() => vi.useRealTimers());

describe('AuthGuard: public routes', () => {
  test.each(['/', '/login', '/register', '/forgot-password', '/verify', '/reset-password', '/reset-password/abc123'])(
    '%s renders immediately with no token check',
    async (path) => {
      localStorage.clear();
      nav.pathname = path;
      renderGuard();
      await settle();
      expect(screen.getByTestId('page')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(nav.push).not.toHaveBeenCalled();
    }
  );
});

describe('AuthGuard: no session', () => {
  test('a protected page without a token redirects to /login and never shows the page or calls the API', async () => {
    localStorage.clear();
    renderGuard();
    await settle();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText('Đang chuyển hướng...')).toBeInTheDocument();
    expect(nav.push).toHaveBeenCalledWith('/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AuthGuard: regular protected pages (optimistic)', () => {
  test('shows the page immediately, before the token has been verified', async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // verification never answers
    renderGuard();
    await settle();
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  test('verifies in the background with the Bearer token, cookies and no caching', async () => {
    renderGuard();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/users/profile`);
    expect(options.headers).toEqual({ Authorization: 'Bearer tok' });
    expect(options.credentials).toBe('include');
    expect(options.cache).toBe('no-store');
  });

  test('on success: remembers who is logged in, shares the profile with the pages, marks the session verified', async () => {
    renderGuard();
    await settle();
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 'u1', name: 'Dana', username: 'dana', role: 'user' });
    expect(seedProfileCache).toHaveBeenCalledWith(USER);
    expect(isAuthRecentlyVerified(60_000)).toBe(true);
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  test.each([401, 403])('a %i means the session is dead: clear everything and go to /login', async (status) => {
    localStorage.setItem('user', '{"name":"Dana"}');
    fetchMock.mockResolvedValue(json({ message: 'no' }, status));
    renderGuard();
    await settle();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(clearApiCache).toHaveBeenCalledTimes(1); // the next account must not see this one's cached data
    expect(nav.push).toHaveBeenCalledWith('/login');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText('Phiên đăng nhập hết hạn.')).toBeInTheDocument();
    expect(isAuthRecentlyVerified(60_000)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1); // not retried: the answer will not change
  });

  test('a server error (500) is retried, then succeeds', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json(USER));
    renderGuard();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await advance(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(2000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(isAuthRecentlyVerified(60_000)).toBe(true);
    expect(nav.push).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('tok');
  });

  test('if the server stays unreachable (cold start) the page stays visible and the user is NOT logged out', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderGuard();
    await settle();
    await advance(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 try + 2 retries
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('tok');
    expect(nav.push).not.toHaveBeenCalled();
    expect(isAuthRecentlyVerified(60_000)).toBe(false); // it will be checked again later
  });

  test('every attempt is aborted after 15 seconds (Render cold start must not hang the check forever)', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, options: RequestInit) => {
      signal = options.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });
    renderGuard();
    await settle();
    expect(signal?.aborted).toBe(false);
    await advance(15_000);
    expect(signal?.aborted).toBe(true);
    expect(screen.getByTestId('page')).toBeInTheDocument(); // still usable while it retries
  });
});

describe('AuthGuard: skipping needless re-verification', () => {
  test('a session verified a moment ago is not re-checked on this navigation', async () => {
    markAuthVerified();
    renderGuard();
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  test('after the first successful check, moving between pages does not call /profile again', async () => {
    const view = render(<AuthGuard>{CHILD}</AuthGuard>);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    for (const path of ['/workouts', '/nutrition', '/profile']) {
      nav.pathname = path;
      view.rerender(<AuthGuard>{CHILD}</AuthGuard>);
      await settle();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('...but it checks again once the 5 minutes are up', async () => {
    const view = render(<AuthGuard>{CHILD}</AuthGuard>);
    await settle();
    await advance(5 * 60_000 + 1);
    nav.pathname = '/workouts';
    view.rerender(<AuthGuard>{CHILD}</AuthGuard>);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('logging out resets it: the next login is verified from scratch', async () => {
    markAuthVerified();
    resetAuthVerified(); // what clearApiCache does on logout
    renderGuard();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('AuthGuard: admin pages', () => {
  beforeEach(() => { nav.pathname = '/dashboard/admin/users'; });

  test('the page is NOT shown while the role is being checked', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderGuard();
    await settle();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText('Xác thực quyền quản trị')).toBeInTheDocument();
  });

  test('an admin is let in once verified', async () => {
    fetchMock.mockResolvedValue(json(ADMIN));
    renderGuard();
    await settle();
    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  test('a normal user sees a clear message and is sent to the dashboard; the admin page never renders', async () => {
    renderGuard(); // default fetch answers with role "user"
    await settle();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText('Bạn không có quyền truy cập trang quản trị.')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled(); // they get a moment to read it
    await advance(1500);
    expect(nav.push).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  test('always re-checks the role, even when the session was verified a moment ago', async () => {
    markAuthVerified();
    fetchMock.mockResolvedValue(json(ADMIN));
    renderGuard();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a user who was verified as a normal user cannot slip into admin pages through the skip rule', async () => {
    markAuthVerified(); // e.g. they browsed normal pages first
    renderGuard(); // fetch says role "user"
    await settle();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  test('if the role cannot be verified (server down) admin pages stay closed and the user goes back to the dashboard', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderGuard();
    await settle();
    await advance(10_000);
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText(/Không thể kết nối để xác thực quyền quản trị/)).toBeInTheDocument();
    await advance(2000);
    expect(nav.push).toHaveBeenCalledWith('/dashboard');
  });

  test('an expired token on an admin page logs out to /login', async () => {
    fetchMock.mockResolvedValue(json({}, 401));
    renderGuard();
    await settle();
    expect(nav.push).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  test('the retry progress is shown while waiting for a cold server', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503)).mockReturnValue(new Promise(() => {}));
    renderGuard();
    await settle();
    await advance(2000);
    expect(screen.getByText(/Máy chủ đang khởi động\.\.\. thử lại lần 1\/2/)).toBeInTheDocument();
  });
});

describe('AuthGuard: stale verification results', () => {
  test('a slow answer for a page the user already left is ignored (no surprise logout)', async () => {
    let answer!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => { answer = r; }));
    const view = render(<AuthGuard>{CHILD}</AuthGuard>);
    await settle();

    nav.pathname = '/login'; // the user navigated to a public page meanwhile
    view.rerender(<AuthGuard>{CHILD}</AuthGuard>);
    await settle();

    await act(async () => { answer(json({}, 401)); });
    await settle();
    expect(localStorage.getItem('token')).toBe('tok'); // the late 401 did not clear the session
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });
});
