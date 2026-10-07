import { todayStr } from '@/utils/dateUtils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Onboarding from './page';
import { apiFetch } from '@/utils/api';
import { refreshProfile } from '@/hooks/useApi';
import { calcBmr, calcTdee, calcTargetCalories } from '@/utils/nutritionCalc';
import { calcBmi } from '@/utils/bmi';

const nav = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock('next/navigation', () => ({ useRouter: () => nav.router }));
vi.mock('@/hooks/useApi', () => ({ refreshProfile: vi.fn(async () => undefined) }));
vi.mock('@/utils/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/utils/api')>()), apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let alertMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  nav.push.mockClear();
  vi.mocked(refreshProfile).mockClear();
  vi.mocked(apiFetch).mockReset().mockResolvedValue(json({ ok: true }));
  alertMock = vi.fn();
  vi.stubGlobal('alert', alertMock);
  localStorage.setItem('token', 'jwt');
});

const setup = () => {
  const user = userEvent.setup({ delay: null });
  render(<Onboarding />);
  const next = () => user.click(screen.getByRole('button', { name: /Tiếp tục/ }));
  const back = () => user.click(screen.getByRole('button', { name: /Quay lại/ }));
  const type = async (label: RegExp, value: string) => {
    const el = screen.getByLabelText(label) as HTMLInputElement;
    await user.clear(el);
    await user.type(el, value);
  };
  /** Walk to step 4 with the given measurements. */
  const toResults = async (age = '30', height = '175', weight = '70') => {
    await type(/Độ tuổi/, age);
    await next();
    await type(/Chiều cao/, height);
    await type(/Cân nặng/, weight);
    await next();
    await next();
  };
  return { user, next, back, type, toResults };
};

