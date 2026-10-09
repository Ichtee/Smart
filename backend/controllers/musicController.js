const mongoose = require('mongoose');
const MusicTrack = require('../models/MusicTrack');
const Playlist = require('../models/Playlist');
const { parseMusicLink, fetchOEmbed, MusicError } = require('../utils/musicLinks');

const MAX_TRACKS_PER_USER = 200;

const handleError = (res, err, label) => {
  if (err instanceof MusicError) return res.status(err.status).json({ message: err.message });
  if (err && err.code === 11000) return res.status(409).json({ message: 'Bài này đã có trong thư viện.' });
  console.error(`${label} error:`, err);
  return res.status(500).json({ message: 'Server error' });
};

// A track as the client sees it (never the owner)
const toJson = ({ _id, source, url, videoId, title, author, thumbnail, createdAt }) =>
  ({ _id, source, url, videoId, title, author, thumbnail, createdAt });

// Metadata always comes from the provider, never from the client.
const resolve = async (input) => {
  const link = parseMusicLink(input);
  return { ...link, ...(await fetchOEmbed(link)) };
};

// @desc    Look up a pasted link (nothing is saved)
// @route   POST /api/music/preview
// @access  Private
const preview = async (req, res) => {
  try {
    const { source, url, videoId, title, author, thumbnail } = await resolve(req.body.url);
    return res.status(200).json({ source, url, videoId: videoId || '', title, author, thumbnail });
  } catch (err) {
    return handleError(res, err, 'preview');
  }
};

// @desc    The current user's library, in the order tracks were added
// @route   GET /api/music/tracks
// @access  Private
const listTracks = async (req, res) => {
  try {
    const tracks = await MusicTrack.find({ user: req.user._id }).sort({ createdAt: 1, _id: 1 });
    return res.status(200).json(tracks.map(toJson));
  } catch (err) {
    return handleError(res, err, 'listTracks');
  }
};

// @desc    Add a link to the library
// @route   POST /api/music/tracks
// @access  Private
const addTrack = async (req, res) => {
  try {
    const link = parseMusicLink(req.body.url);
    if (await MusicTrack.countDocuments({ user: req.user._id }) >= MAX_TRACKS_PER_USER) {
      return res.status(400).json({ message: `Thư viện tối đa ${MAX_TRACKS_PER_USER} bài.` });
    }
    if (await MusicTrack.exists({ user: req.user._id, url: link.url })) {
      return res.status(409).json({ message: 'Bài này đã có trong thư viện.' });
    }
    const meta = await fetchOEmbed(link);
    const track = await MusicTrack.create({
      user: req.user._id, source: link.source, url: link.url, videoId: link.videoId || '', ...meta,
    });
    return res.status(201).json(toJson(track));
  } catch (err) {
    return handleError(res, err, 'addTrack');
  }
};

// @desc    Remove one of the current user's tracks
// @route   DELETE /api/music/tracks/:id
// @access  Private (owner)
const deleteTrack = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Id không hợp lệ.' });
    const result = await MusicTrack.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Không tìm thấy bài.' });
    await Playlist.updateMany({ user: req.user._id }, { $pull: { trackIds: req.params.id } });
    return res.status(200).json({ id: req.params.id });
  } catch (err) {
    return handleError(res, err, 'deleteTrack');
  }
};

const MAX_PLAYLISTS_PER_USER = 30;
const MAX_PLAYLIST_NAME = 60;
const BAD_NAME = `Tên playlist từ 1 đến ${MAX_PLAYLIST_NAME} ký tự.`;
const BAD_TRACKS = 'Danh sách bài không hợp lệ.';

const playlistJson = ({ _id, name, trackIds, createdAt }) => ({ _id, name, trackIds: trackIds.map(String), createdAt });

// -> the trimmed name, or null when it is not 1..60 characters of text
const cleanName = (value) => {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.length >= 1 && name.length <= MAX_PLAYLIST_NAME ? name : null;
};

// @desc    The current user's playlists, oldest first
// @route   GET /api/music/playlists
// @access  Private
const listPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id }).sort({ createdAt: 1, _id: 1 });
    return res.status(200).json(playlists.map(playlistJson));
  } catch (err) {
    return handleError(res, err, 'listPlaylists');
  }
};

// @desc    Create an empty playlist
// @route   POST /api/music/playlists
// @access  Private
const createPlaylist = async (req, res) => {
  try {
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ message: BAD_NAME });
    if (await Playlist.countDocuments({ user: req.user._id }) >= MAX_PLAYLISTS_PER_USER) {
      return res.status(400).json({ message: `Tối đa ${MAX_PLAYLISTS_PER_USER} playlist.` });
    }
    const playlist = await Playlist.create({ user: req.user._id, name });
    return res.status(201).json(playlistJson(playlist));
  } catch (err) {
    return handleError(res, err, 'createPlaylist');
  }
};

// @desc    Rename a playlist and/or replace its track list (this is also how tracks are added, removed and reordered)
// @route   PATCH /api/music/playlists/:id
// @access  Private (owner)
const updatePlaylist = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Id không hợp lệ.' });
    const { name, trackIds } = req.body;
    if (name === undefined && trackIds === undefined) return res.status(400).json({ message: 'Không có gì để cập nhật.' });

    const changes = {};
    if (name !== undefined) {
      changes.name = cleanName(name);
      if (!changes.name) return res.status(400).json({ message: BAD_NAME });
    }
    if (trackIds !== undefined) {
      const valid = Array.isArray(trackIds) && trackIds.length <= MAX_TRACKS_PER_USER
        && trackIds.every(id => typeof id === 'string' && mongoose.isValidObjectId(id))
        && new Set(trackIds).size === trackIds.length
        && await MusicTrack.countDocuments({ user: req.user._id, _id: { $in: trackIds } }) === trackIds.length;
      if (!valid) return res.status(400).json({ message: BAD_TRACKS });
      changes.trackIds = trackIds;
    }

    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      changes,
      { returnDocument: 'after', runValidators: true },
    );
    if (!playlist) return res.status(404).json({ message: 'Không tìm thấy playlist.' });
    return res.status(200).json(playlistJson(playlist));
  } catch (err) {
    return handleError(res, err, 'updatePlaylist');
  }
};

// @desc    Delete a playlist (its tracks stay in the library)
// @route   DELETE /api/music/playlists/:id
// @access  Private (owner)
const deletePlaylist = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Id không hợp lệ.' });
    const result = await Playlist.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Không tìm thấy playlist.' });
    return res.status(200).json({ id: req.params.id });
  } catch (err) {
    return handleError(res, err, 'deletePlaylist');
  }
};

module.exports = { preview, listTracks, addTrack, deleteTrack, listPlaylists, createPlaylist, updatePlaylist, deletePlaylist };
