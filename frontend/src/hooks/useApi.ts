'use client';
import useSWR, { SWRConfiguration } from 'swr';
import { apiFetch } from '@/utils/api';
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
const STATIC: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 60_000,
  shouldRetryOnError: false,
};

export const isUnauthorizedError = (err: unknown) => err instanceof ApiError && err.status === 401;

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/profile', fetcher, STATIC);
  return { profile: data, error, isLoading, mutate };
}

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
