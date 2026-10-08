const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const NutritionLog = require('../models/NutritionLog');
const WorkoutLog = require('../models/WorkoutLog');
const { generate, AiError } = require('../utils/gemini');
const { buildUserContext } = require('../utils/aiContext');

const geminiReply = (text, extra = {}) => ({
  candidates: [{ content: { parts: [].concat(text).map(t => ({ text: t })) }, ...extra }],
});
const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });
const errResponse = (status) => ({ ok: false, status, json: async () => ({ error: { message: 'x' } }) });

describe('gemini.generate', () => {
  let fetchSpy;
  let errorSpy;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GEMINI_API_KEY = 'k';
    delete process.env.GEMINI_MODEL;
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => { fetchSpy.mockRestore(); errorSpy.mockRestore(); });

  const call = (opts = {}) => generate({ system: 'S', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], ...opts });
  const sentBody = () => JSON.parse(fetchSpy.mock.calls[0][1].body);

  test('sends key header, model URL and system instruction', async () => {
    fetchSpy.mockResolvedValue(okResponse(geminiReply('a')));
    await call();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('models/gemini-3.5-flash-lite:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('k');
    expect(sentBody().systemInstruction.parts[0].text).toBe('S');
  });

  test('returns text when no schema', async () => {
    fetchSpy.mockResolvedValue(okResponse(geminiReply(['a', 'b'])));
    await expect(call()).resolves.toBe('ab');
  });

  test('parses JSON when schema given', async () => {
    fetchSpy.mockResolvedValue(okResponse(geminiReply('{"x":1}')));
    await expect(call({ schema: { type: 'OBJECT' } })).resolves.toEqual({ x: 1 });
    expect(sentBody().generationConfig.responseMimeType).toBe('application/json');
  });

  test('throws 503 when key missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(call()).rejects.toMatchObject({ status: 503 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('maps Gemini 429 to 503', async () => {
    fetchSpy.mockResolvedValue(errResponse(429));
    const err = await call().catch(e => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.status).toBe(503);
    expect(err.message).toBe('AI đang quá tải, vui lòng thử lại sau.');
  });

  test.each([
    ['a safety block with no candidates', okResponse({ promptFeedback: { blockReason: 'SAFETY' } }), undefined],
    ['a Gemini 500', errResponse(500), undefined],
    ['truncated JSON output', okResponse(geminiReply('{"x":', { finishReason: 'MAX_TOKENS' })), { type: 'OBJECT' }],
  ])('throws 502 on %s', async (_name, response, schema) => {
    fetchSpy.mockResolvedValue(response);
    const err = await call({ schema }).catch(e => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.status).toBe(502);
    expect(err.message).toBe('AI không phản hồi hợp lệ, vui lòng thử lại.');
  });

  test('throws 502 when the network call fails', async () => {
    fetchSpy.mockRejectedValue(new Error('timeout'));
    await expect(call()).rejects.toMatchObject({ status: 502 });
  });
});

const today = () => new Date().toISOString().slice(0, 10);

// Mock Gemini at the network edge so the routes run for real; supertest uses http, not fetch.
const mockGemini = (...responses) => {
  const spy = jest.spyOn(global, 'fetch');
  responses.forEach(r => spy.mockResolvedValueOnce(r));
  return spy;
};
const lastGeminiBody = (spy) => JSON.parse(spy.mock.calls[spy.mock.calls.length - 1][1].body);

