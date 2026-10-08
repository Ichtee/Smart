const { generate, AiError } = require('../utils/gemini');

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
