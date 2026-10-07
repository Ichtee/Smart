import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  ApiError,
  fetcher,
  isUnauthorizedError,
  useProfile,
  useRoutines,
  useExercises,
  useFoods,
  useStreak,
  refreshProfile,
  clearApiCache,
  seedProfileCache,
} from './useApi';
import { API_URL, markAuthVerified, isAuthRecentlyVerified } from '@/utils/api';
import { toDateStr } from '@/utils/dateUtils';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
const urlsCalled = () => fetchMock.mock.calls.map(c => String(c[0]).replace(API_URL, ''));

beforeEach(async () => {
  // fake timers that still tick in real time (so waitFor works) and that we can fast-forward
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock = vi.fn(async () => json({}));
  vi.stubGlobal('fetch', fetchMock);
  await clearApiCache(); // SWR's cache is module-global: start every test empty
});

afterEach(async () => {
  // let SWR's request-dedupe timers expire so the next test cannot reuse this test's requests
  await act(async () => { vi.advanceTimersByTime(10_000); });
  vi.useRealTimers();
});

describe('fetcher', () => {
  test('returns parsed JSON for a 2xx', async () => {
    fetchMock.mockResolvedValue(json({ a: 1 }));
    await expect(fetcher('/api/x')).resolves.toEqual({ a: 1 });
  });

  test('throws ApiError carrying the status and the server message', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Token hết hạn' }, 401));
    const err = await fetcher('/api/x').catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token hết hạn');
  });

  test('falls back to "HTTP <status>" when the error body is not JSON or has no message', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 500 }));
    expect((await fetcher('/api/x').catch(e => e)).message).toBe('HTTP 500');
    fetchMock.mockResolvedValueOnce(json({ error: 'x' }, 404));
    expect((await fetcher('/api/x').catch(e => e)).message).toBe('HTTP 404');
  });
});

describe('isUnauthorizedError', () => {
  test('is true only for an ApiError with status 401', () => {
    expect(isUnauthorizedError(new ApiError(401, 'no'))).toBe(true);
    expect(isUnauthorizedError(new ApiError(403, 'no'))).toBe(false);
    expect(isUnauthorizedError(new ApiError(500, 'no'))).toBe(false);
    expect(isUnauthorizedError(new Error('401'))).toBe(false);
    expect(isUnauthorizedError({ status: 401 })).toBe(false); // a lookalike object does not count
    expect(isUnauthorizedError(undefined)).toBe(false);
  });
});

