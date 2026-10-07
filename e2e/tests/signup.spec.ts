import { test, expect } from '@playwright/test';
import { BASE, api, loginApi, lastMail, mailsFor, newUser, formAlert, uiLogin } from '../support';

test.describe('sign-up: pre-registration hijack is blocked', () => {
  test("an attacker's pending sign-up cannot be used once the mailbox owner finishes sign-up", async ({ page }) => {
    const victim = newUser({ name: 'Victim Real' });

    // the attacker registers the victim's address (accepted: it is just a pending sign-up) and tries to choose a password
    const attacker = await api('/api/users/register', { name: 'Attacker', username: `atk${victim.username}`, email: victim.email, password: 'attackerpass1' });
    expect(attacker.status).toBe(201);

    // the real owner tries to sign up with the same email and is told it is pending
    await page.goto('/register');
    await page.getByPlaceholder('Nhập họ và tên...').fill(victim.name);
    await page.getByPlaceholder('Chọn username...').fill(victim.username);
    await page.getByPlaceholder('name@example.com...').fill(victim.email);
    await page.getByRole('button', { name: /Đăng ký/ }).click();
    await expect(page.getByText(/đang chờ xác thực/)).toBeVisible();
    await expect(page.getByPlaceholder('Chọn username...')).toHaveValue(victim.username); // typed values kept

    // the attacker's password is useless while the account is unverified
    expect((await loginApi(`atk${victim.username}`, 'attackerpass1')).status).toBe(403);

    // the mailbox owner opens the link from THEIR mailbox and chooses a password
    const mail = await lastMail(victim.email, '/verify');
    await page.goto(mail.template_params.verify_url);
    await page.locator('#new-password').fill('victim-own-password1');
    await page.locator('#confirm-password').fill('victim-own-password1');
    await page.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ }).click();
    await expect(page.getByText('Thành công!')).toBeVisible();

    expect((await loginApi(`atk${victim.username}`, 'attackerpass1')).status).toBe(401);
    expect((await loginApi(`atk${victim.username}`, 'victim-own-password1')).status).toBe(200);
  });
});

test.describe('sign-up: the normal path', () => {
  test('register → e-mail link → choose password → login by e-mail → onboarding → dashboard', async ({ page }) => {
    const alice = newUser({ name: 'Alice Nguyen', password: 'alice-password-1' });

    await page.goto('/register');
    await expect(page.locator('input[type="password"]')).toHaveCount(0); // the password is chosen after verifying the e-mail
    await page.getByPlaceholder('Nhập họ và tên...').fill(alice.name);
    await page.getByPlaceholder('Chọn username...').fill(alice.username);
    await page.getByPlaceholder('name@example.com...').fill(alice.email.replace('example', 'Example').replace(/^./, c => c.toUpperCase())); // mixed case on purpose
    await page.getByRole('button', { name: /Đăng ký/ }).click();
    await expect(page.getByText('Xác minh Email')).toBeVisible();

    const mail = await lastMail(alice.email);
    expect(mail, 'verification mail captured for the lower-cased address').toBeTruthy();
    const link = mail.template_params.verify_url;
    expect(link.startsWith(`${BASE}/verify?token=`)).toBe(true);

    // logging in before activating explains why it fails
    await page.goto('/login');
    await page.getByLabel('Tên đăng nhập / Email').fill(alice.username);
    await page.getByLabel('Mật khẩu').fill('whatever-123');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/chưa được kích hoạt/)).toBeVisible();

    // the link shows who is activating, and merely opening it does not activate
    await page.goto(link);
    await expect(page.getByText(alice.name)).toBeVisible();
    await expect(page.getByText(alice.email)).toBeVisible();
    expect((await loginApi(alice.username, alice.password)).status).toBe(403);

    await page.locator('#new-password').fill('password123');
    await page.locator('#confirm-password').fill('password124');
    await page.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ }).click();
    await expect(formAlert(page)).toContainText('không khớp');

    await page.locator('#new-password').fill('short');
    await page.locator('#confirm-password').fill('short');
    await page.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ }).click();
    await expect(formAlert(page)).toContainText('8 đến 100');

    await page.locator('#new-password').fill(alice.password);
    await page.locator('#confirm-password').fill(alice.password);
    await page.getByRole('button', { name: /Đặt mật khẩu & kích hoạt/ }).click();
    await expect(page.getByText('Thành công!')).toBeVisible();

    // single use
    await page.goto(link);
    await expect(page.getByText('Xác thực thất bại')).toBeVisible();

    // login with the e-mail (typed in another case) lands a new user on onboarding
    await uiLogin(page, alice.email.toUpperCase(), alice.password, /\/onboarding/);
    await page.getByRole('button', { name: 'Nữ' }).click();
    await page.getByLabel('Độ tuổi').fill('28');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByLabel(/Chiều cao/).fill('165');
    await page.getByLabel(/Cân nặng/).fill('58');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await page.getByRole('button', { name: /Hoàn tất/ }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText(/Welcome Back/)).toContainText(alice.name);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();
  });

  test('a link opened after it expired is refused', async ({ page }) => {
    const user = newUser();
    await api('/api/users/register', { name: user.name, username: user.username, email: user.email });
    const mail = await lastMail(user.email, '/verify');
    await api('/__e2e/expire-pending', {});
    await page.goto(mail.template_params.verify_url);
    await expect(page.getByText('Xác thực thất bại')).toBeVisible();
    expect((await loginApi(user.username, 'anything-1234')).status).not.toBe(200);
  });

  test('registering twice with a pending e-mail does not send a second mail', async ({ page }) => {
    const user = newUser();
    await api('/api/users/register', { name: user.name, username: user.username, email: user.email });
    const before = (await mailsFor(user.email)).length;
    await page.goto('/register');
    await page.getByPlaceholder('Nhập họ và tên...').fill(user.name);
    await page.getByPlaceholder('Chọn username...').fill(`${user.username}b`);
    await page.getByPlaceholder('name@example.com...').fill(user.email);
    await page.getByRole('button', { name: /Đăng ký/ }).click();
    await expect(page.getByText(/đang chờ xác thực/)).toBeVisible();
    expect((await mailsFor(user.email)).length).toBe(before);
  });
});
