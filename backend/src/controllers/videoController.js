const Video = require('../models/Video');
const cloudinary = require('cloudinary').v2;
const contentAnalysisService = require('../services/contentAnalysisService');

// Configure Cloudinary (in case it's not already configured)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Video title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Cloudinary file info from multer storage
    const cloudinaryUrl = req.file.path; // Full URL from Cloudinary
    const cloudinaryPublicId = req.file.filename; // Public ID from Cloudinary

    // Analyze video content for safety
    let safetyStatus = 'safe';
    try {
      safetyStatus = await contentAnalysisService.analyzeSafety(
        cloudinaryUrl,
        title,
        description || ''
      );
    } catch (analysisError) {
      console.error('Content analysis failed, defaulting to safe:', analysisError);
      safetyStatus = 'safe';
    }

    const video = new Video({
      title,
      description: description || '',
      filename: req.file.originalname,
      filepath: cloudinaryUrl, // Store Cloudinary URL
      cloudinaryPublicId: cloudinaryPublicId, // Store public ID for deletion
      userId: req.userId,
      size: req.file.size,
      safetyStatus: safetyStatus // Set safety status from analysis
    });

    await video.save();

    res.status(201).json({
      message: 'Video uploaded successfully to cloud storage',
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all videos for current user
exports.getUserVideos = async (req, res) => {
  try {
    const { safetyStatus } = req.query;
    let query = { userId: req.userId };

    // Build query filter for safety status
    if (safetyStatus && (safetyStatus === 'safe' || safetyStatus === 'flagged')) {
      query.safetyStatus = safetyStatus;
    }

    const videos = await Video.find(query).sort({ createdAt: -1 });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all videos (public)
exports.getAllVideos = async (req, res) => {
  try {
    const { safetyStatus } = req.query;
    let query = {};

    // Build query filter for safety status
    if (safetyStatus && (safetyStatus === 'safe' || safetyStatus === 'flagged')) {
      query.safetyStatus = safetyStatus;
    }

    const videos = await Video.find(query).populate('userId', 'username').sort({ createdAt: -1 });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get video by ID
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('userId', 'username');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment views
    video.views += 1;
    await video.save();

    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns the video
    if (video.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    // Delete from Cloudinary if public ID exists
    if (video.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video' });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update video
exports.updateVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns the video
    if (video.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this video' });
    }

    if (title) video.title = title;
    if (description) video.description = description;
    video.updatedAt = Date.now();

    await video.save();

    res.json({
      message: 'Video updated successfully',
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update video safety status (flag/unflag)
exports.updateVideoSafetyStatus = async (req, res) => {
  try {
    const { safetyStatus } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns the video
    if (video.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this video' });
    }

    // Validate safety status value
    if (!safetyStatus || !['safe', 'flagged'].includes(safetyStatus)) {
      return res.status(400).json({ error: 'Invalid safety status. Must be "safe" or "flagged"' });
    }

    video.safetyStatus = safetyStatus;
    video.updatedAt = Date.now();

    await video.save();

    res.json({
      message: `Video marked as ${safetyStatus}`,
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Re-analyze video safety (admin/owner functionality)
exports.reanalyzeSafety = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns the video
    if (video.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to reanalyze this video' });
    }

    // Run content analysis again
    let safetyStatus = 'safe';
    try {
      safetyStatus = await contentAnalysisService.analyzeSafety(
        video.filepath,
        video.title,
        video.description
      );
    } catch (analysisError) {
      console.error('Content analysis failed:', analysisError);
      return res.status(500).json({ error: 'Failed to analyze video content' });
    }

    video.safetyStatus = safetyStatus;
    video.updatedAt = Date.now();

    await video.save();

    res.json({
      message: 'Video re-analyzed successfully',
      safetyStatus: safetyStatus,
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
