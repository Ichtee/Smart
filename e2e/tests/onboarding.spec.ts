import { test, expect } from '@playwright/test';
import { api, createActiveUser, loginApi, uiLogin } from '../support';

test.describe('onboarding', () => {
  test('visiting it without a session sends you to login', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForURL(/\/login/);
  });

  test('walks four steps, shows a plan, saves the profile and opens the dashboard', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);

    // step 1
    await expect(page.getByText('Bắt đầu thiết lập!')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tiếp tục/ })).toBeDisabled(); // no age yet
    await page.getByRole('button', { name: 'Nữ' }).click();
    await page.getByLabel('Độ tuổi').fill('28');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    // step 2
    await expect(page.getByText('Chỉ số hình thể')).toBeVisible();
    await page.getByLabel(/Chiều cao/).fill('165');
    await page.getByLabel(/Cân nặng/).fill('58');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    // step 3
    await expect(page.getByText('Mục tiêu của bạn')).toBeVisible();
    await page.getByLabel('Mục tiêu chính').selectOption('Giảm mỡ');
    await page.getByLabel(/Mức độ hoạt động/).selectOption('Vận động nhẹ');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    // step 4: 58 / 1.65^2 = 21.3
    await expect(page.getByText('Kế hoạch dành cho bạn')).toBeVisible();
    await expect(page.getByText('21.3')).toBeVisible();
    await expect(page.getByText('Mục tiêu: Giảm mỡ')).toBeVisible();
    await page.getByRole('button', { name: /Hoàn tất/ }).click();

    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText(/Welcome Back/)).toContainText(user.name);
    await expect(page.locator('main')).toContainText(/165 cm \/ 58\s*kg/);

    const { body } = await loginApi(user.username, user.password);
    const profile = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(profile).toMatchObject({ age: 28, gender: 'Nữ', height: 165, weight: 58, goal: 'Giảm mỡ', activityLevel: 'Vận động nhẹ' });
  });

  test('out-of-range answers are refused with an alert and do not advance', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); void d.dismiss(); });

    await page.getByLabel('Độ tuổi').fill('150');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toContain('Tuổi');
    await expect(page.getByText('Bắt đầu thiết lập!')).toBeVisible();

    await page.getByLabel('Độ tuổi').fill('30');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByLabel(/Chiều cao/).fill('20');
    await page.getByLabel(/Cân nặng/).fill('70');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect.poll(() => dialogs.length).toBe(2);
    expect(dialogs[1]).toContain('Chiều cao');
    await expect(page.getByText('Chỉ số hình thể')).toBeVisible();
  });

  test('the number fields refuse e, +, - while typing', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);
    await page.getByLabel('Độ tuổi').pressSequentially('2e-+5');
    await expect(page.getByLabel('Độ tuổi')).toHaveValue('25');
  });

  test('Back keeps the answers', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);
    await page.getByLabel('Độ tuổi').fill('33');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Quay lại/ }).click();
    await expect(page.getByLabel('Độ tuổi')).toHaveValue('33');
  });
});
