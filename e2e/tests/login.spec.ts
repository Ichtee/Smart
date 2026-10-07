import { test, expect } from '@playwright/test';
import { api, createActiveUser, completeProfile, createAdmin, newUser, lastMail, mailsFor, uiLogin, formAlert } from '../support';

const submit = (page: import('@playwright/test').Page) => page.locator('form button[type="submit"]').click();
const fillForm = async (page: import('@playwright/test').Page, id: string, pw: string) => {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập / Email').fill(id);
  await page.getByLabel('Mật khẩu').fill(pw);
};

test.describe('login', () => {
  test('works with the username, the e-mail, and the e-mail in another case; each lands on the dashboard', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    for (const id of [user.username, user.email, user.email.toUpperCase(), `  ${user.email}  `]) {
      await uiLogin(page, id, user.password);
      await expect(page.getByText(/Welcome Back/)).toContainText(user.name);
      await page.evaluate(() => localStorage.clear());
      await page.context().clearCookies();
    }
  });

  test('a wrong password shows an error, stores nothing and stays on the form', async ({ page }) => {
    const user = await createActiveUser();
    await fillForm(page, user.username, 'not-the-password');
    await submit(page);
    await expect(formAlert(page)).toContainText('Invalid credentials');
    expect(page.url()).toContain('/login');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    // the fields keep what was typed, so the user can fix just the password
    await expect(page.getByLabel('Tên đăng nhập / Email')).toHaveValue(user.username);
  });

  test('an unknown account gets the same message as a wrong password (no account enumeration)', async ({ page }) => {
    const user = await createActiveUser();
    await fillForm(page, user.username, 'wrong-1234');
    await submit(page);
    const known = await formAlert(page).textContent();
    await fillForm(page, `nobody${user.username}`, 'wrong-1234');
    await submit(page);
    await expect(formAlert(page)).toHaveText(known ?? '');
  });

  test('blank fields are refused in the browser before any request', async ({ page }) => {
    await page.goto('/login');
    let requests = 0;
    page.on('request', r => { if (r.url().includes('/api/users/login')) requests++; });
    await submit(page);
    await expect(page.getByLabel('Tên đăng nhập / Email')).toBeFocused(); // native `required` validation
    expect(requests).toBe(0);
  });

  test('an account that is not activated yet: notice, resend button, and a fresh mail', async ({ page }) => {
    const user = newUser();
    await api('/api/users/register', { name: user.name, username: user.username, email: user.email });
    const before = (await mailsFor(user.email)).length;

    await fillForm(page, user.username, 'whatever-1234');
    await submit(page);
    await expect(page.getByText(/chưa được kích hoạt qua email/)).toBeVisible();
    await page.getByRole('button', { name: 'Gửi lại email xác thực' }).click();
    await expect(page.getByText(/đã được gửi lại/i)).toBeVisible();
    expect((await mailsFor(user.email)).length).toBe(before + 1);

    // the new link works
    const mail = await lastMail(user.email, '/verify');
    await page.goto(mail.template_params.verify_url);
    await page.locator('#new-password').fill('chosen-password-1');
    await page.locator('#confirm-password').fill('chosen-password-1');
    await page.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ }).click();
    await expect(page.getByText('Thành công!')).toBeVisible();
  });

  test('a new user without a complete profile is sent to onboarding', async ({ page }) => {
    const user = await createActiveUser();
    await uiLogin(page, user.username, user.password, /\/onboarding/);
  });

  test('an admin is sent to the admin area', async ({ page }) => {
    const { admin } = await createAdmin();
    await uiLogin(page, admin.username, admin.password, /\/dashboard\/admin/);
  });

  test('someone who is already signed in is redirected away from /login', async ({ page }) => {
    const user = await createActiveUser();
    await completeProfile(user);
    await uiLogin(page, user.username, user.password);
    await page.goto('/login');
    await page.waitForURL(/\/dashboard/);
  });

  test('the "forgot password" and "register" links go where they say', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();
    await page.waitForURL(/\/forgot-password/);
    await page.goBack();
    await page.getByRole('link', { name: 'Đăng ký ngay' }).click();
    await page.waitForURL(/\/register/);
  });
});