describe('POST /api/ai/chat', () => {
  let errorSpy;
  beforeAll(db.connect);
  beforeEach(async () => {
    await db.clear();
    process.env.GEMINI_API_KEY = 'k';
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(db.close);

  const chat = (auth, messages) => request(app).post('/api/ai/chat').set(auth).send({ messages });
  const msg = (role, text) => ({ role, text });

  test('401 without token', async () => {
    expect((await request(app).post('/api/ai/chat').send({ messages: [msg('user', 'hi')] })).status).toBe(401);
  });

  test.each([
    ['empty messages', []],
    ['more than 20 messages', Array.from({ length: 21 }, () => msg('user', 'hi'))],
    ['a text over 2000 chars', [msg('user', 'x'.repeat(2001))]],
    ['an unknown role', [msg('system', 'hi')]],
    ['a last message that is not from the user', [msg('user', 'hi'), msg('model', 'hello')]],
  ])('400 for %s and Gemini is not called', async (_name, messages) => {
    const { auth } = await createUser();
    const spy = jest.spyOn(global, 'fetch');
    const res = await chat(auth, messages);
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  test('returns the reply and sends profile + recent logs as system context', async () => {
    const { user, auth } = await createUser({ weight: 70, goal: 'Giảm cân' });
    await NutritionLog.create({
      user: user._id, date: today(),
      meals: { 'Bữa Sáng': [{ id: '1', name: 'Phở', calories: 500, protein: 25 }], 'Bữa Trưa': [], 'Bữa Tối': [], 'Ăn Vặt': [] },
    });
    const spy = mockGemini(okResponse(geminiReply('Ăn thêm đạm nhé')));

    const res = await chat(auth, [msg('user', 'Tôi nên ăn gì?')]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reply: 'Ăn thêm đạm nhé' });
    const body = lastGeminiBody(spy);
    const system = body.systemInstruction.parts[0].text;
    expect(system).toContain('70');
    expect(system).toContain('Giảm cân');
    expect(system).toContain('500');
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Tôi nên ăn gì?' }] }]);
  });

  test('passes AiError status through', async () => {
    const { auth } = await createUser();
    mockGemini(errResponse(429));
    const res = await chat(auth, [msg('user', 'hi')]);
    expect(res.status).toBe(503);
    expect(res.body.message).toBe('AI đang quá tải, vui lòng thử lại sau.');
  });
});

describe('buildUserContext', () => {
  beforeAll(db.connect);
  beforeEach(db.clear);
  afterAll(db.close);

  test('builds context for a brand-new user', async () => {
    const { user } = await createUser();
    await expect(buildUserContext(user)).resolves.toEqual(expect.any(String));
  });

  test('includes the last workout summary and leaves out empty profile fields', async () => {
    const { user } = await createUser({ weight: 80 });
    await WorkoutLog.create({ user: user._id, date: today(), routineName: 'PPL', dayName: 'Push', completedIds: ['a', 'b'], selectedIds: ['a', 'b', 'c'] });
    const text = await buildUserContext(user);
    expect(text).toContain('80');
    expect(text).toContain('PPL');
    expect(text).toContain('Push');
    expect(text).not.toMatch(/null|undefined/);
  });
});

describe('POST /api/ai/meal', () => {
  beforeAll(db.connect);
  beforeEach(async () => {
    await db.clear();
    process.env.GEMINI_API_KEY = 'k';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(db.close);

  const meal = (auth, body) => request(app).post('/api/ai/meal').set(auth).send(body);
  const items = (list) => okResponse(geminiReply(JSON.stringify({ items: list })));

  test('400 when neither text nor image', async () => {
    const { auth } = await createUser();
    expect((await meal(auth, {})).status).toBe(400);
  });

  test.each([
    ['text over 500 chars', { text: 'x'.repeat(501) }],
    ['an image that is not a base64 jpeg/png/webp data URL', { image: 'http://evil.example/a.jpg' }],
    ['an image over 1,500,000 chars', { image: `data:image/jpeg;base64,${'A'.repeat(1500001)}` }],
  ])('400 for %s and Gemini is not called', async (_name, body) => {
    const { auth } = await createUser();
    const spy = jest.spyOn(global, 'fetch');
    expect((await meal(auth, body)).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  test('sends image as inlineData without the data: prefix', async () => {
    const { auth } = await createUser();
    const spy = mockGemini(items([{ name: 'Phở', quantity: '1 tô', calories: 450 }]));
    const res = await meal(auth, { image: 'data:image/jpeg;base64,QUJD' });
    expect(res.status).toBe(200);
    expect(lastGeminiBody(spy).contents[0].parts).toContainEqual({ inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } });
  });

  test('accepts a ~1 MB image body', async () => {
    const { auth } = await createUser();
    mockGemini(items([{ name: 'Phở', quantity: '1 tô', calories: 450 }]));
    const res = await meal(auth, { image: `data:image/jpeg;base64,${'A'.repeat(1000000)}` });
    expect(res.status).toBe(200);
  });

  test('drops invalid items and rounds numbers', async () => {
    const { auth } = await createUser();
    mockGemini(items([
      { name: 'Trứng', quantity: '2 quả', calories: 155.4, protein: 12.56, carbs: 1.1, fat: 10.6 },
      { name: '', calories: 100 },
      { name: 'X', calories: -5 },
      { name: 'Y', calories: 50000 },
    ]));
    const res = await meal(auth, { text: '2 trứng' });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([{ name: 'Trứng', quantity: '2 quả', calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 }]);
  });

  test('422 when nothing recognised', async () => {
    const { auth } = await createUser();
    mockGemini(items([]));
    const res = await meal(auth, { text: 'asdf' });
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Không nhận ra món ăn nào, hãy thử mô tả rõ hơn.');
  });

  test('caps at 20 items', async () => {
    const { auth } = await createUser();
    mockGemini(items(Array.from({ length: 25 }, (_, i) => ({ name: `Món ${i}`, quantity: '1', calories: 10 }))));
    const res = await meal(auth, { text: 'nhiều món' });
    expect(res.body.items).toHaveLength(20);
  });
});
