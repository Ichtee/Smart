'use client';
import useSWR, { SWRConfiguration, mutate as globalMutate, unload } from 'swr';
import { apiFetch, resetAuthVerified } from '@/utils/api';
import { toDateStr } from '@/utils/dateUtils';
import type { AdminUser, Exercise, Routine } from '@/types/domain';
import type { DbFood } from '@/app/nutrition/types';

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

const PROFILE_KEY = '/api/users/profile';

/**
 * Call after any write to /api/users/profile so every page sees the new values.
 *
 * Do not use a bare mutate(key) here: it only revalidates hooks that are mounted right now. Onboarding
 * saves the profile while no profile hook is mounted, and AuthGuard had already cached the pre-onboarding
 * profile, so the next page (dashboard, nutrition...) would show that stale copy: default 170 cm / 65 kg,
 * or a redirect back to onboarding. Passing the fetch itself updates the cache whether or not anyone is
 * subscribed. If that fetch fails the stale copy is dropped so the next page loads the real one.
 */
export const refreshProfile = async () => {
  try {
    await globalMutate(PROFILE_KEY, fetcher(PROFILE_KEY), { revalidate: false });
  } catch {
    await globalMutate(PROFILE_KEY, undefined, { revalidate: false });
  }
};

/** `enabled` false skips the request (admin pages wait until the visitor is known to be an admin). */
export function useRoutines(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/api/routines' : null, fetcher, STATIC);
  return { routines: data as Routine[] | undefined, error, isLoading, mutate };
}

export function useExercises(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/api/exercises' : null, fetcher, STATIC);
  return { exercises: data as Exercise[] | undefined, error, isLoading, mutate };
}

export function useFoods(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/api/foods' : null, fetcher, STATIC);
  return { foods: data as DbFood[] | undefined, error, isLoading, mutate };
}

/** Streak numbers; revalidates on mount/focus because it changes whenever a workout is ticked. */
export function useStreak() {
  const key = `/api/workouts/streak?today=${toDateStr(new Date())}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: true, shouldRetryOnError: false });
  return { streak: data, error, isLoading, mutate };
}

/** All accounts (admin only). Always fresh on mount; the API returns a bare array or { users, total }. */
export function useAdminUsers(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? '/api/users' : null, fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
  const users: AdminUser[] = Array.isArray(data) ? data : (data?.users || []);
  const total: number = Array.isArray(data) ? data.length : (data?.total || users.length);
  return { users, total, error, isLoading, mutate };
}
