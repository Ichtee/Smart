import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalorieAdvicePanel from './CalorieAdvicePanel';
import { apiFetch } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import { calcTargetCalories } from '@/utils/nutritionCalc';
import type { BodyMetric } from '@/utils/bodyMetrics';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/hooks/useApi', () => ({ refreshProfile: vi.fn(async () => undefined) }));
vi.mock('@/utils/api', async (orig) => ({ ...(await orig<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const day = (offset: number) => new Date(Date.UTC(2026, 5, 1 + offset)).toISOString().slice(0, 10);
const series = (perWeek: number, days = 21): BodyMetric[] => {
  const out: BodyMetric[] = [];
  for (let d = 0; d <= days; d += 3) out.push({ date: day(d), weight: 70 + (perWeek / 7) * d, bodyFat: null, waist: null });
  return out;
};
const profile = { weight: 70, height: 175, age: 30, gender: 'Nam', activityLevel: 'Vận động vừa', goal: 'Giảm mỡ', calorieAdjustment: 0 };

beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(refreshProfile).mockClear();
  localStorage.clear();
  localStorage.setItem('token', 'tok');
});

describe('CalorieAdvicePanel', () => {
  test('too few measurements: says what is needed and offers nothing', () => {
    render(<CalorieAdvicePanel metrics={series(0, 3)} profile={profile} />);
    expect(screen.getByText(/Cần ít nhất 4 số đo trải trong 14 ngày/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('on track: confirms it and has no apply button', () => {
    render(<CalorieAdvicePanel metrics={series(-0.5)} profile={profile} />);
    expect(screen.getByTestId('trend-text')).toHaveTextContent('-0.5 kg/tuần');
    expect(screen.getByRole('status')).toHaveTextContent('đi đúng hướng');
    expect(screen.queryByRole('button', { name: 'Áp dụng' })).not.toBeInTheDocument();
  });

  test('shows the trend with its sign and the goal band', () => {
    render(<CalorieAdvicePanel metrics={series(0.3)} profile={{ ...profile, goal: 'Tăng cơ' }} />);
    expect(screen.getByTestId('trend-text')).toHaveTextContent('+0.3 kg/tuần');
    expect(screen.getByTestId('trend-text')).toHaveTextContent('+0.1 đến +0.5 kg/tuần');
  });

  test('off track: shows the old and new target and applies the adjustment', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    const now = calcTargetCalories(profile);
    expect(screen.getByTestId('advice-text')).toHaveTextContent(`Nên giảm 250 kcal/ngày: mục tiêu ${now} → ${now - 250} kcal.`);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/users/profile');
    expect(init).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(String(init!.body))).toEqual({ calorieAdjustment: -250 });
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
  });

  test('advice builds on the adjustment already applied', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}));
    render(<CalorieAdvicePanel metrics={series(0)} profile={{ ...profile, calorieAdjustment: -100 }} />);
    expect(screen.getByTestId('advice-text')).toHaveTextContent('Nên giảm 250 kcal/ngày');
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]!.body))).toEqual({ calorieAdjustment: -350 });
  });

  test('"more" advice says tăng', () => {
    render(<CalorieAdvicePanel metrics={series(-1.2)} profile={profile} />);
    expect(screen.getByTestId('advice-text')).toHaveTextContent('Nên tăng 250 kcal/ngày');
  });

  test('while saving the button is disabled so a second click sends nothing', async () => {
    let finish!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { finish = r; }));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    finish(json({}));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeEnabled());
  });

  test('a refused save shows the server message, does not refresh, and a retry clears it', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(json({ message: 'Điều chỉnh calo phải là số nguyên từ -500 đến 500.' }, 400));
    vi.mocked(apiFetch).mockResolvedValueOnce(json({}));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Điều chỉnh calo phải là số nguyên');
    expect(refreshProfile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a refused save without a message falls back to a generic one', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('oops', { status: 500 }));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể cập nhật mục tiêu calo.');
  });

  test('a network failure is reported', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Failed to fetch'));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeEnabled();
  });

  test('a 401 ends the session locally and goes to login', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}, 401));
    render(<CalorieAdvicePanel metrics={series(0)} profile={profile} />);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  test('at the limit it explains instead of offering a change', () => {
    render(<CalorieAdvicePanel metrics={series(0)} profile={{ ...profile, calorieAdjustment: -500 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('đã ở mức tối đa (-500 kcal)');
    expect(screen.queryByRole('button', { name: 'Áp dụng' })).not.toBeInTheDocument();
  });

  test('an applied adjustment can be reset to 0; with none there is no reset button', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({}));
    const { unmount } = render(<CalorieAdvicePanel metrics={series(-0.5)} profile={profile} />);
    expect(screen.queryByRole('button', { name: /Đặt lại/ })).not.toBeInTheDocument();
    unmount();

    render(<CalorieAdvicePanel metrics={series(-0.5)} profile={{ ...profile, calorieAdjustment: 150 }} />);
    expect(screen.getByText(/Đang áp dụng điều chỉnh \+150 kcal\/ngày/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Đặt lại về 0/ }));
    expect(JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]!.body))).toEqual({ calorieAdjustment: 0 });
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
  });
});
