import { test, expect, type Page } from '@playwright/test';
import { BASE, api, createActiveUser, completeProfile, createAdmin, uiLogin, nav, greeting } from '../support';

/** An admin creates three exercises and a routine that has a workout on every weekday (so "today" always has one). */
async function seedRoutine() {
  const { token } = await createAdmin();
  const ex: Record<string, string> = {};
  for (const [name, muscle] of [['Bench Press', 'chest'], ['Incline Dumbbell Press', 'chest'], ['Triceps Pushdown', 'triceps']]) {
    const r = await api('/api/exercises', { name, muscle, defaultSets: 3, defaultReps: '10', equipment: 'Barbell' }, token);
    ex[name] = (await r.json())._id;
  }
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  const res = await api('/api/routines', {
    id: 'ppl', name: 'Push Pull Legs', type: 'PPL', frequencyDaysPerWeek: 7,
    schedule: days.map(day => ({
      day, name: 'Push', isRestDay: false,
      targets: [{ id: 'chest', label: 'Ngực', count: 2 }, { id: 'triceps', label: 'Tay sau', count: 1 }],
      exercises: Object.entries(ex).map(([name, id]) => ({ exerciseId: id, exerciseName: name, muscle: name.includes('Triceps') ? 'triceps' : 'chest', sets: 3, repsRange: '10', rir: '1', restTimeSeconds: 60 })),
    })),
  }, token);
  expect(res.status).toBe(201);
}

const postTo = (page: Page, part: string) => page.waitForResponse(r => r.url().includes(part) && r.request().method() === 'POST');

test.describe.configure({ mode: 'serial' }); // the routine is created once by the first test

test.describe('using the app after sign-up (client-side navigation, shared SWR cache)', () => {
  test.beforeAll(async () => { await seedRoutine(); });

  test('dashboard shows real measurements; nutrition saves foods with correct macros and survives reload', async ({ page }) => {
    const dana = await createActiveUser({ name: 'Dana Pham' });
    await completeProfile(dana);
    await uiLogin(page, dana.username, dana.password);
    expect(await greeting(page)).toContain('Dana Pham');
    expect((await page.locator('main').innerText()).replace(/\n/g, ' ')).toMatch(/175 cm \/ 70\s*kg/);

    await nav(page, 'Nutrition');
    await expect(page.getByText('Nhật ký ăn uống & Dinh dưỡng')).toBeVisible();
    expect(page.url()).toContain('/nutrition'); // no bounce to onboarding
    await expect(page.getByText(/Không tải được/)).toHaveCount(0);

    await page.getByRole('button', { name: /Thêm món/ }).first().click();
    await page.getByRole('button', { name: /Phở bò \(1 tô/ }).click();
    const first = postTo(page, '/api/nutrition');
    await page.getByRole('button', { name: 'Lưu món ăn' }).click();
    expect((await first).status()).toBe(200);
    await expect(page.getByText('Phở bò').first()).toBeVisible();

    // a database food, two portions: calories and real macros are doubled
    await page.getByRole('button', { name: /Thêm món/ }).nth(1).click();
    await page.getByPlaceholder('VD: Phở bò, Ức gà, Cơm tấm...').fill('ức gà');
    await page.getByText(/kcal/).filter({ hasText: '220' }).first().click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    const second = postTo(page, '/api/nutrition');
    await page.getByRole('button', { name: 'Lưu món ăn' }).click();
    const sentMeals = JSON.parse((await second).request().postData()!).meals;
    const chicken = (Object.values(sentMeals).flat() as any[]).find(i => /Ức gà/.test(i.name));
    expect(chicken).toMatchObject({ calories: 440, protein: 92 });

    await page.reload();
    await expect(page.getByText('Phở bò').first()).toBeVisible();
    await expect(page.getByText(/Ức gà/).first()).toBeVisible();
  });

  test('workouts: locked until saved, tick persists with per-set progress, streak counts', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Activity');
    await expect(page.getByText('Bench Press').first()).toBeVisible();
    await expect(page.getByText('Triceps Pushdown', { exact: true })).toBeVisible();
    expect(await page.locator('button[title^="Vui lòng bấm LƯU"]').count()).toBeGreaterThanOrEqual(3);

    const saved = postTo(page, '/api/workouts');
    await page.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ }).click();
    expect((await saved).status()).toBe(200);

    const ticked = postTo(page, '/api/workouts');
    await page.locator('button[title="Đánh dấu hoàn thành"]').first().click();
    const tick = await ticked;
    const sent = JSON.parse(tick.request().postData()!);
    expect(tick.status()).toBe(200);
    expect(sent.completedIds).toHaveLength(1);
    expect(Object.values(sent.detailsMap).some((d: any) => (d.completedSets || []).length === 3)).toBe(true);
    await expect(page.getByText(/1 Ngày/).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Bench Press').first()).toBeVisible();
    await expect(page.locator('button[title="Đánh dấu hoàn thành"]')).toHaveCount(3); // unlocked after reload
    await expect(page.getByText('✓').first()).toBeVisible();
    await expect(page.getByText(/1 Ngày/).first()).toBeVisible();
  });

  test('log out and in as someone else: no data leaks between accounts', async ({ page }) => {
    const dana = await createActiveUser({ name: 'Dana Pham' });
    const eli = await createActiveUser({ name: 'Eli Vu' });
    await completeProfile(dana);
    await completeProfile(eli, { gender: 'Nữ', height: 160, weight: 52, goal: 'Giảm mỡ' });

    await uiLogin(page, dana.username, dana.password);
    await nav(page, 'Nutrition');
    await page.getByRole('button', { name: /Thêm món/ }).first().click();
    await page.getByRole('button', { name: /Phở bò \(1 tô/ }).click();
    const done = postTo(page, '/api/nutrition');
    await page.getByRole('button', { name: 'Lưu món ăn' }).click();
    await done;
    await nav(page, 'Activity');
    await page.getByRole('button', { name: /LƯU & BẮT ĐẦU TẬP/ }).click();
    await page.locator('button[title="Đánh dấu hoàn thành"]').first().click();
    await expect(page.getByText(/1 Ngày/).first()).toBeVisible();

    await page.locator('aside').getByRole('button', { name: /Đăng xuất/ }).click();
    await page.waitForURL(`${BASE}/`);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

    await uiLogin(page, eli.username, eli.password);
    const g = await greeting(page);
    expect(g).toContain('Eli Vu');
    expect(g).not.toContain('Dana');
    expect((await page.locator('main').innerText()).replace(/\n/g, ' ')).toMatch(/160 cm \/ 52\s*kg/);

    await nav(page, 'Nutrition');
    await expect(page.getByText('Nhật ký ăn uống & Dinh dưỡng')).toBeVisible();
    await page.waitForTimeout(1200); // let any (wrongly) cached data render
    expect(await page.locator('main').innerText()).not.toContain('Phở bò (1 tô');

    await nav(page, 'Activity');
    await expect(page.getByText('Bench Press').first()).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.getByText(/0 Ngày/).first()).toBeVisible();
    await expect(page.getByText(/1 Ngày/)).toHaveCount(0);
  });

  test('a rejected session (401) logs the user out to /login and removes the bad token', async ({ page }) => {
    await page.goto('/login');
    await page.context().clearCookies(); // the server prefers the cookie over the Bearer header
    await page.evaluate(() => localStorage.setItem('token', 'not-a-valid-token'));
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
});
