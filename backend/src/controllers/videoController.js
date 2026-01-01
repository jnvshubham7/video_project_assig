const Video = require('../models/Video');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const VideoProcessingService = require('../services/videoProcessingService');

// Configure Cloudinary (in case it's not already configured)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload video with organization isolation
 * Only ADMIN and EDITOR roles can upload
 */
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, isPublic } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Video title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Check role-based permission: only admin and editor can upload
    if (req.userRole !== 'admin' && req.userRole !== 'editor') {
      return res.status(403).json({ 
        error: 'You do not have permission to upload videos. Required role: editor or admin' 
      });
    }

    // Cloudinary file info from multer storage
    const cloudinaryUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;

    const video = new Video({
      title,
      description: description || '',
      category: category || 'general',
      filename: req.file.originalname,
      filepath: cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId,
      userId: req.userId,
      organizationId: req.organizationId,
      size: req.file.size,
      isPublic: isPublic === true ? true : false,
      status: 'uploaded' // Initial status
    });

    await video.save();
    await video.populate('userId', 'username email');

    // Start async processing (non-blocking)
    // Get Socket.io instance if available
    const io = req.app.get('io');
    const ioEmitter = io ? (event, data) => {
      io.to(`org-${req.organizationId}`).emit(event, data);
    } : null;

    // Emit video-uploaded event immediately so clients can see the new video
    if (io) {
      io.to(`org-${req.organizationId}`).emit('video-uploaded', {
        videoId: video._id,
        video: {
          _id: video._id,
          title: video.title,
          description: video.description,
          category: video.category,
          status: video.status,
          processingProgress: video.processingProgress || 0,
          filepath: video.filepath,
          size: video.size,
          views: video.views || 0,
          createdAt: video.createdAt,
          userId: video.userId
        }
      });
    }

    // Trigger processing without waiting
    VideoProcessingService.processVideoAsync(video._id, video, ioEmitter).catch(error => {
      console.error('Background processing error:', error);
    });

    res.status(201).json({
      message: 'Video uploaded successfully. Processing started.',
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        category: video.category,
        status: video.status,
        processingProgress: video.processingProgress,
        filepath: video.filepath,
        size: video.size,
        createdAt: video.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's videos within organization
 */
exports.getUserVideos = async (req, res) => {
  try {
    // Fetch only videos belonging to user's organization
    const videos = await Video.find({
      userId: req.userId,
      organizationId: req.organizationId
    })
    .populate('userId', 'username email')
    .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all organization videos with role-based filtering
 * ADMIN: can see all videos
 * EDITOR: can see all videos
 * VIEWER: can only see public videos
 */
exports.getOrganizationVideos = async (req, res) => {
  try {
    let query = { organizationId: req.organizationId };

    // Viewers can only see public videos
    if (req.userRole === 'viewer') {
      query.isPublic = true;
    }
    // Editors and Admins can see all org videos

    // Fetch videos based on query
    const videos = await Video.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json({ 
      videos,
      count: videos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all public videos (for external access)
 */
exports.getAllPublicVideos = async (req, res) => {
  try {
    // Only fetch public videos
    const videos = await Video.find({
      isPublic: true
    })
    .populate('userId', 'username email')
    .populate('organizationId', 'name slug')
    .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get video by ID with proper access control
 * User must be in same organization
 * VIEWER can only access public videos
 * EDITOR and ADMIN can access all videos in their org
 */
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('organizationId', 'name slug');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify video belongs to user's organization
    if (video.organizationId._id.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Access denied to this video' });
    }

    // Role-based access check
    const isOwner = video.userId._id.toString() === req.userId;

    // Viewers can only see public videos
    if (req.userRole === 'viewer' && !video.isPublic) {
      return res.status(403).json({ error: 'Access denied to this video' });
    }

    // Increment views only if not owner
    if (!isOwner) {
      video.views += 1;
      await video.save();
    }

    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete video
 * ADMIN: can delete any video in org
 * EDITOR: can delete only their own videos
 * VIEWER: cannot delete
 */
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify video belongs to user's organization
    if (video.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check delete permission based on role
    const isOwner = video.userId.toString() === req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        error: 'You do not have permission to delete this video' 
      });
    }

    // Viewers cannot delete
    if (req.userRole === 'viewer') {
      return res.status(403).json({ 
        error: 'Viewers do not have permission to delete videos' 
      });
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

/**
 * Update video
 * ADMIN: can update any video in org
 * EDITOR: can update only their own videos
 * VIEWER: cannot update
 */
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify video belongs to user's organization
    if (video.organizationId.toString() !== req.organizationId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check update permission based on role
    const isOwner = video.userId.toString() === req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        error: 'You do not have permission to update this video' 
      });
    }

    // Viewers cannot update
    if (req.userRole === 'viewer') {
      return res.status(403).json({ 
        error: 'Viewers do not have permission to update videos' 
      });
    }

    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (isPublic !== undefined) video.isPublic = isPublic;
    video.updatedAt = Date.now();

    await video.save();
    await video.populate('userId', 'username email');

    res.json({
      message: 'Video updated successfully',
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get video processing status
 */
exports.getProcessingStatus = async (req, res) => {
  try {
    const status = await VideoProcessingService.getProcessingStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Advanced filtering for videos with role-based access
 */
exports.getFilteredVideos = async (req, res) => {
  try {
    const {
      status,
      sensitivity,
      dateFrom,
      dateTo,
      minSize,
      maxSize,
      category,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter objects for common filters
    const commonFilters = {};
    
    // Status filter
    if (status && ['uploaded', 'processing', 'safe', 'flagged', 'failed'].includes(status)) {
      commonFilters.status = status;
    }

    // Sensitivity filter
    if (sensitivity && ['safe', 'flagged'].includes(sensitivity)) {
      commonFilters['sensitivityAnalysis.result'] = sensitivity;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      commonFilters.createdAt = {};
      if (dateFrom) {
        commonFilters.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        commonFilters.createdAt.$lte = new Date(dateTo);
      }
    }

    // File size filter
    if (minSize || maxSize) {
      commonFilters.size = {};
      if (minSize) {
        commonFilters.size.$gte = parseInt(minSize);
      }
      if (maxSize) {
        commonFilters.size.$lte = parseInt(maxSize);
      }
    }

    // Category filter
    if (category) {
      commonFilters.category = category;
    }

    let query = {};
    
    // Role-based filtering
    if (req.userRole === 'viewer') {
      // Viewers only see public videos
      query = { organizationId: req.organizationId, isPublic: true, ...commonFilters };
    } else {
      // Editors and Admins see all org videos
      query = { organizationId: req.organizationId, ...commonFilters };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Video.countDocuments(query)
    ]);

    res.json({
      videos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get video statistics for dashboard
 */
exports.getVideoStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      $match: {
        organizationId: new mongoose.Types.ObjectId(req.organizationId)
      }
    };

    // Add date filter if provided
    if (startDate || endDate) {
      matchStage.$match.createdAt = {};
      if (startDate) {
        matchStage.$match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.$match.createdAt.$lte = new Date(endDate);
      }
    }

    const stats = await Video.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalSize: { $sum: '$size' },
          totalViews: { $sum: '$views' },
          averageSize: { $avg: '$size' }
        }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Video.aggregate([
      matchStage,
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get sensitivity breakdown
    const sensitivityBreakdown = await Video.aggregate([
      matchStage,
      {
        $group: {
          _id: '$sensitivityAnalysis.result',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overall: stats[0] || {
        totalVideos: 0,
        totalSize: 0,
        totalViews: 0,
        averageSize: 0
      },
      byStatus: statusBreakdown,
      bySensitivity: sensitivityBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};