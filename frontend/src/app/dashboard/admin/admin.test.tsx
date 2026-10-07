import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './page';
import UserManagement from './users/page';
import ExerciseManagement from './exercises/page';
import RoutineManagement from './routines/page';
import FoodManagement from './foods/page';
import { apiFetch } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

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
  clearApiCache(); // SWR keeps responses between tests
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

describe('admin dashboard counts', () => {
  test('shows the number of users and exercises', async () => {
    serve({ '/api/users/profile': json(200, ADMIN), '/api/users': json(200, [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]), '/api/exercises': json(200, [{ _id: 'e1' }, { _id: 'e2' }]) });
    render(<AdminDashboard />);
    expect(await screen.findByText('Tổng người dùng')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('a paged users response uses its total', async () => {
    serve({ '/api/users/profile': json(200, ADMIN), '/api/users': json(200, { users: [{ _id: 'a' }], total: 42 }) });
    render(<AdminDashboard />);
    expect(await screen.findByText('42')).toBeInTheDocument();
  });
});

describe('admin session errors', () => {
  test.each(PAGES)('%s: a server error on the profile shows an auth error, not a redirect', async (_name, Page) => {
    serve({ '/api/users/profile': json(500, { message: 'boom' }) });
    render(<Page />);
    expect(await screen.findByText('Lỗi xác thực.')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalledWith('/login');
    expect(vi.mocked(apiFetch).mock.calls.map(c => c[0])).toEqual(['/api/users/profile']);
  });
});

describe('admin users page edits', () => {
  const lan = { _id: 'u1', name: 'Lan', email: 'lan@example.com', role: 'user', isEmailVerified: true };

  test('changing a role saves it and reloads the list', async () => {
    let role = 'user';
    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (path === '/api/users/profile') return json(200, ADMIN);
      if (path === '/api/users/u1' && init?.method === 'PUT') { role = JSON.parse(String(init.body)).role; return json(200, {}); }
      if (path === '/api/users') return json(200, [{ ...lan, role }]);
      return json(200, []);
    });
    render(<UserManagement />);
    const select = (await screen.findAllByRole('combobox'))[0] as HTMLSelectElement;
    expect(select.value).toBe('user');
    await userEvent.selectOptions(select, 'admin');
    expect(await screen.findByText(/Cập Nhật Thành Công/)).toBeInTheDocument();
    await waitFor(() => expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('admin'));
    const gets = vi.mocked(apiFetch).mock.calls.filter(c => c[0] === '/api/users');
    expect(gets.length).toBe(2); // initial load + reload after the save
  });

  test('a refused update shows the server message', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (path === '/api/users/profile') return json(200, ADMIN);
      if (path === '/api/users/u1' && init?.method === 'PUT') return json(400, { message: 'Không thể hạ quyền admin cuối cùng.' });
      if (path === '/api/users') return json(200, [lan]);
      return json(200, []);
    });
    render(<UserManagement />);
    await userEvent.selectOptions((await screen.findAllByRole('combobox'))[0], 'admin');
    expect(await screen.findByText('Không thể hạ quyền admin cuối cùng.')).toBeInTheDocument();
  });
});

describe('admin foods page edits', () => {
  test('deleting a food reloads the list', async () => {
    let foods = [{ _id: 'f1', name: 'Phở bò', calories: 450, protein: 22, carbs: 55, fat: 12, category: 'meal' }];
    vi.mocked(apiFetch).mockImplementation(async (path, init) => {
      if (path === '/api/foods/f1' && init?.method === 'DELETE') { foods = []; return json(200, {}); }
      if (path === '/api/foods') return json(200, foods);
      return json(200, []);
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<FoodManagement />);
    expect(await screen.findByText('Phở bò')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /xóa|xoá/i }));
    await waitFor(() => expect(screen.queryByText('Phở bò')).not.toBeInTheDocument());
  });
});
