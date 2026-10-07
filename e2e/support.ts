import { expect, type Page } from '@playwright/test';

// keep in sync with playwright.config.ts (importing the config here would re-run it inside every worker)
export const API = 'http://localhost:5099';
export const BASE = 'http://localhost:3100';

export interface TestUser { name: string; username: string; email: string; password: string }
export interface Mail { template_params: { to_email: string; to_name: string; verify_url: string; subject?: string }; template_id?: string }

let counter = 0;
/** Short unique lowercase token, safe for usernames and e-mail local parts. */
export const unique = (prefix = 'u') =>
  `${prefix}${Date.now().toString(36).slice(-5)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const newUser = (over: Partial<TestUser> = {}): TestUser => {
  const id = unique();
  return { name: `Test ${id}`, username: id, email: `${id}@example.com`, password: `pw-${id}-1234`, ...over };
};

export const api = (path: string, body?: unknown, token?: string, method?: string) =>
  fetch(`${API}${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

export const mailbox = async (): Promise<Mail[]> => (await fetch(`${API}/__e2e/emails`)).json();
export const mailsFor = async (email: string) => (await mailbox()).filter(m => m.template_params.to_email === email);
/** Most recent mail to this address, optionally only those whose link contains `linkPart`. */
export const lastMail = async (email: string, linkPart = '') => {
  const mails = (await mailsFor(email)).filter(m => m.template_params.verify_url.includes(linkPart));
  return mails[mails.length - 1];
};

/** Sign up and activate through the API (fixtures — not for the flow under test). */
export async function createActiveUser(over: Partial<TestUser> = {}): Promise<TestUser> {
  const user = newUser(over);
  const reg = await api('/api/users/register', { name: user.name, username: user.username, email: user.email });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${await reg.text()}`);
  const mail = await lastMail(user.email, '/verify');
  const token = mail.template_params.verify_url.split('token=')[1];
  const done = await api(`/api/users/verify/${token}`, { password: user.password });
  if (done.status !== 200) throw new Error(`activate failed: ${done.status} ${await done.text()}`);
  return user;
}

export const loginApi = async (identifier: string, password: string) => {
  const res = await api('/api/users/login', { username: identifier, password });
  return { status: res.status, body: await res.json() };
};

/** Give a user a complete profile (so login lands on the dashboard instead of onboarding). */
export async function completeProfile(user: TestUser, extra: Record<string, unknown> = {}) {
  const { body } = await loginApi(user.username, user.password);
  const res = await api('/api/users/profile', { age: 30, gender: 'Nam', height: 175, weight: 70, goal: 'Tăng cơ', activityLevel: 'Vận động vừa', ...extra }, body.token, 'PUT');
  if (!res.ok) throw new Error(`profile failed: ${res.status}`);
}

export async function createAdmin() {
  const admin = await createActiveUser({ name: 'Admin One' });
  await api('/__e2e/make-admin', { username: admin.username });
  return { admin, token: (await loginApi(admin.username, admin.password)).body.token as string };
}

/** Log in through the UI and wait for the URL to match. */
export async function uiLogin(page: Page, identifier: string, password: string, landing: RegExp = /\/dashboard/) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập / Email').fill(identifier);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(landing, { timeout: 20_000 });
}

export const greeting = async (page: Page) => ((await page.getByText(/Welcome Back/).textContent()) ?? '').trim();

/** Click a sidebar link (client-side navigation, so the SWR cache is exercised). */
export const nav = (page: Page, label: string) => page.locator('aside').getByRole('link', { name: label }).click();

/** The inline error of the current form (not Next's route announcer, which is also role=alert). */
export const formAlert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)').first();

export { expect };

/** Remove every body measurement of a user (saving a profile with a weight logs one as a side effect). */
export async function clearMetrics(token: string) {
  const list = await (await api('/api/body-metrics', undefined, token)).json();
  for (const m of list) await api(`/api/body-metrics?date=${m.date}`, undefined, token, 'DELETE');
}
