const { parseMusicLink, fetchOEmbed, MusicError } = require('../utils/musicLinks');

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const SC = 'https://soundcloud.com/forss/flickermood';

describe('parseMusicLink', () => {
  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=30',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=abc',
    'https://youtu.be/dQw4w9WgXcQ?si=xyz',
    'http://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    '  https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=5  ',
  ])('canonicalises link variants: %s', (input) => {
    expect(parseMusicLink(input)).toEqual({ source: 'youtube', url: YT, videoId: 'dQw4w9WgXcQ' });
  });

  test.each([
    'https://soundcloud.com/forss/flickermood',
    'https://m.soundcloud.com/forss/flickermood?in=x#t=1',
    'https://www.soundcloud.com/forss/flickermood/',
  ])('canonicalises SoundCloud variants: %s', (input) => {
    expect(parseMusicLink(input)).toEqual({ source: 'soundcloud', url: SC });
  });

  test.each([
    ['javascript scheme', 'javascript:alert(1)'],
    ['look-alike path on another host', 'https://evil.com/watch?v=dQw4w9WgXcQ'],
    ['look-alike subdomain', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'],
    ['look-alike prefix', 'https://notyoutube.com/watch?v=dQw4w9WgXcQ'],
    ['empty string', ''],
    ['a number', 123],
    ['not a url', 'not a url'],
    ['id too short', 'https://www.youtube.com/watch?v=abc'],
    ['id too long', 'https://www.youtube.com/watch?v=dQw4w9WgXcQQ'],
    ['id with bad characters', 'https://www.youtube.com/watch?v=dQw4w9Wg!cQ'],
    ['youtube home page', 'https://www.youtube.com/'],
    ['soundcloud profile, not a track', 'https://soundcloud.com/forss'],
    ['soundcloud with three segments', 'https://soundcloud.com/forss/sets/album'],
    ['over 500 characters', `https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=${'a'.repeat(500)}`],
  ])('rejects %s', (_name, input) => {
    expect(() => parseMusicLink(input)).toThrow(MusicError);
    try { parseMusicLink(input); } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toBe('Chỉ hỗ trợ link YouTube hoặc SoundCloud.');
    }
  });
});

describe('fetchOEmbed', () => {
  let fetchSpy;
  let errorSpy;
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { fetchSpy.mockRestore(); errorSpy.mockRestore(); });

  const ok = (body) => ({ ok: true, status: 200, json: async () => body });
  const fail = (status) => ({ ok: false, status, json: async () => ({}) });
  const yt = { source: 'youtube', url: YT, videoId: 'dQw4w9WgXcQ' };
  const sc = { source: 'soundcloud', url: SC };

  test('calls the YouTube oEmbed endpoint with the canonical url', async () => {
    fetchSpy.mockResolvedValue(ok({ title: 'T' }));
    await fetchOEmbed(yt);
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(YT)}`);
  });

  test('calls the SoundCloud oEmbed endpoint with the canonical url', async () => {
    fetchSpy.mockResolvedValue(ok({ title: 'T' }));
    await fetchOEmbed(sc);
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(SC)}`);
  });

  test('maps title/author_name/thumbnail_url', async () => {
    fetchSpy.mockResolvedValue(ok({ title: 'Song', author_name: 'Artist', thumbnail_url: 'https://img/x.jpg' }));
    await expect(fetchOEmbed(yt)).resolves.toEqual({ title: 'Song', author: 'Artist', thumbnail: 'https://img/x.jpg' });
  });

  test('missing fields become empty strings and the title falls back to the url', async () => {
    fetchSpy.mockResolvedValue(ok({}));
    await expect(fetchOEmbed(sc)).resolves.toEqual({ title: SC, author: '', thumbnail: '' });
  });

  test.each([
    [400, 422, 'Không tìm thấy bài này (link sai hoặc đã bị xoá).'],
    [404, 422, 'Không tìm thấy bài này (link sai hoặc đã bị xoá).'],
    [401, 422, 'Bài này không cho phép phát trên web khác.'],
    [403, 422, 'Bài này không cho phép phát trên web khác.'],
    [500, 502, 'Không lấy được thông tin bài, vui lòng thử lại.'],
  ])('maps provider status %i to %i', async (providerStatus, status, message) => {
    fetchSpy.mockResolvedValue(fail(providerStatus));
    const err = await fetchOEmbed(yt).catch(e => e);
    expect(err).toBeInstanceOf(MusicError);
    expect(err.status).toBe(status);
    expect(err.message).toBe(message);
  });

  test('maps a network error to 502', async () => {
    fetchSpy.mockRejectedValue(new Error('timeout'));
    await expect(fetchOEmbed(yt)).rejects.toMatchObject({ status: 502 });
  });
});
