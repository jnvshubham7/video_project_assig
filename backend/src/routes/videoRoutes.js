const express = require('express');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multerConfig');

const router = express.Router();

// Protected routes (more specific routes first)
router.post('/upload', authMiddleware, upload.single('video'), videoController.uploadVideo);
router.get('/user/myvideos', authMiddleware, videoController.getUserVideos);
router.put('/:id', authMiddleware, videoController.updateVideo);
router.put('/:id/safety', authMiddleware, videoController.updateVideoSafetyStatus);
router.post('/:id/reanalyze', authMiddleware, videoController.reanalyzeSafety);
router.delete('/:id', authMiddleware, videoController.deleteVideo);

// Public routes (less specific routes last)
router.get('/', videoController.getAllVideos);
router.get('/:id', videoController.getVideoById);

module.exports = router;
