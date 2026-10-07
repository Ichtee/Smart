import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminDashboard from './page';
import UserManagement from './users/page';
import ExerciseManagement from './exercises/page';
import RoutineManagement from './routines/page';
import FoodManagement from './foods/page';
import { apiFetch } from '@/utils/api';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router, usePathname: () => '/dashboard/admin' }));
vi.mock('@/utils/api', async (orig) => ({ ...(await orig<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Route table: path -> response. Anything else is an empty list.
const serve = (routes: Record<string, Response | (() => Response)>) =>
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    const hit = routes[String(path)];
    if (!hit) return json(200, []);
    return typeof hit === 'function' ? hit() : hit.clone();
  });

const ADMIN = { role: 'admin', name: 'Boss' };
const PAGES = [
  ['dashboard', AdminDashboard],
  ['users', UserManagement],
  ['exercises', ExerciseManagement],
  ['routines', RoutineManagement],
] as const;

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(apiFetch).mockReset();
  localStorage.clear(); // sessions live in the httpOnly cookie: no token in localStorage
});

describe.each(PAGES)('admin %s page', (_name, Page) => {
  test('checks the session through apiFetch, with no token in localStorage', async () => {
    serve({ '/api/users/profile': json(200, ADMIN) });
    render(<Page />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/users/profile'));
    expect(nav.push).not.toHaveBeenCalledWith('/login');
  });

  test('a 401 on the profile sends the visitor to /login', async () => {
    serve({ '/api/users/profile': json(401, { message: 'no' }) });
    render(<Page />);
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
  });

  test('a signed-in non-admin is refused and no admin data is requested', async () => {
    serve({ '/api/users/profile': json(200, { role: 'user' }) });
    render(<Page />);
    expect(await screen.findByText(/Từ chối truy cập/)).toBeInTheDocument();
    const paths = vi.mocked(apiFetch).mock.calls.map(c => c[0]);
    expect(paths).toEqual(['/api/users/profile']);
  });
});

describe('admin users page', () => {
  test('lists users from /api/users', async () => {
    serve({ '/api/users/profile': json(200, ADMIN), '/api/users': json(200, [{ _id: 'u1', name: 'Lan', email: 'lan@example.com', role: 'user' }]) });
    render(<UserManagement />);
    expect(await screen.findByText('lan@example.com')).toBeInTheDocument();
  });
});

describe('admin foods page', () => {
  test('loads foods through apiFetch without an Authorization header', async () => {
    serve({ '/api/foods': json(200, [{ _id: 'f1', name: 'Phở bò', calories: 450, protein: 22, carbs: 55, fat: 12, category: 'meal' }]) });
    render(<FoodManagement />);
    expect(await screen.findByText('Phở bò')).toBeInTheDocument();
    expect(vi.mocked(apiFetch).mock.calls[0]).toEqual(['/api/foods']);
  });
});
