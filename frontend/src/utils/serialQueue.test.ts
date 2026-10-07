import { describe, expect, test } from 'vitest';
import { createSerialQueue } from './serialQueue';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('createSerialQueue', () => {
  test('runs tasks in call order even when an earlier task is slower', async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    const a = enqueue(async () => { await sleep(30); log.push('a'); return 1; });
    const b = enqueue(async () => { await sleep(2); log.push('b'); return 2; });
    const c = enqueue(async () => { log.push('c'); return 3; });
    expect(await Promise.all([a, b, c])).toEqual([1, 2, 3]);
    expect(log).toEqual(['a', 'b', 'c']);
  });

  test('never runs two tasks at the same time', async () => {
    const enqueue = createSerialQueue();
    let inFlight = 0;
    let max = 0;
    const task = async () => {
      inFlight++;
      max = Math.max(max, inFlight);
      await sleep(3);
      inFlight--;
    };
    await Promise.all(Array.from({ length: 10 }, () => enqueue(task)));
    expect(max).toBe(1);
  });

  test('a failing task rejects its own promise but does not block the ones after it', async () => {
    const enqueue = createSerialQueue();
    const bad = enqueue(async () => { throw new Error('boom'); });
    const good = enqueue(async () => 'ok');
    await expect(bad).rejects.toThrow('boom');
    await expect(good).resolves.toBe('ok');
  });

  test('a synchronously throwing task behaves the same', async () => {
    const enqueue = createSerialQueue();
    const bad = enqueue((() => { throw new Error('sync boom'); }) as () => Promise<never>);
    const good = enqueue(async () => 'after');
    await expect(bad).rejects.toThrow('sync boom');
    await expect(good).resolves.toBe('after');
  });

  test('a task enqueued after the queue went idle starts immediately', async () => {
    const enqueue = createSerialQueue();
    await enqueue(async () => sleep(2));
    await expect(enqueue(async () => 'late')).resolves.toBe('late');
  });

  test('queues are independent of each other', async () => {
    const q1 = createSerialQueue();
    const q2 = createSerialQueue();
    const log: string[] = [];
    const slow = q1(async () => { await sleep(25); log.push('q1'); });
    const fast = q2(async () => { log.push('q2'); });
    await Promise.all([slow, fast]);
    expect(log).toEqual(['q2', 'q1']);
  });

  test('each task receives its own result, not a neighbour\'s', async () => {
    const enqueue = createSerialQueue();
    const results = await Promise.all([1, 2, 3, 4, 5].map(n => enqueue(async () => n * 10)));
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });
});