describe('Onboarding: access', () => {
  test('without a session it sends the visitor to login', () => {
    localStorage.clear();
    setup();
    expect(nav.push).toHaveBeenCalledWith('/login');
  });

  test('with a session it stays', () => {
    setup();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe('Onboarding: step 1 (gender and age)', () => {
  test('starts on step 1 with Nam preselected and Continue disabled until an age is typed', async () => {
    const { type } = setup();
    expect(screen.getByText('Bắt đầu thiết lập!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nam' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nữ' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /Quay lại/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeDisabled();
    await type(/Độ tuổi/, '30');
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeEnabled();
  });

  test('choosing the other gender moves the selection', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Nữ' }));
    expect(screen.getByRole('button', { name: 'Nữ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nam' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('the gender buttons never submit anything', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Nam' })).toHaveAttribute('type', 'button');
  });

  test.each(['e', '-', '+', 'E'])('the number field swallows the %j key', async (key) => {
    const { user } = setup();
    const age = screen.getByLabelText(/Độ tuổi/) as HTMLInputElement;
    await user.type(age, `2${key}5`);
    expect(age.value).toBe('25');
  });

  test.each(['0', '121', '500'])('age %s is refused with an alert and the step does not change', async (age) => {
    const { type, next } = setup();
    await type(/Độ tuổi/, age);
    await next();
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Tuổi phải là số dương hợp lệ'));
    expect(screen.getByText('Bắt đầu thiết lập!')).toBeInTheDocument();
  });

  test.each(['1', '120'])('age %s (the limits) is accepted', async (age) => {
    const { type, next } = setup();
    await type(/Độ tuổi/, age);
    await next();
    expect(alertMock).not.toHaveBeenCalled();
    expect(screen.getByText('Chỉ số hình thể')).toBeInTheDocument();
  });
});

describe('Onboarding: step 2 (height and weight)', () => {
  const toStep2 = async () => {
    const s = setup();
    await s.type(/Độ tuổi/, '30');
    await s.next();
    return s;
  };

  test('Continue stays disabled until both fields are filled', async () => {
    const { type } = await toStep2();
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeDisabled();
    await type(/Chiều cao/, '175');
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeDisabled();
    await type(/Cân nặng/, '70');
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeEnabled();
  });

  test.each([['29', '70', 'Chiều cao'], ['301', '70', 'Chiều cao'], ['175', '9', 'Cân nặng'], ['175', '501', 'Cân nặng']])(
    'height %s / weight %s is refused (%s)', async (h, w, what) => {
      const { type, next } = await toStep2();
      await type(/Chiều cao/, h);
      await type(/Cân nặng/, w);
      await next();
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining(`${what} phải từ`));
      expect(screen.getByText('Chỉ số hình thể')).toBeInTheDocument();
    });

  test.each([['30', '10'], ['300', '500']])('the limits height %s / weight %s are accepted', async (h, w) => {
    const { type, next } = await toStep2();
    await type(/Chiều cao/, h);
    await type(/Cân nặng/, w);
    await next();
    expect(alertMock).not.toHaveBeenCalled();
    expect(screen.getByText('Mục tiêu của bạn')).toBeInTheDocument();
  });

  test('Back returns to step 1 and keeps what was typed', async () => {
    const { back } = await toStep2();
    await back();
    expect(screen.getByText('Bắt đầu thiết lập!')).toBeInTheDocument();
    expect((screen.getByLabelText(/Độ tuổi/) as HTMLInputElement).value).toBe('30');
  });
});

describe('Onboarding: step 3 (goal and activity)', () => {
  test('offers the goals and activity levels, with sensible defaults', async () => {
    const { toResults, type, next } = setup();
    await type(/Độ tuổi/, '30');
    await next();
    await type(/Chiều cao/, '175');
    await type(/Cân nặng/, '70');
    await next();
    expect(screen.getByText('Mục tiêu của bạn')).toBeInTheDocument();
    expect((screen.getByLabelText('Mục tiêu chính') as HTMLSelectElement).value).toBe('Giữ dáng');
    expect((screen.getByLabelText(/Mức độ hoạt động/) as HTMLSelectElement).value).toBe('Vận động vừa');
    expect(screen.getAllByRole('option').map(o => (o as HTMLOptionElement).value)).toEqual([
      'Tăng cơ', 'Giảm mỡ', 'Giữ dáng', 'Ít vận động', 'Vận động nhẹ', 'Vận động vừa', 'Vận động nhiều', 'Vận động cực nhiều',
    ]);
    void toResults;
  });
});

describe('Onboarding: step 4 (the plan)', () => {
  test('shows BMI, TDEE and the target calories computed from the answers', async () => {
    const { toResults } = setup();
    await toResults('30', '175', '70');
    expect(screen.getByText('Kế hoạch dành cho bạn')).toBeInTheDocument();

    const profile = { age: '30', gender: 'Nam', height: '175', weight: '70', goal: 'Giữ dáng', activityLevel: 'Vận động vừa' };
    expect(screen.getByText(calcBmi(70, 175).toFixed(1))).toBeInTheDocument();
    expect(screen.getAllByText(String(Math.round(calcTdee(profile)))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(String(Math.round(calcTargetCalories(profile)))).length).toBeGreaterThan(0);
    expect(screen.getByText('Mục tiêu: Giữ dáng')).toBeInTheDocument();
    expect(calcBmr(profile)).toBeGreaterThan(0);
  });

  test('changing goal and gender changes the recommended calories', async () => {
    const { user, type, next } = setup();
    await user.click(screen.getByRole('button', { name: 'Nữ' }));
    await type(/Độ tuổi/, '28');
    await next();
    await type(/Chiều cao/, '165');
    await type(/Cân nặng/, '58');
    await next();
    await user.selectOptions(screen.getByLabelText('Mục tiêu chính'), 'Giảm mỡ');
    await user.selectOptions(screen.getByLabelText(/Mức độ hoạt động/), 'Vận động nhẹ');
    await next();

    const profile = { age: '28', gender: 'Nữ', height: '165', weight: '58', goal: 'Giảm mỡ', activityLevel: 'Vận động nhẹ' };
    expect(screen.getByText('Mục tiêu: Giảm mỡ')).toBeInTheDocument();
    expect(screen.getAllByText(String(Math.round(calcTargetCalories(profile)))).length).toBeGreaterThan(0);
    expect(calcTargetCalories(profile)).toBeLessThan(calcTdee(profile)); // a cut eats below maintenance
  });

  test('Continue is replaced by the finish button; Back still works', async () => {
    const { toResults, back } = setup();
    await toResults();
    expect(screen.queryByRole('button', { name: /Tiếp tục/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hoàn tất & Bắt đầu/ })).toBeInTheDocument();
    await back();
    expect(screen.getByText('Mục tiêu của bạn')).toBeInTheDocument();
  });
});

describe('Onboarding: finishing', () => {
  const finish = async (s: ReturnType<typeof setup>) => {
    await s.toResults('30', '175', '70');
    await s.user.click(screen.getByRole('button', { name: /Hoàn tất & Bắt đầu/ }));
  };

  test('PUTs numbers (not strings) plus the choices, refreshes the cached profile, then opens the dashboard', async () => {
    const order: string[] = [];
    vi.mocked(refreshProfile).mockImplementation(async () => { order.push('refresh'); });
    nav.push.mockImplementation(() => { order.push('push'); });
    await finish(setup());

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard'));
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/users/profile');
    expect(options?.method).toBe('PUT');
    expect(JSON.parse(options!.body as string)).toEqual({
      age: 30, gender: 'Nam', height: 175, weight: 70, goal: 'Giữ dáng', activityLevel: 'Vận động vừa', metricDate: todayStr(),
    });
    expect(order).toEqual(['refresh', 'push']);
    nav.push.mockReset();
  });

  test('a rejected save shows the server message and stays put', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'Tuổi không hợp lệ' }, 400));
    await finish(setup());
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Tuổi không hợp lệ'));
    expect(nav.push).not.toHaveBeenCalledWith('/dashboard');
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Hoàn tất & Bắt đầu/ })).toBeEnabled(); // can retry
  });

  test('an unreadable error reply falls back to a generic message', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('<html>oops</html>', { status: 500 }));
    await finish(setup());
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Có lỗi xảy ra, vui lòng thử lại.'));
  });

  test('a network failure is no longer silent', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await finish(setup());
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Không thể kết nối tới máy chủ')));
    expect(nav.push).not.toHaveBeenCalledWith('/dashboard');
    expect(screen.getByRole('button', { name: /Hoàn tất & Bắt đầu/ })).toBeEnabled();
  });

  test('while saving the button shows progress and is disabled (no double save)', async () => {
    let done!: (r: Response) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise<Response>(r => { done = r; }));
    const s = setup();
    await finish(s);

    const busy = await screen.findByRole('button', { name: /Đang thiết lập/ });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: /Quay lại/ })).toBeDisabled();
    await s.user.click(busy);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    done(json({ ok: true }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard'));
  });
});
