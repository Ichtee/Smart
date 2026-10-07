import { test, expect } from '@playwright/test';
import { api, clearMetrics, createActiveUser, completeProfile, loginApi, uiLogin, nav, formAlert } from '../support';

const localDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.describe('body measurements', () => {
  test('log weights, see the chart and change, and the profile weight follows the latest entry', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user, { weight: 80 });
    const { body } = await loginApi(user.username, user.password);
    await clearMetrics(body.token);
    await api('/api/body-metrics', { date: localDate(-14), weight: 80 }, body.token);
    await api('/api/body-metrics', { date: localDate(-7), weight: 78.5, bodyFat: 22 }, body.token);

    await uiLogin(page, user.username, user.password);
    await nav(page, 'Cơ thể');
    await expect(page.getByRole('heading', { name: /Số đo cơ thể/ })).toBeVisible();
    await expect(page.getByTestId('history-row')).toHaveCount(2);
    await expect(page.getByTestId('weight-change')).toHaveText('-1.5 kg');

    await page.getByLabel(/Cân nặng/).fill('77');
    await page.getByLabel(/Vòng eo/).fill('84');
    await page.getByRole('button', { name: 'Lưu số đo' }).click();
    await expect(page.getByText('Đã lưu số đo!')).toBeVisible();
    await expect(page.getByTestId('history-row')).toHaveCount(3);
    await expect(page.getByTestId('weight-change')).toHaveText('-3 kg');
    await expect(page.getByRole('img', { name: /Biểu đồ cân nặng/ }).locator('circle')).toHaveCount(3);

    const profile = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(profile.weight).toBe(77);

    // the new weight is what the other pages use right away (no stale cache): nutrition water goal 77 kg -> 2700 ml
    await nav(page, 'Dinh dưỡng');
    await expect(page.getByText('ml / 2700 ml')).toBeVisible();
  });

  test('invalid entries are refused in the browser without a request', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Cơ thể');
    let posts = 0;
    page.on('request', r => { if (r.url().includes('/api/body-metrics') && r.method() === 'POST') posts++; });

    await page.getByLabel(/Cân nặng/).fill('5');
    await page.getByRole('button', { name: 'Lưu số đo' }).click();
    await expect(formAlert(page)).toContainText('Cân nặng');
    await page.getByLabel(/Cân nặng/).fill('70');
    await page.getByRole('checkbox', { name: /số đo tỷ lệ mỡ từ máy/ }).check();
    await page.getByLabel(/Tỷ lệ mỡ/).fill('90');
    await page.getByRole('button', { name: 'Lưu số đo' }).click();
    await expect(formAlert(page)).toContainText('mỡ');
    expect(posts).toBe(0);
  });

  test('delete a measurement: the list updates and the profile falls back to the previous weight', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user, { weight: 70 });
    const { body } = await loginApi(user.username, user.password);
    await clearMetrics(body.token);
    await api('/api/body-metrics', { date: localDate(-5), weight: 70 }, body.token);
    await api('/api/body-metrics', { date: localDate(0), weight: 65 }, body.token);

    await uiLogin(page, user.username, user.password);
    await nav(page, 'Cơ thể');
    await expect(page.getByTestId('history-row')).toHaveCount(2);

    await page.getByRole('button', { name: `Xóa số đo ngày ${localDate(0)}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(page.getByTestId('history-row')).toHaveCount(1);
    const profile = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(profile.weight).toBe(70);
  });

  test('onboarding\'s weight becomes the first measurement', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);
    await page.getByLabel('Độ tuổi').fill('28');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByLabel(/Chiều cao/).fill('170');
    await page.getByLabel(/Cân nặng/).fill('64');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Hoàn tất/ }).click();
    await page.waitForURL(/\/dashboard/);

    await nav(page, 'Cơ thể');
    await expect(page.getByTestId('history-row')).toHaveCount(1);
    await expect(page.getByTestId('history-row')).toContainText('64 kg');
  });
});
