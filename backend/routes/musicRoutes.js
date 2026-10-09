const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  preview, listTracks, addTrack, deleteTrack,
  listPlaylists, createPlaylist, updatePlaylist, deletePlaylist,
} = require('../controllers/musicController');

router.use(protect);

router.post('/preview', preview);
router.route('/tracks').get(listTracks).post(addTrack);
router.delete('/tracks/:id', deleteTrack);

router.route('/playlists').get(listPlaylists).post(createPlaylist);
router.route('/playlists/:id').patch(updatePlaylist).delete(deletePlaylist);

module.exports = router;
