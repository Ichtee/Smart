import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The loaders keep module-level state, so every test gets a fresh copy of the module.
const load = async () => import('./embedPlayers');
const scripts = (needle: string) => document.querySelectorAll(`script[src*="${needle}"]`);
const win = window as unknown as Record<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  document.head.innerHTML = '';
  delete win.YT;
  delete win.SC;
  delete win.onYouTubeIframeAPIReady;
});
afterEach(() => {
  document.head.innerHTML = '';
});

describe('loadYouTubeApi', () => {
  test('resolves immediately when already loaded', async () => {
    const YT = { Player: class {} };
    win.YT = YT;
    const { loadYouTubeApi } = await load();
    await expect(loadYouTubeApi()).resolves.toBe(YT);
    expect(scripts('iframe_api')).toHaveLength(0);
  });

  test('injects the script once for concurrent calls and resolves when YouTube calls back', async () => {
    const { loadYouTubeApi } = await load();
    const a = loadYouTubeApi();
    const b = loadYouTubeApi();
    expect(scripts('www.youtube.com/iframe_api')).toHaveLength(1);

    const YT = { Player: class {} };
    win.YT = YT;
    window.onYouTubeIframeAPIReady!();
    await expect(a).resolves.toBe(YT);
    await expect(b).resolves.toBe(YT);
  });

  test('keeps an existing onYouTubeIframeAPIReady handler', async () => {
    const previous = vi.fn();
    window.onYouTubeIframeAPIReady = previous;
    const { loadYouTubeApi } = await load();
    const promise = loadYouTubeApi();
    win.YT = { Player: class {} };
    window.onYouTubeIframeAPIReady!();
    await promise;
    expect(previous).toHaveBeenCalledTimes(1);
  });

  test('rejects when the script fails to load, and a later call tries again', async () => {
    const { loadYouTubeApi } = await load();
    const first = loadYouTubeApi();
    scripts('iframe_api')[0].dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow();

    loadYouTubeApi().catch(() => {});
    expect(scripts('iframe_api')).toHaveLength(2);
  });
});

describe('loadSoundCloudApi', () => {
  test('resolves immediately when already loaded', async () => {
    const SC = { Widget: () => ({}) };
    win.SC = SC;
    const { loadSoundCloudApi } = await load();
    await expect(loadSoundCloudApi()).resolves.toBe(SC);
  });

  test('injects the script once and resolves on its load event', async () => {
    const { loadSoundCloudApi } = await load();
    const a = loadSoundCloudApi();
    const b = loadSoundCloudApi();
    expect(scripts('w.soundcloud.com/player/api.js')).toHaveLength(1);

    const SC = { Widget: () => ({}) };
    win.SC = SC;
    scripts('api.js')[0].dispatchEvent(new Event('load'));
    await expect(a).resolves.toBe(SC);
    await expect(b).resolves.toBe(SC);
  });

  test('rejects when the script fails to load', async () => {
    const { loadSoundCloudApi } = await load();
    const promise = loadSoundCloudApi();
    scripts('api.js')[0].dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow();
  });
});
