const Video = require('../models/Video');
const cloudinary = require('cloudinary').v2;

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

    const video = new Video({
      title,
      description: description || '',
      filename: req.file.originalname,
      filepath: cloudinaryUrl, // Store Cloudinary URL
      cloudinaryPublicId: cloudinaryPublicId, // Store public ID for deletion
      userId: req.userId,
      size: req.file.size
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
    const videos = await Video.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all videos (public)
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find().populate('userId', 'username').sort({ createdAt: -1 });
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
