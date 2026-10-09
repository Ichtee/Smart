const mongoose = require('mongoose');

const musicTrackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['youtube', 'soundcloud'], required: true },
  // canonical link (see utils/musicLinks.js), so the same song added twice is caught
  url: { type: String, required: true, maxlength: 500 },
  videoId: { type: String, default: '' },
  title: { type: String, required: true, maxlength: 300 },
  author: { type: String, default: '', maxlength: 200 },
  thumbnail: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });

musicTrackSchema.index({ user: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('MusicTrack', musicTrackSchema);