describe('data hooks', () => {
  test.each([
    ['useProfile', () => useProfile(), '/api/users/profile'],
    ['useRoutines', () => useRoutines(), '/api/routines'],
    ['useExercises', () => useExercises(), '/api/exercises'],
    ['useFoods', () => useFoods(), '/api/foods'],
  ])('%s requests %s and exposes the data', async (_name, hook, url) => {
    fetchMock.mockResolvedValue(json([{ id: 1 }]));
    const { result } = renderHook(hook as () => Record<string, unknown>);
    await waitFor(() => expect(Object.values(result.current).some(v => Array.isArray(v) && v.length === 1)).toBe(true));
    expect(urlsCalled()).toEqual([url]);
  });

  test('two components using the same hook share ONE request', async () => {
    fetchMock.mockResolvedValue(json({ name: 'A' }));
    const a = renderHook(() => useProfile());
    const b = renderHook(() => useProfile());
    await waitFor(() => expect(a.result.current.profile).toEqual({ name: 'A' }));
    await waitFor(() => expect(b.result.current.profile).toEqual({ name: 'A' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('reference data is cached: remounting does not refetch', async () => {
    fetchMock.mockResolvedValue(json([{ _id: 'r1' }]));
    const first = renderHook(() => useRoutines());
    await waitFor(() => expect(first.result.current.routines).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useRoutines());
    expect(second.result.current.routines).toHaveLength(1); // immediately, from the cache
    await new Promise(r => setTimeout(r, 30));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('an error carries the HTTP status and is NOT retried automatically', async () => {
    fetchMock.mockResolvedValue(json({ message: 'nope' }, 401));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(isUnauthorizedError(result.current.error)).toBe(true);
    await new Promise(r => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1); // a 401 must not hammer the API
  });

  test('a server error is distinguishable from an expired session', async () => {
    fetchMock.mockResolvedValue(json({ message: 'boom' }, 500));
    const { result } = renderHook(() => useFoods());
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(isUnauthorizedError(result.current.error)).toBe(false);
    expect((result.current.error as ApiError).status).toBe(500);
  });
});

describe('useStreak', () => {
  // Just after local midnight the UTC date is still "yesterday" east of Greenwich, and just before
  // local midnight it is already "tomorrow" west of it: one of these two differs from the local date
  // in every time zone except UTC itself, so asking for the UTC date can never pass both.
  test.each([
    ['00:30 local', new Date(2026, 9, 7, 0, 30)],
    ['23:30 local', new Date(2026, 9, 7, 23, 30)],
  ])("asks for the streak relative to the user's LOCAL today (%s)", async (_label, now) => {
    vi.setSystemTime(now);
    fetchMock.mockResolvedValue(json({ current: 3, longest: 5, total: 9, streakDates: [] }));

    const { result } = renderHook(() => useStreak());
    await waitFor(() => expect(result.current.streak).toBeDefined());
    expect(urlsCalled()).toEqual(['/api/workouts/streak?today=2026-10-07']);
    expect(result.current.streak.current).toBe(3);
  });

  test('different days are different cache entries', async () => {
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    const a = renderHook(() => useStreak());
    await waitFor(() => expect(a.result.current.streak).toBeDefined());
    a.unmount();

    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const b = renderHook(() => useStreak());
    await waitFor(() => expect(b.result.current.streak).toBeDefined());
    expect(urlsCalled()).toEqual(['/api/workouts/streak?today=2026-10-07', '/api/workouts/streak?today=2026-10-08']);
    expect(toDateStr(new Date())).toBe('2026-10-08');
  });
});

describe('profile cache helpers', () => {
  test('seedProfileCache fills the cache so the page does not need a request', async () => {
    await act(async () => { await seedProfileCache({ name: 'Seeded' }); });
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile).toEqual({ name: 'Seeded' });
    await new Promise(r => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('refreshProfile refetches and updates every subscriber (call it after saving the profile)', async () => {
    fetchMock.mockResolvedValueOnce(json({ goal: 'Giữ dáng' }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.profile).toEqual({ goal: 'Giữ dáng' }));

    fetchMock.mockResolvedValueOnce(json({ goal: 'Tăng cơ' }));
    await act(async () => { await refreshProfile(); });
    await waitFor(() => expect(result.current.profile).toEqual({ goal: 'Tăng cơ' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('refreshProfile updates the cache even when NO component is mounted (onboarding -> dashboard)', async () => {
    // AuthGuard cached the profile before onboarding...
    await act(async () => { await seedProfileCache({ name: 'New user', height: null, weight: null }); });
    // ...the user finishes onboarding while no profile hook is mounted...
    fetchMock.mockResolvedValue(json({ name: 'New user', height: 181, weight: 88 }));
    await act(async () => { await refreshProfile(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // ...and the next page must see the saved values immediately, not the stale ones
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile).toEqual({ name: 'New user', height: 181, weight: 88 });
    await new Promise(r => setTimeout(r, 30));
    expect(fetchMock).toHaveBeenCalledTimes(1); // no extra request needed
  });

  test('if the refresh request fails, the stale profile is dropped so the next page fetches the real one', async () => {
    await act(async () => { await seedProfileCache({ name: 'Stale', height: null }); });
    fetchMock.mockRejectedValue(new TypeError('offline')); // every attempt fails (apiFetch retries network errors)
    await act(async () => {
      const refreshing = refreshProfile(); // must not throw: the save itself already succeeded
      await vi.advanceTimersByTimeAsync(5000); // skip apiFetch's retry backoff
      await refreshing;
    });

    fetchMock.mockResolvedValue(json({ name: 'Fresh', height: 170 }));
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile).toBeUndefined(); // the stale copy is gone
    await waitFor(() => expect(result.current.profile).toEqual({ name: 'Fresh', height: 170 }));
  });

  test("clearApiCache drops EVERYTHING, so the next account never sees the previous one's data", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('profile') ? json({ name: 'Alice' }) : json([{ _id: 'alices-food' }]));
    const p = renderHook(() => useProfile());
    const f = renderHook(() => useFoods());
    await waitFor(() => expect(p.result.current.profile).toEqual({ name: 'Alice' }));
    await waitFor(() => expect(f.result.current.foods).toHaveLength(1));
    p.unmount();
    f.unmount();

    await act(async () => { await clearApiCache(); });

    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes('profile') ? json({ name: 'Bob' }) : json([]));
    const p2 = renderHook(() => useProfile());
    expect(p2.result.current.profile).toBeUndefined(); // nothing stale to flash
    await waitFor(() => expect(p2.result.current.profile).toEqual({ name: 'Bob' }));
    const f2 = renderHook(() => useFoods());
    await waitFor(() => expect(f2.result.current.foods).toEqual([]));
  });

  test('logging out and in as someone else a few seconds later gives the new account its OWN data', async () => {
    // regression: a 60s request-dedupe window made the next login reuse (and then drop) Alice's request
    fetchMock.mockResolvedValue(json({ name: 'Alice' }));
    const alice = renderHook(() => useProfile());
    await waitFor(() => expect(alice.result.current.profile).toEqual({ name: 'Alice' }));
    alice.unmount();

    await act(async () => { await clearApiCache(); }); // logout
    await act(async () => { vi.advanceTimersByTime(5000); }); // someone logs in a few seconds later

    fetchMock.mockResolvedValue(json({ name: 'Bob' }));
    const bob = renderHook(() => useProfile());
    await waitFor(() => expect(bob.result.current.profile).toEqual({ name: 'Bob' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('clearApiCache also forgets that the session was recently verified', async () => {
    markAuthVerified();
    expect(isAuthRecentlyVerified(60_000)).toBe(true);
    await clearApiCache();
    expect(isAuthRecentlyVerified(60_000)).toBe(false);
  });
});
