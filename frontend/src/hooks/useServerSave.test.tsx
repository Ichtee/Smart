import { describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useServerSave } from './useServerSave';

const ok = () => new Response('{}', { status: 200 });
const fail = (status = 500) => new Response('{}', { status });

/** A request we can settle by hand, to test ordering and in-between states. */
const deferred = () => {
  let resolve!: (r: Response) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<Response>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('useServerSave', () => {
  test('starts idle', () => {
    const { result } = renderHook(() => useServerSave());
    expect(result.current.status).toBe('idle');
  });

  test('saving -> idle after a successful save, and save() resolves to true', async () => {
    const { result } = renderHook(() => useServerSave());
    const d = deferred();

    let outcome: Promise<boolean>;
    act(() => { outcome = result.current.save(() => d.promise); });
    expect(result.current.status).toBe('saving');

    await act(async () => { d.resolve(ok()); });
    await expect(outcome!).resolves.toBe(true);
    expect(result.current.status).toBe('idle');
  });

  test.each([
    ['a non-2xx response', () => Promise.resolve(fail(500))],
    ['a 429 (rate limited)', () => Promise.resolve(fail(429))],
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('%s -> status "error" and save() resolves to false', async (_label, send) => {
    const { result } = renderHook(() => useServerSave());
    let outcome: boolean | undefined;
    await act(async () => { outcome = await result.current.save(send); });
    expect(outcome).toBe(false);
    expect(result.current.status).toBe('error');
  });

  test('a send function that throws synchronously is a failed save, not a crash', async () => {
    const { result } = renderHook(() => useServerSave());
    await act(async () => {
      await result.current.save((() => { throw new Error('boom'); }) as () => Promise<Response>);
    });
    expect(result.current.status).toBe('error');
  });

  test('saves run strictly one after another, in the order they were requested', async () => {
    const { result } = renderHook(() => useServerSave());
    const first = deferred();
    const second = deferred();
    const sendFirst = vi.fn(() => first.promise);
    const sendSecond = vi.fn(() => second.promise);

    act(() => {
      result.current.save(sendFirst);
      result.current.save(sendSecond);
    });
    await waitFor(() => expect(sendFirst).toHaveBeenCalledTimes(1));
    expect(sendSecond).not.toHaveBeenCalled(); // must wait for the first request to finish

    await act(async () => { first.resolve(ok()); });
    await waitFor(() => expect(sendSecond).toHaveBeenCalledTimes(1));
    await act(async () => { second.resolve(ok()); });
    expect(result.current.status).toBe('idle');
  });

  test('stays "saving" until every queued save is done', async () => {
    const { result } = renderHook(() => useServerSave());
    const a = deferred();
    const b = deferred();

    act(() => {
      result.current.save(() => a.promise);
      result.current.save(() => b.promise);
    });
    await act(async () => { a.resolve(ok()); });
    await waitFor(() => expect(result.current.status).toBe('saving')); // the second one is still pending
    await act(async () => { b.resolve(ok()); });
    expect(result.current.status).toBe('idle');
  });

  test('a later successful save supersedes an earlier failure (saves are full snapshots)', async () => {
    const { result } = renderHook(() => useServerSave());
    await act(async () => { await result.current.save(() => Promise.resolve(fail())); });
    expect(result.current.status).toBe('error');

    await act(async () => { await result.current.save(() => Promise.resolve(ok())); });
    expect(result.current.status).toBe('idle');
  });

  test('a failure after earlier successes shows the error', async () => {
    const { result } = renderHook(() => useServerSave());
    await act(async () => { await result.current.save(() => Promise.resolve(ok())); });
    await act(async () => { await result.current.save(() => Promise.resolve(fail())); });
    expect(result.current.status).toBe('error');
  });

  test('one failure in a queue does not stop the saves after it', async () => {
    const { result } = renderHook(() => useServerSave());
    const calls: string[] = [];
    await act(async () => {
      await Promise.all([
        result.current.save(async () => { calls.push('a'); return fail(); }),
        result.current.save(async () => { calls.push('b'); return ok(); }),
      ]);
    });
    expect(calls).toEqual(['a', 'b']);
    expect(result.current.status).toBe('idle'); // b, the latest snapshot, succeeded
  });

  test('retry() re-sends the MOST RECENT snapshot, not the first one', async () => {
    const { result } = renderHook(() => useServerSave());
    const sendOld = vi.fn(async () => fail());
    const sendNew = vi.fn()
      .mockResolvedValueOnce(fail()) // fails at first...
      .mockResolvedValueOnce(ok()); // ...succeeds on retry

    await act(async () => { await result.current.save(sendOld); });
    await act(async () => { await result.current.save(sendNew); });
    expect(result.current.status).toBe('error');

    let retried: boolean | undefined;
    await act(async () => { retried = await result.current.retry(); });
    expect(retried).toBe(true);
    expect(sendNew).toHaveBeenCalledTimes(2);
    expect(sendOld).toHaveBeenCalledTimes(1); // the stale snapshot is never replayed
    expect(result.current.status).toBe('idle');
  });

  test('retry() that fails again keeps the error', async () => {
    const { result } = renderHook(() => useServerSave());
    const send = vi.fn(async () => fail());
    await act(async () => { await result.current.save(send); });
    await act(async () => { await result.current.retry(); });
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('error');
  });

  test('retry() with nothing saved yet does nothing', async () => {
    const { result } = renderHook(() => useServerSave());
    let outcome: boolean | undefined;
    await act(async () => { outcome = await result.current.retry(); });
    expect(outcome).toBe(true);
    expect(result.current.status).toBe('idle');
  });

  test('save and retry keep a stable identity across renders (safe in effect dependencies)', () => {
    const { result, rerender } = renderHook(() => useServerSave());
    const { save, retry } = result.current;
    rerender();
    expect(result.current.save).toBe(save);
    expect(result.current.retry).toBe(retry);
  });
});
