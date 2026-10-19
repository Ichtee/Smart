import { test, expect } from '@playwright/test';
import { api, createActiveUser, completeProfile, loginApi, uiLogin, nav, formAlert } from '../support';
import { seedRoutine } from './seed';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => { await seedRoutine(); });

test.describe('my own routines', () => {
  test('create in the browser, use it on the Activity page, edit, then delete', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await nav(page, 'Tập luyện');
    await page.getByRole('navigation', { name: 'Mục Tập luyện' }).getByRole('link', { name: 'Lịch tập' }).click();
    await page.waitForURL(/\/routines/);
    await expect(page.getByText(/chưa có lịch tập riêng/)).toBeVisible();

    // build a routine with one training day: today, so Activity shows it right away
    await page.getByRole('button', { name: /Tạo lịch mới/ }).click();
    await page.getByLabel('Tên lịch tập').fill('Arms Only');
    const day = page.getByRole('region', { name: todayName() });
    await day.getByRole('button', { name: 'Ngày tập' }).click();
    await day.getByLabel('Tên buổi tập').fill('Arms');
    await day.getByLabel(/Thêm bài tập/).fill('triceps');
    await day.getByRole('button', { name: /Triceps Pushdown/ }).click();
    await expect(day.getByTestId('draft-exercise')).toHaveCount(1);
    await page.getByRole('button', { name: 'Lưu lịch tập' }).click();

    await expect(page.getByText('Đã tạo lịch tập!')).toBeVisible();
    const row = page.getByTestId('my-routine');
    await expect(row).toContainText('Arms Only');
    await expect(row).toContainText('1 ngày tập · 1 bài');

    // use it: the Activity page now plans the day from it (only the one exercise, not the built-in PPL day)
    await row.getByRole('button', { name: 'Dùng lịch này' }).click();
    await expect(page.getByText(/Đang dùng lịch "Arms Only"/)).toBeVisible();
    await nav(page, 'Tập luyện');
    await expect(page.getByText('Các bài đã chọn (1)')).toBeVisible(); // the built-in day would have three
    await expect(page.getByText(/^1\.\s*Triceps Pushdown/)).toBeVisible();

    // edit: rename; the change is stored on the same routine
    await page.getByRole('navigation', { name: 'Mục Tập luyện' }).getByRole('link', { name: 'Lịch tập' }).click();
    await page.getByRole('button', { name: 'Sửa' }).click();
    await expect(page.getByLabel('Tên lịch tập')).toHaveValue('Arms Only');
    await page.getByLabel('Tên lịch tập').fill('Arms Day');
    await page.getByRole('button', { name: 'Lưu lịch tập' }).click();
    await expect(page.getByText('Đã cập nhật lịch tập!')).toBeVisible();
    await expect(page.getByTestId('my-routine')).toHaveCount(1);
    await expect(page.getByTestId('my-routine')).toContainText('Arms Day');

    // delete
    await page.getByRole('button', { name: 'Xóa lịch tập Arms Day' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(page.getByText(/chưa có lịch tập riêng/)).toBeVisible();
    const { body } = await loginApi(user.username, user.password);
    const all = await (await api('/api/routines', undefined, body.token)).json();
    expect(all.some((r: any) => r.isMine)).toBe(false);
  });

  test('invalid routines are refused in the browser; other users never see mine', async ({ page }) => {
    const owner = await createActiveUser();
    await completeProfile(owner);
    const { body: ownerAuth } = await loginApi(owner.username, owner.password);
    const created = await api('/api/routines/mine', {
      name: 'Private Plan',
      schedule: [{ day: 'Thứ 2', name: 'A', exercises: [{ exerciseName: 'Squat', muscle: 'quadriceps' }] }],
    }, ownerAuth.token);
    expect(created.status).toBe(201);

    const other = await createActiveUser();
    await completeProfile(other);
    await uiLogin(page, other.username, other.password);
    await page.goto('/routines');
    await expect(page.getByText(/chưa có lịch tập riêng/)).toBeVisible();
    await expect(page.getByText('Private Plan')).toHaveCount(0);

    let posts = 0;
    page.on('request', r => { if (r.url().includes('/api/routines/mine') && r.method() === 'POST') posts++; });
    await page.getByRole('button', { name: /Tạo lịch mới/ }).click();
    await page.getByRole('button', { name: 'Lưu lịch tập' }).click();
    await expect(formAlert(page)).toContainText('Tên lịch tập');
    await page.getByLabel('Tên lịch tập').fill('Empty Plan');
    await page.getByRole('button', { name: 'Lưu lịch tập' }).click();
    await expect(formAlert(page)).toContainText('ít nhất một ngày tập');
    expect(posts).toBe(0);
  });

  test('without a session the page sends you to login', async ({ page }) => {
    await page.goto('/routines');
    await page.waitForURL(/\/login/);
  });
});
