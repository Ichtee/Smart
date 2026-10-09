const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { preview, listTracks, addTrack, deleteTrack } = require('../controllers/musicController');

router.use(protect);

router.post('/preview', preview);
router.route('/tracks').get(listTracks).post(addTrack);
router.delete('/tracks/:id', deleteTrack);

module.exports = router;
