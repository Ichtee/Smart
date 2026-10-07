'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUnauthorizedError, useProfile } from './useApi';

/**
 * Admin gate for the /dashboard/admin pages, built on the shared profile cache.
 * `checking` is true until the profile is known; a 401 sends the visitor to /login;
 * `authError` is set for non-admins or when the profile cannot be loaded. Fetch admin data only when `isAdmin`.
 */
export function useAdmin() {
  const router = useRouter();
  const { profile, error } = useProfile();
  const unauthorized = isUnauthorizedError(error);

  useEffect(() => {
    if (unauthorized) router.push('/login');
  }, [unauthorized, router]);

  const isAdmin = profile?.role === 'admin';
  const checking = unauthorized || (!profile && !error);
  let authError = '';
  if (!checking) {
    if (error) authError = 'Lỗi xác thực.';
    else if (!isAdmin) authError = 'Từ chối truy cập: Bạn không có quyền Quản trị viên.';
  }
  return { isAdmin, checking, authError };
}
