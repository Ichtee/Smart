const request = require('supertest');
const app = require('../app');
const db = require('./helpers/db');
const { createUser } = require('./helpers/auth');
const MusicTrack = require('../models/MusicTrack');
const Playlist = require('../models/Playlist');
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

  test('over-long fields are cut to what the library can store instead of failing the save', async () => {
    fetchSpy.mockResolvedValue(ok({ title: 'T'.repeat(400), author_name: 'A'.repeat(300), thumbnail_url: `https://img/${'x'.repeat(1100)}` }));
    const meta = await fetchOEmbed(yt);
    expect(meta.title).toHaveLength(300);
    expect(meta.author).toHaveLength(200);
    expect(meta.thumbnail).toBe('');
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

describe('/api/music', () => {
  let fetchSpy;
  beforeAll(db.connect);
  beforeEach(async () => {
    await db.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ title: 'Song', author_name: 'Artist', thumbnail_url: 'https://img/x.jpg' }),
    });
  });
  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(db.close);

  const preview = (auth, body) => request(app).post('/api/music/preview').set(auth).send(body);
  const add = (auth, body) => request(app).post('/api/music/tracks').set(auth).send(body);
  const list = (auth) => request(app).get('/api/music/tracks').set(auth);
  const remove = (auth, id) => request(app).delete(`/api/music/tracks/${id}`).set(auth);

  test('401 without token on every route', async () => {
    const id = '64b64b64b64b64b64b64b64b';
    expect((await request(app).post('/api/music/preview').send({ url: YT })).status).toBe(401);
    expect((await request(app).get('/api/music/tracks')).status).toBe(401);
    expect((await request(app).post('/api/music/tracks').send({ url: YT })).status).toBe(401);
    expect((await request(app).delete(`/api/music/tracks/${id}`)).status).toBe(401);
  });

  test('preview returns metadata and saves nothing', async () => {
    const { auth } = await createUser();
    const res = await preview(auth, { url: 'https://youtu.be/dQw4w9WgXcQ?si=abc' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      source: 'youtube', url: YT, videoId: 'dQw4w9WgXcQ', title: 'Song', author: 'Artist', thumbnail: 'https://img/x.jpg',
    });
    expect(await MusicTrack.countDocuments()).toBe(0);
  });

  test("add stores the oEmbed metadata, not the client's", async () => {
    const { auth, user } = await createUser();
    const res = await add(auth, { url: YT, title: 'HACK', thumbnail: 'https://evil/x.jpg' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ source: 'youtube', url: YT, videoId: 'dQw4w9WgXcQ', title: 'Song', author: 'Artist', thumbnail: 'https://img/x.jpg' });
    expect(res.body.user).toBeUndefined();
    expect(Object.keys(res.body).sort()).toEqual(['_id', 'author', 'createdAt', 'source', 'thumbnail', 'title', 'url', 'videoId']);
    const saved = await MusicTrack.findOne({ user: user._id });
    expect(saved.title).toBe('Song');
  });

  test('add rejects a duplicate with 409, even through a different link variant', async () => {
    const { auth } = await createUser();
    expect((await add(auth, { url: YT })).status).toBe(201);
    const res = await add(auth, { url: 'https://youtu.be/dQw4w9WgXcQ?si=other' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Bài này đã có trong thư viện.');
    expect(await MusicTrack.countDocuments()).toBe(1);
  });

  test('two users can each add the same track', async () => {
    const a = await createUser();
    const b = await createUser();
    expect((await add(a.auth, { url: YT })).status).toBe(201);
    expect((await add(b.auth, { url: YT })).status).toBe(201);
  });

  test('add refuses past 200 tracks', async () => {
    const { auth, user } = await createUser();
    await MusicTrack.insertMany(Array.from({ length: 200 }, (_, i) => ({
      user: user._id, source: 'soundcloud', url: `https://soundcloud.com/a/t${i}`, title: `T${i}`,
    })));
    const res = await add(auth, { url: YT });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Thư viện tối đa 200 bài.');
    expect(await MusicTrack.countDocuments()).toBe(200);
  });

  test('list returns only my tracks in added order', async () => {
    const me = await createUser();
    const other = await createUser();
    await add(me.auth, { url: 'https://soundcloud.com/a/first' });
    await add(other.auth, { url: 'https://soundcloud.com/a/theirs' });
    await add(me.auth, { url: 'https://soundcloud.com/a/second' });
    const res = await list(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.map(t => t.url)).toEqual(['https://soundcloud.com/a/first', 'https://soundcloud.com/a/second']);
  });

  test("cannot delete another user's track", async () => {
    const owner = await createUser();
    const thief = await createUser();
    const { body: track } = await add(owner.auth, { url: YT });
    const res = await remove(thief.auth, track._id);
    expect(res.status).toBe(404);
    expect(await MusicTrack.countDocuments()).toBe(1);
  });

  test('delete removes my track', async () => {
    const { auth } = await createUser();
    const { body: track } = await add(auth, { url: YT });
    const res = await remove(auth, track._id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: track._id });
    expect(await MusicTrack.countDocuments()).toBe(0);
  });

  test('400 for an invalid id on delete', async () => {
    const { auth } = await createUser();
    expect((await remove(auth, 'not-an-id')).status).toBe(400);
  });

  test('passes MusicError status and message through', async () => {
    const { auth } = await createUser();
    const bad = await add(auth, { url: 'https://evil.com/x' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Chỉ hỗ trợ link YouTube hoặc SoundCloud.');

    fetchSpy.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const gone = await preview(auth, { url: YT });
    expect(gone.status).toBe(422);
    expect(gone.body.message).toBe('Không tìm thấy bài này (link sai hoặc đã bị xoá).');
  });
});

describe('/api/music/playlists', () => {
  beforeAll(db.connect);
  beforeEach(async () => {
    await db.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(db.close);

  const create = (auth, body) => request(app).post('/api/music/playlists').set(auth).send(body);
  const list = (auth) => request(app).get('/api/music/playlists').set(auth);
  const patch = (auth, id, body) => request(app).patch(`/api/music/playlists/${id}`).set(auth).send(body);
  const remove = (auth, id) => request(app).delete(`/api/music/playlists/${id}`).set(auth);
  const makeTracks = (user, n) => MusicTrack.insertMany(Array.from({ length: n }, (_, i) => ({
    user: user._id, source: 'soundcloud', url: `https://soundcloud.com/a/t${user._id}-${i}`, title: `T${i}`,
  })));
  const ids = (docs) => docs.map(d => String(d._id));

  test('401 without token on every playlist route', async () => {
    const id = '64b64b64b64b64b64b64b64b';
    expect((await request(app).get('/api/music/playlists')).status).toBe(401);
    expect((await request(app).post('/api/music/playlists').send({ name: 'x' })).status).toBe(401);
    expect((await request(app).patch(`/api/music/playlists/${id}`).send({ name: 'x' })).status).toBe(401);
    expect((await request(app).delete(`/api/music/playlists/${id}`)).status).toBe(401);
  });

  test('create trims the name and starts empty', async () => {
    const { auth } = await createUser();
    const res = await create(auth, { name: '  Chạy bộ  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Chạy bộ', trackIds: [] });
    expect(Object.keys(res.body).sort()).toEqual(['_id', 'createdAt', 'name', 'trackIds']);
  });

  test.each([
    ['empty', { name: '' }],
    ['blank', { name: '   ' }],
    ['61 characters', { name: 'a'.repeat(61) }],
    ['a number', { name: 5 }],
    ['missing', {}],
  ])('rejects a bad name: %s', async (_label, body) => {
    const { auth } = await createUser();
    const res = await create(auth, body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tên playlist từ 1 đến 60 ký tự.');
    expect(await Playlist.countDocuments()).toBe(0);
  });

  test('refuses past 30 playlists', async () => {
    const { auth, user } = await createUser();
    await Playlist.insertMany(Array.from({ length: 30 }, (_, i) => ({ user: user._id, name: `P${i}` })));
    const res = await create(auth, { name: 'one more' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tối đa 30 playlist.');
  });

  test('list returns only my playlists in created order', async () => {
    const me = await createUser();
    const other = await createUser();
    await create(me.auth, { name: 'first' });
    await create(other.auth, { name: 'theirs' });
    await create(me.auth, { name: 'second' });
    const res = await list(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.map(p => p.name)).toEqual(['first', 'second']);
  });

  test('patch renames', async () => {
    const { auth } = await createUser();
    const { body: made } = await create(auth, { name: 'old' });
    const res = await patch(auth, made._id, { name: ' new ' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('new');
  });

  test('patch sets trackIds in the given order', async () => {
    const { auth, user } = await createUser();
    const tracks = ids(await makeTracks(user, 3));
    const { body: made } = await create(auth, { name: 'mix' });
    const order = [tracks[2], tracks[0], tracks[1]];
    const res = await patch(auth, made._id, { trackIds: order });
    expect(res.status).toBe(200);
    expect(res.body.trackIds).toEqual(order);
    expect((await list(auth)).body[0].trackIds).toEqual(order);
    expect((await patch(auth, made._id, { trackIds: [] })).body.trackIds).toEqual([]);
  });

  test('rejects invalid trackIds and saves nothing', async () => {
    const me = await createUser();
    const other = await createUser();
    const mine = ids(await makeTracks(me.user, 2));
    const theirs = ids(await makeTracks(other.user, 1));
    const { body: made } = await create(me.auth, { name: 'mix' });
    await patch(me.auth, made._id, { trackIds: mine });

    const bad = [
      ["another user's track", [mine[0], theirs[0]]],
      ['a duplicate id', [mine[0], mine[0]]],
      ['a malformed id', ['not-an-id']],
      ['a track that does not exist', ['64b64b64b64b64b64b64b64b']],
      ['201 ids', Array.from({ length: 201 }, () => mine[0])],
      ['a non-array', 'abc'],
    ];
    for (const [, trackIds] of bad) {
      const res = await patch(me.auth, made._id, { trackIds });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Danh sách bài không hợp lệ.');
    }
    expect((await list(me.auth)).body[0].trackIds).toEqual(mine);
  });

  test('patch with an empty body is a 400', async () => {
    const { auth } = await createUser();
    const { body: made } = await create(auth, { name: 'x' });
    const res = await patch(auth, made._id, {});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Không có gì để cập nhật.');
  });

  test('patch rejects a bad name', async () => {
    const { auth } = await createUser();
    const { body: made } = await create(auth, { name: 'x' });
    expect((await patch(auth, made._id, { name: '' })).status).toBe(400);
  });

  test("cannot patch or delete another user's playlist", async () => {
    const owner = await createUser();
    const thief = await createUser();
    const { body: made } = await create(owner.auth, { name: 'mine' });
    expect((await patch(thief.auth, made._id, { name: 'stolen' })).status).toBe(404);
    expect((await remove(thief.auth, made._id)).status).toBe(404);
    const [kept] = (await list(owner.auth)).body;
    expect(kept.name).toBe('mine');
  });

  test('400 for an invalid id on patch and delete', async () => {
    const { auth } = await createUser();
    expect((await patch(auth, 'nope', { name: 'x' })).status).toBe(400);
    expect((await remove(auth, 'nope')).status).toBe(400);
  });

  test('delete removes my playlist but not its tracks', async () => {
    const { auth, user } = await createUser();
    const tracks = ids(await makeTracks(user, 2));
    const { body: made } = await create(auth, { name: 'gone' });
    await patch(auth, made._id, { trackIds: tracks });
    const res = await remove(auth, made._id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: made._id });
    expect(await Playlist.countDocuments()).toBe(0);
    expect(await MusicTrack.countDocuments({ user: user._id })).toBe(2);
  });

  test('deleting a track removes it from every playlist', async () => {
    const me = await createUser();
    const other = await createUser();
    const [a, b] = ids(await makeTracks(me.user, 2));
    const [theirs] = ids(await makeTracks(other.user, 1));
    const { body: p1 } = await create(me.auth, { name: 'one' });
    const { body: p2 } = await create(me.auth, { name: 'two' });
    const { body: p3 } = await create(other.auth, { name: 'theirs' });
    await patch(me.auth, p1._id, { trackIds: [a, b] });
    await patch(me.auth, p2._id, { trackIds: [b, a] });
    await patch(other.auth, p3._id, { trackIds: [theirs] });

    const res = await request(app).delete(`/api/music/tracks/${a}`).set(me.auth);
    expect(res.status).toBe(200);

    const mine = (await list(me.auth)).body;
    expect(mine.find(p => p._id === p1._id).trackIds).toEqual([b]);
    expect(mine.find(p => p._id === p2._id).trackIds).toEqual([b]);
    expect((await list(other.auth)).body[0].trackIds).toEqual([theirs]);
  });
});
