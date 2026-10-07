import { test, expect } from '@playwright/test';
import { api, clearMetrics, createActiveUser, completeProfile, loginApi, uiLogin, nav } from '../support';

test.describe('goal plan: goal x pace, target weight and body fat', () => {
  test('onboarding with a fast fat-loss pace and a target: the dashboard shows the same plan', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);

    await page.getByLabel('Độ tuổi').fill('30');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByLabel(/Chiều cao/).fill('175');
    await page.getByLabel('Cân nặng (kg)').fill('70');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    await page.getByLabel('Mục tiêu chính').selectOption('Giảm mỡ');
    // 70 kg: slow 0.5 % (385 -> raised to 500 kcal), medium 0.7 % (539), fast 1 % (770)
    await expect(page.getByRole('radio', { name: /Chậm/ })).toContainText('-500 kcal/ngày');
    await expect(page.getByRole('radio', { name: /Nhanh/ })).toContainText('-770 kcal/ngày');
    await page.getByRole('radio', { name: /Nhanh/ }).click();
    await page.getByLabel(/Cân nặng mục tiêu/).fill('65');
    await expect(page.getByTestId('weeks-to-goal')).toContainText('khoảng 8 tuần');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    // man, 70 kg, 175 cm, 30 y, moderately active: BMR 1649, TDEE 2556, fast cut -> 1786 kcal
    await expect(page.getByTestId('onb-target')).toHaveText('1786');
    await page.getByRole('button', { name: /Hoàn tất & Bắt đầu/ }).click();
    await page.waitForURL(/\/dashboard/);

    const plan = page.getByTestId('energy-plan');
    await expect(plan).toContainText('1786 kcal/ngày');
    await expect(plan).toContainText('-0.7 kg/tuần');
    await expect(plan).toContainText('khoảng 8 tuần');
    await expect(page.getByTestId('bmr-formula')).toContainText('Mifflin-St Jeor');

    const { body } = await loginApi(user.username, user.password);
    const saved = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(saved).toMatchObject({ goal: 'Giảm mỡ', goalPace: 'Nhanh', targetWeight: 65 });
  });

  test('body fat computed from waist + neck (US Navy) becomes the profile body fat, and the BMR switches to Katch-McArdle', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user, { weight: 70, height: 175, gender: 'Nam', goal: 'Giảm mỡ' });
    const { body } = await loginApi(user.username, user.password);
    await clearMetrics(body.token);

    await uiLogin(page, user.username, user.password);
    await nav(page, 'Cơ thể');
    await page.getByLabel('Cân nặng (kg)').fill('70');
    await page.getByLabel(/Vòng eo/).fill('85');
    await page.getByLabel(/Vòng cổ/).fill('38');
    await expect(page.getByTestId('navy-estimate')).toContainText('16.9%');
    await page.getByRole('button', { name: 'Lưu số đo' }).click();
    await expect(page.getByText('Đã lưu số đo!')).toBeVisible();
    await expect(page.getByTestId('body-composition')).toContainText('16.9%');

    const saved = await (await api('/api/users/profile', undefined, body.token)).json();
    expect(saved.bodyFat).toBe(16.9);

    await nav(page, 'Tổng quan');
    await expect(page.getByTestId('bmr-formula')).toContainText('Katch-McArdle');
    await expect(page.locator('main')).toContainText(/Khối nạc\s*58\.2 kg/); // 70 * 0.831
  });
});
