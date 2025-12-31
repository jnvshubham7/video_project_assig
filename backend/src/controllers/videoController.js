const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// Upload video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      // Delete uploaded file if title is missing
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Video title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const video = new Video({
      title,
      description: description || '',
      filename: req.file.filename,
      filepath: `/uploads/videos/${req.file.filename}`,
      userId: req.userId,
      size: req.file.size
    });

    await video.save();

    res.status(201).json({
      message: 'Video uploaded successfully',
      video
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads/videos', video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
