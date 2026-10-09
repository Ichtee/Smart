// Measures how far each page overflows the visible area, on an account that has real data.
//
//   node e2e/tools/fit-check.mjs [--route=/nutrition] [--viewport=1920x950] [--theme=light]
//        [--big-routine] [--many-foods] [--many-metrics]
//
// Needs (not started here): the e2e backend on :5099 and `next dev` on :3100 pointed at it:
//   node harness/backend.js ../backend 5099 http://localhost:3100            (from e2e/)
//   NEXT_PUBLIC_API_URL=http://localhost:5099 npm run dev -- -p 3100         (from frontend/)
// Exit code 1 if a route overflows vertically at 1920x950 or horizontally at any viewport.
import { chromium } from 'playwright';

const API = 'http://localhost:5099';
const BASE = 'http://localhost:3100';
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name) => process.argv.includes(`--${name}`);

const ROUTES = arg('route')
  ? [arg('route')]
  : ['/dashboard', '/workouts', '/nutrition', '/body', '/profile', '/routines', '/records', '/volume', '/music', '/coach'];
const VIEWPORTS = (arg('viewport') ? [arg('viewport')] : ['1920x950', '1366x768', '390x844']).map((v) => v.split('x').map(Number));
const STRICT = '1920x950';

const api = async (path, body, token, method) => {
  const verb = method ?? (body ? 'POST' : 'GET');
  const res = await fetch(API + path, {
    method: verb,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${verb} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
};

const dayStr = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const uid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);

async function createActiveUser(name) {
  const id = uid();
  const user = { name, username: `fit${id}`, email: `fit${id}@example.com`, password: `pw-${id}-1234` };
  await api('/api/users/register', { name: user.name, username: user.username, email: user.email });
  const mails = await (await fetch(`${API}/__e2e/emails`)).json();
  const mail = [...mails].reverse().find((m) => m.template_params.to_email === user.email);
  await api(`/api/users/verify/${mail.template_params.verify_url.split('token=')[1]}`, { password: user.password });
  return user;
}
const login = async (u) => (await api('/api/users/login', { username: u.username, password: u.password })).token;

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const MUSCLES = ['chest', 'back', 'quads', 'shoulders', 'biceps', 'triceps', 'hamstrings', 'abs'];

async function seed() {
  // an admin builds the exercise library and two routines (6 and 15 exercises per day)
  const admin = await createActiveUser('Fit Admin');
  await api('/__e2e/make-admin', { username: admin.username });
  const adminToken = await login(admin);
  // the backend keeps running between runs, so reuse what an earlier run already created
  const known = await api('/api/exercises', undefined, adminToken);
  const haveRoutines = new Set((await api('/api/routines')).map((r) => r.id));
  const ex = [];
  for (let i = 0; i < 15; i++) {
    const name = `Exercise ${i + 1}`;
    const muscle = MUSCLES[i % MUSCLES.length];
    const found = known.find((e) => e.name === name);
    const created = found ?? await api('/api/exercises', { name, muscle, defaultSets: 3, defaultReps: '10', equipment: 'Barbell' }, adminToken);
    ex.push({ id: created._id, name, muscle });
  }
  for (const [id, count] of [['ppl', 6], ['big', 15]]) {
    if (haveRoutines.has(id)) continue;
    await api('/api/routines', {
      id, name: id === 'ppl' ? 'Push Pull Legs' : 'Big Routine', type: 'PPL', frequencyDaysPerWeek: 7,
      schedule: DAYS.map((day) => ({
        day, name: 'Push', isRestDay: false,
        targets: [{ id: 'chest', label: 'Ngực', count: 2 }],
        exercises: ex.slice(0, count).map((e) => ({ exerciseId: e.id, exerciseName: e.name, muscle: e.muscle, sets: 3, repsRange: '10', rir: '1', restTimeSeconds: 60 })),
      })),
    }, adminToken);
  }

  // the account that is measured
  const user = await createActiveUser('Fit User');
  const token = await login(user);
  await api('/api/users/profile', {
    age: 30, gender: 'Nam', height: 175, weight: 70, goal: 'Tăng cơ', activityLevel: 'Vận động vừa',
    lastActiveRoutineId: flag('big-routine') ? 'big' : 'ppl',
  }, token, 'PUT');

  const foods = (n) => Array.from({ length: n }, (_, i) => ({ id: `${Math.random()}`, name: `Món ăn ${i + 1}`, calories: 150 + i * 10, protein: 10, carbs: 20, fat: 5, quantity: '1 phần' }));
  const six = ex.slice(0, 6);
  for (let d = 0; d >= -6; d--) {
    await api('/api/nutrition', {
      date: dayStr(d), waterGlasses: 5, mlPerGlass: 250,
      meals: { 'Bữa Sáng': foods(4), 'Bữa Trưa': foods(flag('many-foods') && d === 0 ? 15 : 4), 'Bữa Tối': foods(4), 'Ăn Vặt': foods(3) },
    }, token);
    await api('/api/workouts', {
      date: dayStr(d), isSaved: true, selectedIds: six.map((e) => e.id), completedIds: six.map((e) => e.id),
      exercises: six.map((e) => ({ id: e.id, name: e.name, sets: 3, reps: '10', completed: true })),
      detailsMap: Object.fromEntries(six.map((e) => [e.id, { sets: 3, reps: '10', completedSets: [0, 1, 2], setWeights: { 0: 50, 1: 50, 2: 50 } }])),
    }, token);
  }
  const metrics = flag('many-metrics') ? 50 : 10;
  for (let i = 0; i < metrics; i++) await api('/api/body-metrics', { date: dayStr(-i * 2), weight: 70 + (i % 5) * 0.3 }, token);
  return user;
}

const measure = () => {
  const main = document.querySelector('main');
  const root = document.documentElement;
  return {
    // old pages grow with their content (the document scrolls); AppShell pages scroll inside <main>
    overflow: Math.max(0, root.scrollHeight - innerHeight, main ? main.scrollHeight - main.clientHeight : 0),
    horizontal: Math.max(0, root.scrollWidth - root.clientWidth, main ? main.scrollWidth - main.clientWidth : 0),
  };
};

const user = await seed();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ locale: 'vi-VN' });
if (arg('theme') === 'light') await page.addInitScript(() => localStorage.setItem('theme', 'light'));
await page.setViewportSize({ width: 1920, height: 950 });
await page.goto(`${BASE}/login`);
await page.locator('input[type=text]').first().fill(user.username);
await page.locator('input[type=password]').first().fill(user.password);
await page.locator('form button[type=submit]').click();
await page.waitForURL(/\/dashboard/, { timeout: 30000 });

let failed = false;
for (const [w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h });
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(700);
    const m = await page.evaluate(measure);
    const vp = `${w}x${h}`;
    if (m.horizontal > 0 || (vp === STRICT && m.overflow > 0)) failed = true;
    console.log(`${vp} ${route} overflow=${m.overflow} horizontal=${m.horizontal}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
