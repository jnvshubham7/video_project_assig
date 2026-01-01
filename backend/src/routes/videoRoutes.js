const express = require('express');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/authMiddleware');
const { rbacMiddleware, organizationMiddleware } = require('../middleware/rbacMiddleware');
const upload = require('../config/multerConfig');

const router = express.Router();

/**
 * All routes require:
 * 1. Authentication (authMiddleware)
 * 2. Organization membership check (organizationMiddleware or rbacMiddleware)
 * 3. Role-based permissions (rbacMiddleware with required role)
 */

// Upload video - requires EDITOR or ADMIN role
router.post('/upload', 
  authMiddleware, 
  rbacMiddleware('editor'),
  upload.single('video'), 
  videoController.uploadVideo
);

// Get user's videos
router.get('/user/myvideos', 
  authMiddleware, 
  organizationMiddleware,
  videoController.getUserVideos
);

// Public endpoint: get all public videos (no auth required)
router.get('/public/all', videoController.getAllPublicVideos);

// Get all organization videos (respects role-based filtering)
router.get('/org/all', 
  authMiddleware, 
  organizationMiddleware,
  videoController.getOrganizationVideos
);

// Update video - requires ownership or ADMIN role
router.put('/:id', 
  authMiddleware, 
  organizationMiddleware,
  videoController.updateVideo
);

// Delete video - requires ownership or ADMIN role
router.delete('/:id', 
  authMiddleware, 
  organizationMiddleware,
  videoController.deleteVideo
);

// Advanced filtering - respects role-based filtering
router.get('/filter/advanced',
  authMiddleware,
  organizationMiddleware,
  videoController.getFilteredVideos
);

// Get statistics - organization members only
router.get('/stats/overview',
  authMiddleware,
  organizationMiddleware,
  videoController.getVideoStatistics
);

// Get processing status
router.get('/:id/processing-status',
  authMiddleware,
  organizationMiddleware,
  videoController.getProcessingStatus
);

// Get video by ID - organization members only
router.get('/:id',
  authMiddleware,
  organizationMiddleware,
  videoController.getVideoById
);

module.exports = router;

