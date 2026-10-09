import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

type Sentinel = { released: boolean; release: ReturnType<typeof vi.fn> };
let request: ReturnType<typeof vi.fn>;
let sentinels: Sentinel[];
const nav = navigator as unknown as Record<string, unknown>;

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  sentinels = [];
  request = vi.fn(async () => {
    const sentinel: Sentinel = { released: false, release: vi.fn(async () => { sentinel.released = true; }) };
    sentinels.push(sentinel);
    return sentinel;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
});
afterEach(() => {
  delete nav.wakeLock;
  setVisibility('visible');
});

describe('useWakeLock', () => {
  test('requests a screen lock while active', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });

  test('does not request a lock while inactive', () => {
    renderHook(() => useWakeLock(false));
    expect(request).not.toHaveBeenCalled();
  });

  test('releases when it turns inactive', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
    await waitFor(() => expect(sentinels).toHaveLength(1));
    rerender({ active: false });
    await waitFor(() => expect(sentinels[0].release).toHaveBeenCalled());
  });

  test('releases on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(sentinels).toHaveLength(1));
    unmount();
    await waitFor(() => expect(sentinels[0].release).toHaveBeenCalled());
  });

  test('re-requests when the page becomes visible again, because the browser drops the lock while hidden', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(sentinels).toHaveLength(1));

    sentinels[0].released = true; // what the browser does when the tab is hidden
    setVisibility('hidden');
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  test('does not stack a second lock while one is still held', async () => {
    renderHook(() => useWakeLock(true));
    await waitFor(() => expect(sentinels).toHaveLength(1));
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('releases a lock that was granted after the hook already turned inactive', async () => {
    let grant: (s: Sentinel) => void = () => {};
    request.mockImplementationOnce(() => new Promise<Sentinel>(resolve => { grant = resolve; }));
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
    rerender({ active: false });
    const late: Sentinel = { released: false, release: vi.fn(async () => {}) };
    grant(late);
    await waitFor(() => expect(late.release).toHaveBeenCalled());
  });

  test('does nothing without support', () => {
    delete nav.wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });

  test('swallows a rejected request', async () => {
    request.mockRejectedValue(new DOMException('low battery', 'NotAllowedError'));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await waitFor(() => expect(request).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 10));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
