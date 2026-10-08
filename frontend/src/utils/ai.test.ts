import { beforeEach, describe, expect, test, vi } from 'vitest';
import { postAi } from './ai';
import { apiFetch } from './api';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
});

describe('postAi', () => {
  test('posts JSON with no retries and returns parsed body', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ reply: 'hi' }));
    await expect(postAi('/api/ai/chat', { messages: [] })).resolves.toEqual({ reply: 'hi' });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [] }) },
      0,
    );
  });

  test('throws the server message', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ message: 'AI đang quá tải' }, 503));
    await expect(postAi('/api/ai/chat', {})).rejects.toThrow('AI đang quá tải');
  });

  test('falls back to HTTP <status> when the error body has no message', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(postAi('/api/ai/chat', {})).rejects.toThrow('HTTP 502');
  });
});
