import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountDataPanel from './AccountDataPanel';
import { apiFetch } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/hooks/useApi', () => ({ clearApiCache: vi.fn() }));
vi.mock('@/utils/api', async (orig) => ({ ...(await orig<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(clearApiCache).mockClear();
  localStorage.clear();
  localStorage.setItem('token', 'tok');
});

const stubDownload = () => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
};
const exportBtn = () => screen.getByRole('button', { name: /Xuất dữ liệu/ });
const openDelete = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Xóa tài khoản/ }));
  return screen.getByLabelText(/Nhập mật khẩu/);
};

describe('AccountDataPanel: export details', () => {
  test('the file is named my-fitness-data.json, points at the blob and leaves no link behind', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}'));
    const click = stubDownload();
    render(<AccountDataPanel />);
    await userEvent.click(exportBtn());
    await waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('my-fitness-data.json');
    expect(link.getAttribute('href')).toBe('blob:x');
    expect(document.body.querySelector('a[download]')).toBeNull();
  });

  test('while exporting the button is disabled, so a second click sends nothing', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    stubDownload();
    render(<AccountDataPanel />);
    await userEvent.click(exportBtn());
    expect(exportBtn()).toBeDisabled();
    await userEvent.click(exportBtn());
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(new Response('{}'));
    await waitFor(() => expect(exportBtn()).toBeEnabled());
  });

  test('after a failed export the button works again and the retry clears the old error', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(json({ message: 'Server error' }, 500));
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response('{}'));
    const click = stubDownload();
    render(<AccountDataPanel />);
    await userEvent.click(exportBtn());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(exportBtn()).toBeEnabled();
    await userEvent.click(exportBtn());
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a 401 while exporting also clears the cache', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 401));
    render(<AccountDataPanel />);
    await userEvent.click(exportBtn());
    await waitFor(() => expect(clearApiCache).toHaveBeenCalled());
    expect(nav.push).toHaveBeenCalledWith('/login');
  });
});

describe('AccountDataPanel: delete details', () => {
  test('pressing Enter with an empty password sends nothing', async () => {
    render(<AccountDataPanel />);
    const input = await openDelete();
    await userEvent.type(input, '{Enter}');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  test('pressing Enter twice while deleting sends one request', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    render(<AccountDataPanel />);
    const input = await openDelete();
    await userEvent.type(input, 'secret123{Enter}{Enter}');
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(json({ message: 'ok' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/'));
  });

  test('the submit handler itself refuses an empty password and a second submit while deleting', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    render(<AccountDataPanel />);
    const input = await openDelete();
    const form = input.closest('form')!;
    fireEvent.submit(form); // empty password
    expect(apiFetch).not.toHaveBeenCalled();
    await userEvent.type(input, 'secret123');
    fireEvent.submit(form);
    fireEvent.submit(form); // while the first is still running
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(json({ message: 'ok' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/'));
  });

  test('a 401 while deleting ends the session locally', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 401));
    render(<AccountDataPanel />);
    const input = await openDelete();
    await userEvent.type(input, 'secret123{Enter}');
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(clearApiCache).toHaveBeenCalled();
  });

  test('after a refused delete the form is usable again and cancel hides the old error', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Mật khẩu không đúng.' }, 400));
    render(<AccountDataPanel />);
    const input = await openDelete();
    await userEvent.type(input, 'nope1234{Enter}');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xóa vĩnh viễn/ })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a new attempt clears the previous error while it is running', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(json({ message: 'Mật khẩu không đúng.' }, 400));
    render(<AccountDataPanel />);
    const input = await openDelete();
    await userEvent.type(input, 'nope1234{Enter}');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    vi.mocked(apiFetch).mockReturnValueOnce(new Promise(() => {})); // second attempt stays pending
    await userEvent.type(input, '{Enter}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
