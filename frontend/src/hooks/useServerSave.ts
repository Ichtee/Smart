'use client';
import { useCallback, useRef, useState } from 'react';
import { createSerialQueue } from '@/utils/serialQueue';

export type SaveStatus = 'idle' | 'saving' | 'error';

/**
 * Serialized saves to the server with visible failure state.
 * Server is the only copy of the data, so a failed save must be shown and retryable.
 * Saves are full snapshots, so a later successful save supersedes an earlier failure,
 * and "retry" simply re-sends the most recent snapshot.
 */
export function useServerSave() {
  const queue = useRef(createSerialQueue());
  const pending = useRef(0);
  const latest = useRef<(() => Promise<Response>) | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const save = useCallback((send: () => Promise<Response>) => {
    latest.current = send;
    pending.current += 1;
    setStatus('saving');
    return queue.current(async () => {
      let ok = false;
      try {
        const res = await send();
        ok = res.ok;
      } catch {
        ok = false;
      }
      pending.current -= 1;
      if (!ok) setStatus('error');
      else if (pending.current === 0) setStatus('idle');
      return ok;
    });
  }, []);

  const retry = useCallback(() => {
    if (latest.current) return save(latest.current);
    return Promise.resolve(true);
  }, [save]);

  return { save, retry, status };
}
