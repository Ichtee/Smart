// The only code that knows the YouTube/SoundCloud URL shapes and their oEmbed endpoints (no API key, no quota).

class MusicError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'MusicError';
    this.status = status;
  }
}

const UNSUPPORTED = 'Chỉ hỗ trợ link YouTube hoặc SoundCloud.';
const NOT_FOUND = 'Không tìm thấy bài này (link sai hoặc đã bị xoá).';
const NOT_EMBEDDABLE = 'Bài này không cho phép phát trên web khác.';
const LOOKUP_FAILED = 'Không lấy được thông tin bài, vui lòng thử lại.';

const MAX_LINK_LENGTH = 500;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const SOUNDCLOUD_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const youtubeLink = (videoId) => ({ source: 'youtube', url: `https://www.youtube.com/watch?v=${videoId}`, videoId });

// -> { source, url (canonical, no query/hash), videoId? (YouTube only) }; throws MusicError(400).
// Hosts are matched exactly, never with includes(), so look-alike domains cannot pass.
const parseMusicLink = (input) => {
  if (typeof input !== 'string' || input.length > MAX_LINK_LENGTH) throw new MusicError(400, UNSUPPORTED);
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new MusicError(400, UNSUPPORTED);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new MusicError(400, UNSUPPORTED);

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter(Boolean);

  let videoId = null;
  if (host === 'youtu.be') videoId = segments[0];
  else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === 'watch') videoId = parsed.searchParams.get('v');
    else if (segments[0] === 'shorts') videoId = segments[1];
  }
  if (videoId !== null) {
    if (!VIDEO_ID.test(videoId || '')) throw new MusicError(400, UNSUPPORTED);
    return youtubeLink(videoId);
  }

  if (SOUNDCLOUD_HOSTS.has(host) && segments.length === 2) {
    return { source: 'soundcloud', url: `https://soundcloud.com/${segments[0]}/${segments[1]}` };
  }
  throw new MusicError(400, UNSUPPORTED);
};

const OEMBED = {
  youtube: 'https://www.youtube.com/oembed',
  soundcloud: 'https://soundcloud.com/oembed',
};

// -> { title, author, thumbnail } from the provider's oEmbed; throws MusicError(422 | 502).
// Done server-side because YouTube's oEmbed sends no CORS headers.
const fetchOEmbed = async ({ source, url }) => {
  let res;
  try {
    res = await fetch(`${OEMBED[source]}?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(10000) });
  } catch (err) {
    console.error('oEmbed request failed:', err.message);
    throw new MusicError(502, LOOKUP_FAILED);
  }
  if (!res.ok) {
    console.error('oEmbed error status:', res.status);
    if (res.status === 400 || res.status === 404) throw new MusicError(422, NOT_FOUND);
    if (res.status === 401 || res.status === 403) throw new MusicError(422, NOT_EMBEDDABLE);
    throw new MusicError(502, LOOKUP_FAILED);
  }
  const body = await res.json().catch(() => ({}));
  // limits mirror models/MusicTrack.js; a title over the limit must not turn into a failed save
  const thumbnail = String(body.thumbnail_url || '');
  return {
    title: String(body.title || url).slice(0, 300),
    author: String(body.author_name || '').slice(0, 200),
    thumbnail: thumbnail.length <= 1000 ? thumbnail : '',
  };
};

module.exports = { parseMusicLink, fetchOEmbed, MusicError };
