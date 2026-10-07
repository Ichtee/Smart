import { test, expect } from '@playwright/test';
import { api, createActiveUser, completeProfile, loginApi, uiLogin, nav, greeting, formAlert } from '../support';

test.describe('profile', () => {
  test('shows the saved values, read-only account fields and the BMI card', async ({ page }) => {
    const user = await createActiveUser({ name: 'Dana Pham' });
    await completeProfile(user, { gender: 'Nữ', height: 165, weight: 58, age: 30, goal: 'Giữ dáng' });
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Hồ sơ');

    await expect(page.getByLabel('Họ và tên')).toHaveValue('Dana Pham');
    await expect(page.getByLabel('Giới tính')).toHaveValue('Nữ');
    await expect(page.getByLabel('Tuổi')).toHaveValue('30');
    await expect(page.getByLabel(/Chiều cao/)).toHaveValue('165');
    await expect(page.getByLabel(/Cân nặng/)).toHaveValue('58');
    await expect(page.getByLabel('Mục tiêu tập luyện')).toHaveValue('Giữ dáng');
    await expect(page.locator('input[disabled]').first()).toBeDisabled();
    await expect(page.getByText('21.3')).toBeVisible();
    await expect(page.getByText('Bình thường')).toBeVisible();
  });

  test('the BMI card follows the fields live, across every band', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user, { height: 170, weight: 70 });
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Hồ sơ');

    const weight = page.getByLabel(/Cân nặng/);
    for (const [kg, label] of [['50', 'Thiếu cân'], ['70', 'Bình thường'], ['80', 'Thừa cân'], ['100', 'Béo phì']] as const) {
      await weight.fill(kg);
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await weight.fill('');
    await expect(page.getByText(/Vui lòng nhập chiều cao và cân nặng/)).toBeVisible();
  });

  test('saving persists on the server, including the "Sức bền" goal, and survives a reload', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Hồ sơ');

    await page.getByLabel('Họ và tên').fill('  Renamed   Person ');
    await page.getByLabel('Tuổi').fill('41');
    await page.getByLabel('Mục tiêu tập luyện').selectOption('Sức bền');
    await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
    await expect(page.getByText('Cập nhật hồ sơ thành công!')).toBeVisible();

    const { body } = await loginApi(user.username, user.password);
    const saved = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(saved).toMatchObject({ name: 'Renamed Person', age: 41, goal: 'Sức bền' });

    await page.reload();
    await expect(page.getByLabel('Họ và tên')).toHaveValue('Renamed Person');
    await expect(page.getByLabel('Mục tiêu tập luyện')).toHaveValue('Sức bền');
  });

  test('a rename shows on the dashboard immediately (no stale cache)', async ({ page }) => {
    const user = await createActiveUser({ name: 'Before Name' });
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Hồ sơ');
    await page.getByLabel('Họ và tên').fill('After Name');
    await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
    await expect(page.getByText('Cập nhật hồ sơ thành công!')).toBeVisible();
    await nav(page, 'Tổng quan');
    await expect(page.getByText(/Xin chào/)).toBeVisible();
    expect(await greeting(page)).toContain('After Name');
  });

  test('invalid values are refused with a message and nothing is sent', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Hồ sơ');
    let puts = 0;
    page.on('request', r => { if (r.method() === 'PUT' && r.url().includes('/profile')) puts++; });

    await page.getByLabel(/Chiều cao/).fill('20');
    await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
    await expect(formAlert(page)).toContainText('Chiều cao');

    await page.getByLabel(/Chiều cao/).fill('175');
    await page.getByLabel('Họ và tên').fill('a');
    await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
    await expect(formAlert(page)).toContainText('Họ và tên');
    expect(puts).toBe(0);
  });

  test('without a session the page redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/);
  });
});
