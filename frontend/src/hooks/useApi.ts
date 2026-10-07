'use client';
import useSWR, { SWRConfiguration, mutate as globalMutate, unload } from 'swr';
import { apiFetch, resetAuthVerified } from '@/utils/api';
import { toDateStr } from '@/utils/dateUtils';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** SWR fetcher: throws ApiError (with the HTTP status) on non-2xx so callers can tell 401 from 5xx. */
export const fetcher = async (path: string) => {
  const res = await apiFetch(path);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
};

// Reference data that rarely changes: fetch once, share between pages, refresh only on demand (mutate()).
// "Fetch once" comes from revalidateIfStale: false. The request-dedupe window is left at SWR's default:
// clearApiCache() uses unload(), which also forgets in-flight requests, so a login right after a logout
// never gets the previous account's request.
const STATIC: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  shouldRetryOnError: false,
};

export const isUnauthorizedError = (err: unknown) => err instanceof ApiError && err.status === 401;

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/profile', fetcher, STATIC);
  return { profile: data, error, isLoading, mutate };
}

/**
 * Drop every cached response without refetching. Must run on login/logout/session expiry so the next
 * user never sees the previous user's profile, streak, logs or custom foods.
 */
export const clearApiCache = () => {
  resetAuthVerified();
  // unload() (not mutate): besides emptying the cache it cancels in-flight requests and forgets SWR's
  // request-dedupe bookkeeping, so the next account's first fetch is never merged into the old one.
  unload({ revalidate: false });
};

/** Put an already-fetched profile into the cache (AuthGuard fetches it anyway). */
export const seedProfileCache = (user: unknown) => globalMutate('/api/users/profile', user, { revalidate: false });

/** Call after any write to /api/users/profile so every page sees the new values. */
export const refreshProfile = () => globalMutate('/api/users/profile');

export function useRoutines() {
  const { data, error, isLoading, mutate } = useSWR('/api/routines', fetcher, STATIC);
  return { routines: data as any[] | undefined, error, isLoading, mutate };
}

export function useExercises() {
  const { data, error, isLoading, mutate } = useSWR('/api/exercises', fetcher, STATIC);
  return { exercises: data as any[] | undefined, error, isLoading, mutate };
}

export function useFoods() {
  const { data, error, isLoading, mutate } = useSWR('/api/foods', fetcher, STATIC);
  return { foods: data as any[] | undefined, error, isLoading, mutate };
}

/** Streak numbers; revalidates on mount/focus because it changes whenever a workout is ticked. */
export function useStreak() {
  const key = `/api/workouts/streak?today=${toDateStr(new Date())}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: true, shouldRetryOnError: false });
  return { streak: data, error, isLoading, mutate };
}
