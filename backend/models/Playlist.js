const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
  // play order; a track can be in several playlists
  trackIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MusicTrack' }],
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
