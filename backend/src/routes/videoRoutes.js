const express = require('express');
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware, checkPermission, organizationAccess } = require('../middleware/tenantMiddleware');
const upload = require('../config/multerConfig');

const router = express.Router();

// Protected routes (require authentication and tenant validation)
router.post('/upload', 
  authMiddleware, 
  tenantMiddleware, 
  organizationAccess,
  checkPermission('canUploadVideos'),
  upload.single('video'), 
  videoController.uploadVideo
);

router.get('/user/myvideos', 
  authMiddleware, 
  tenantMiddleware, 
  organizationAccess,
  videoController.getUserVideos
);

router.get('/org/all', 
  authMiddleware, 
  tenantMiddleware, 
  organizationAccess,
  videoController.getOrganizationVideos
);

router.put('/:id', 
  authMiddleware, 
  tenantMiddleware, 
  organizationAccess,
  videoController.updateVideo
);

router.delete('/:id', 
  authMiddleware, 
  tenantMiddleware, 
  organizationAccess,
  checkPermission('canDeleteVideos'),
  videoController.deleteVideo
);

router.post('/:id/share',
  authMiddleware,
  tenantMiddleware,
  organizationAccess,
  videoController.shareVideo
);

// Filtering and statistics routes
router.get('/filter/advanced',
  authMiddleware,
  tenantMiddleware,
  organizationAccess,
  videoController.getFilteredVideos
);

router.get('/stats/overview',
  authMiddleware,
  tenantMiddleware,
  organizationAccess,
  videoController.getVideoStatistics
);

router.get('/:id/processing-status',
  authMiddleware,
  tenantMiddleware,
  organizationAccess,
  videoController.getProcessingStatus
);

// Public routes (accessible without authentication)
router.get('/public/all', videoController.getAllPublicVideos);
router.get('/:id', videoController.getVideoById);

module.exports = router;

