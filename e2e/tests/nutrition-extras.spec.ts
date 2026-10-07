import { test, expect } from '@playwright/test';
import { api, createActiveUser, completeProfile, loginApi, uiLogin, nav } from '../support';

const localDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.describe('water goal follows body weight', () => {
  test('a 70 kg user gets 2450 ml, a 50 kg user 1750 ml', async ({ page }) => {
    const heavy = await createActiveUser();
    await completeProfile(heavy, { weight: 70 });
    await uiLogin(page, heavy.username, heavy.password);
    await nav(page, 'Nutrition');
    await expect(page.getByText('ml / 2450 ml')).toBeVisible();

    const light = await createActiveUser();
    await completeProfile(light, { weight: 50 });
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await uiLogin(page, light.username, light.password);
    await nav(page, 'Nutrition');
    await expect(page.getByText('ml / 1750 ml')).toBeVisible();
  });
});

test.describe('copy yesterday\'s meals', () => {
  test('copies the foods, saves them, and does not touch yesterday', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    const { body } = await loginApi(user.username, user.password);
    const yesterday = localDate(-1);
    await api('/api/nutrition', {
      date: yesterday, waterGlasses: 2, mlPerGlass: 250,
      meals: { 'Bữa Sáng': [{ id: 'y1', name: 'Bánh mì trứng', calories: 350 }], 'Bữa Trưa': [{ id: 'y2', name: 'Cơm gà', calories: 600 }], 'Bữa Tối': [], 'Ăn Vặt': [] },
    }, body.token);

    await uiLogin(page, user.username, user.password);
    await nav(page, 'Nutrition');
    await expect(page.getByText('Bánh mì trứng')).toHaveCount(0);

    const saved = page.waitForResponse(r => r.url().includes('/api/nutrition') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Sao chép từ hôm qua/ }).click();
    await expect(page.getByText(`Đã sao chép 2 món từ ngày ${yesterday}.`)).toBeVisible();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText('Bánh mì trứng')).toBeVisible();
    await expect(page.getByText('Cơm gà')).toBeVisible();

    // persisted for today, and yesterday is unchanged
    await page.reload();
    await expect(page.getByText('Cơm gà')).toBeVisible();
    const today = await (await api(`/api/nutrition?date=${localDate(0)}`, undefined, body.token)).json();
    expect(today.meals['Bữa Sáng'][0]).toMatchObject({ name: 'Bánh mì trứng', calories: 350 });
    const before = await (await api(`/api/nutrition?date=${yesterday}`, undefined, body.token)).json();
    expect(before.meals['Bữa Sáng']).toHaveLength(1);
    expect(before.meals['Bữa Sáng'][0].id).toBe('y1');
  });

  test('when yesterday is empty the user is told, and nothing is saved', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Nutrition');
    let posts = 0;
    page.on('request', r => { if (r.url().includes('/api/nutrition') && r.method() === 'POST') posts++; });
    await page.getByRole('button', { name: /Sao chép từ hôm qua/ }).click();
    await expect(page.getByText(/chưa có món ăn nào để sao chép/)).toBeVisible();
    expect(posts).toBe(0);
  });
});
