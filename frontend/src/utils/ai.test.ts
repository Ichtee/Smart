import { beforeEach, describe, expect, test, vi } from 'vitest';
import { postAi, resizeImage } from './ai';
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

describe('resizeImage', () => {
  test('scales the longer side to 1024', async () => {
    const drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toDataURL: vi.fn(() => 'data:image/jpeg;base64,QUJD') };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close: vi.fn() })));

    await expect(resizeImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).resolves.toBe('data:image/jpeg;base64,QUJD');
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    vi.restoreAllMocks();
  });

  test('does not enlarge a small image', async () => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toDataURL: () => 'data:image/jpeg;base64,QUJD' };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 400, height: 300, close: vi.fn() })));

    await resizeImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    expect([canvas.width, canvas.height]).toEqual([400, 300]);
    vi.restoreAllMocks();
  });
});
