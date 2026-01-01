const Video = require('../models/Video');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (in case it's not already configured)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload video with organization isolation
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Video title is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Check user permissions
    if (!req.userPermissions.canUploadVideos) {
      return res.status(403).json({ error: 'You do not have permission to upload videos' });
    }

    // Cloudinary file info from multer storage
    const cloudinaryUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;

    const video = new Video({
      title,
      description: description || '',
      filename: req.file.originalname,
      filepath: cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId,
      userId: req.userId,
      organizationId: req.organizationId,
      size: req.file.size,
      isPublic: isPublic !== false
    });

    await video.save();
    await video.populate('userId', 'username email');

    res.status(201).json({
      message: 'Video uploaded successfully to cloud storage',
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's videos within organization
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

// Get all organization videos with role-based filtering
exports.getOrganizationVideos = async (req, res) => {
  try {
    let query = { organizationId: req.organizationId };

    // Viewers can only see public videos or videos shared with them
    if (req.userRole === 'viewer') {
      query = {
        $or: [
          { organizationId: req.organizationId, isPublic: true },
          { organizationId: req.organizationId, allowedUsers: req.userId }
        ]
      };
    }
    // Editors can see all org videos
    else if (req.userRole === 'editor') {
      query = { organizationId: req.organizationId };
    }
    // Admins can see all org videos

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

// Get all public videos (for external access)
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

// Get video by ID with proper access control
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('organizationId', 'name slug');
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check access control
    const isOwner = req.userId && video.userId._id.toString() === req.userId;
    const isOrganizationMember = req.organizationId && video.organizationId._id.toString() === req.organizationId.toString();
    const isPublic = video.isPublic;
    const hasExplicitAccess = req.userId && video.allowedUsers.includes(req.userId);
    const isAdmin = req.userRole === 'admin';
    const isEditor = req.userRole === 'editor';

    // Access denied if:
    // - Not owner AND
    // - Not admin AND
    // - (Not editor OR not in same org) AND
    // - (Not public AND not explicitly shared) AND
    // - Not in same org
    if (!isOwner && !isAdmin && !(isEditor && isOrganizationMember) && !isPublic && !hasExplicitAccess) {
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

// Delete video with ownership check
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify ownership and organization membership
    if (video.userId.toString() !== req.userId) {
      // Check if admin of the organization
      if (!(req.userRole === 'admin' && video.organizationId.toString() === req.organizationId.toString())) {
        return res.status(403).json({ error: 'Not authorized to delete this video' });
      }
    }

    // Check permissions
    if (!req.userPermissions.canDeleteVideos) {
      return res.status(403).json({ error: 'You do not have permission to delete videos' });
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

// Update video with ownership check
exports.updateVideo = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify ownership and organization membership
    if (video.userId.toString() !== req.userId) {
      // Check if admin of the organization
      if (!(req.userRole === 'admin' && video.organizationId.toString() === req.organizationId.toString())) {
        return res.status(403).json({ error: 'Not authorized to update this video' });
      }
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

// Share video with specific users
exports.shareVideo = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify ownership
    if (video.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to share this video' });
    }

    // Verify all users are in the same organization
    const users = await User.find({ 
      _id: { $in: userIds },
      organizationId: req.organizationId
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({ error: 'One or more users not found in your organization' });
    }

    // Add users to allowedUsers
    video.allowedUsers = [...new Set([...video.allowedUsers, ...userIds])];
    await video.save();

    res.json({
      message: 'Video shared successfully',
      video
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
