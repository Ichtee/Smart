const mongoose = require('mongoose');
const MusicTrack = require('../models/MusicTrack');
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
    return res.status(200).json({ id: req.params.id });
  } catch (err) {
    return handleError(res, err, 'deleteTrack');
  }
};

module.exports = { preview, listTracks, addTrack, deleteTrack };
