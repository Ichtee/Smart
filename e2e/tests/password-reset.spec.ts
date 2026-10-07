import { test, expect } from '@playwright/test';
import { BASE, api, createActiveUser, loginApi, lastMail, mailsFor, newUser, formAlert } from '../support';

const requestLink = async (page: import('@playwright/test').Page, email: string) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Địa chỉ Email').fill(email);
  await page.getByRole('button', { name: /Gửi link đặt lại mật khẩu/ }).click();
};
const resetLinkFor = async (email: string) => (await lastMail(email, '/reset-password/')).template_params.verify_url;
const choose = async (page: import('@playwright/test').Page, pw: string, confirm = pw) => {
  await page.getByLabel(/^Mật khẩu mới/).fill(pw);
  await page.getByLabel(/^Xác nhận mật khẩu/).fill(confirm);
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
};

test.describe('forgot password', () => {
  test('a known e-mail (any case) gets a reset mail; the page confirms neutrally', async ({ page }) => {
    const user = await createActiveUser();
    await requestLink(page, `  ${user.email.toUpperCase()}  `);
    await expect(page.getByText(/Nếu email/)).toBeVisible();

    const mail = await lastMail(user.email, '/reset-password/');
    expect(mail.template_params.verify_url).toMatch(new RegExp(`^${BASE}/reset-password/[0-9a-f]{64}$`));
    expect(mail.template_id).toBe('tpl-forgot');
  });

  test('an unknown e-mail gets exactly the same page and no mail', async ({ page }) => {
    const ghost = newUser();
    await requestLink(page, ghost.email);
    await expect(page.getByText(/Nếu email/)).toBeVisible();
    expect(await mailsFor(ghost.email)).toHaveLength(0);
  });

  test('a malformed address is refused in the browser, with no request', async ({ page }) => {
    await page.goto('/forgot-password');
    let requests = 0;
    page.on('request', r => { if (r.url().includes('forgot-password') && r.method() === 'POST') requests++; });
    await page.getByLabel('Địa chỉ Email').fill('not-an-email');
    await page.getByRole('button', { name: /Gửi link đặt lại mật khẩu/ }).click();
    expect(requests).toBe(0);
  });

  test('"back to login" links work', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('link', { name: 'Đăng nhập' }).first().click();
    await page.waitForURL(/\/login/);
  });
});

test.describe('reset password', () => {
  test('full round trip: request → mail → new password → old one stops working → login with the new one', async ({ page }) => {
    const user = await createActiveUser();
    await requestLink(page, user.email);
    await expect(page.getByText(/Nếu email/)).toBeVisible();

    await page.goto(await resetLinkFor(user.email));
    await expect(page.getByLabel(/Token/)).toHaveCount(0); // the token is in the link
    await choose(page, 'brand-new-password-1');
    await expect(page.getByText(/thành công/i)).toBeVisible();
    await expect(page.getByText('Đang chuyển hướng về trang đăng nhập...')).toBeVisible();
    await page.waitForURL(/\/login/, { timeout: 10_000 }); // automatic redirect after ~2.5 s

    expect((await loginApi(user.username, user.password)).status).toBe(401);
    expect((await loginApi(user.username, 'brand-new-password-1')).status).toBe(200);
  });

  test('the link works once only', async ({ page }) => {
    const user = await createActiveUser();
    await api('/api/users/forgot-password', { email: user.email });
    const link = await resetLinkFor(user.email);

    await page.goto(link);
    await choose(page, 'first-new-password-1');
    await expect(page.getByText(/thành công/i)).toBeVisible();

    await page.goto(link);
    await choose(page, 'second-new-password-1');
    await expect(formAlert(page)).toBeVisible();
    expect((await loginApi(user.username, 'first-new-password-1')).status).toBe(200);
    expect((await loginApi(user.username, 'second-new-password-1')).status).toBe(401);
  });

  test('an expired link is refused and the password is unchanged', async ({ page }) => {
    const user = await createActiveUser();
    await api('/api/users/forgot-password', { email: user.email });
    const link = await resetLinkFor(user.email);
    await api('/__e2e/expire-reset', { email: user.email });

    await page.goto(link);
    await choose(page, 'too-late-password-1');
    await expect(formAlert(page)).toBeVisible();
    expect((await loginApi(user.username, user.password)).status).toBe(200);
  });

  test('a made-up token is refused', async ({ page }) => {
    await page.goto(`/reset-password/${'0'.repeat(64)}`);
    await choose(page, 'whatever-password-1');
    await expect(formAlert(page)).toBeVisible();
  });

  test('mismatching and too-short passwords are refused before any request', async ({ page }) => {
    await page.goto(`/reset-password/${'1'.repeat(64)}`);
    let posts = 0;
    page.on('request', r => { if (r.url().includes('/reset-password/') && r.method() === 'POST') posts++; });

    await page.getByLabel(/^Mật khẩu mới/).fill('longenough-1');
    await page.getByLabel(/^Xác nhận mật khẩu/).fill('different-1');
    await expect(page.getByText('Mật khẩu không khớp')).toBeVisible(); // live hint
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(formAlert(page)).toContainText('không khớp');

    await choose(page, 'short');
    await expect(formAlert(page)).toBeVisible();
    expect(posts).toBe(0);
  });

  test('the older ?token= link and the paste-a-token form both work', async ({ page }) => {
    const user = await createActiveUser();
    await api('/api/users/forgot-password', { email: user.email });
    const token = (await resetLinkFor(user.email)).split('/reset-password/')[1];

    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByLabel(/Token/)).toHaveCount(0);

    // no token in the URL: the user pastes it
    await page.goto('/reset-password');
    await page.getByLabel(/Token/).fill(`  ${token}  `);
    await choose(page, 'pasted-token-password-1');
    await expect(page.getByText(/thành công/i)).toBeVisible();
    expect((await loginApi(user.username, 'pasted-token-password-1')).status).toBe(200);
  });

  test('without any token the user is told what is missing', async ({ page }) => {
    await page.goto('/reset-password');
    await choose(page, 'some-password-123');
    await expect(formAlert(page)).toContainText('Token');
  });
});
