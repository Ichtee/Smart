// The only place that knows Gemini's HTTP shape (plain fetch, no SDK).

const BAD_REPLY = 'AI không phản hồi hợp lệ, vui lòng thử lại.';
const OVERLOADED = 'AI đang quá tải, vui lòng thử lại sau.';
const NOT_CONFIGURED = 'Tính năng AI chưa được cấu hình.';

class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

// -> the model's text (or the parsed JSON object when a schema is given); throws AiError.
// Env vars are read per call so tests can change them. Never log the request: it holds health data.
const generate = async ({ system, contents, schema, maxOutputTokens = 1024 }) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError(503, NOT_CONFIGURED);
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  const generationConfig = { maxOutputTokens };
  if (schema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = schema;
  }

  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    console.error('Gemini request failed:', err.message);
    throw new AiError(502, BAD_REPLY);
  }

  if (!res.ok) {
    console.error('Gemini error status:', res.status);
    const overloaded = res.status === 429 || res.status === 503;
    throw new AiError(overloaded ? 503 : 502, overloaded ? OVERLOADED : BAD_REPLY);
  }

  const body = await res.json().catch(() => null);
  const candidate = body && body.candidates && body.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts
    ? candidate.content.parts.map(p => p.text || '').join('')
    : '';
  if (!text) {
    console.error('Gemini returned no text:', body && body.promptFeedback && body.promptFeedback.blockReason);
    throw new AiError(502, BAD_REPLY);
  }
  if (!schema) return text;

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Gemini returned invalid JSON, finishReason:', candidate.finishReason);
    throw new AiError(502, BAD_REPLY);
  }
};

module.exports = { generate, AiError };
