const express = require('express');
const organizationController = require('../controllers/organizationController');
const authMiddleware = require('../middleware/authMiddleware');
const { rbacMiddleware, organizationMiddleware } = require('../middleware/rbacMiddleware');

const router = express.Router();

/**
 * Organization Management Routes
 * 
 * All protected routes require:
 * 1. Authentication (authMiddleware)
 * 2. Organization membership (organizationMiddleware)
 * 3. Admin role for write operations (rbacMiddleware('admin'))
 */

// Create new organization
router.post('/', 
  authMiddleware,
  organizationController.createOrganization
);

// Get current user's organizations
router.get('/my-organizations',
  authMiddleware,
  organizationController.getUserOrganizations
);

// Get organization details with members
router.get('/:organizationId',
  authMiddleware,
  organizationController.getOrganization
);

// Add member to organization (admin only)
router.post('/:organizationId/members',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.addMember
);

// Update member role (admin only)
router.put('/:organizationId/members/:memberId',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.updateMemberRole
);

// Remove member from organization (admin only)
router.delete('/:organizationId/members/:memberId',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.removeMember
);

module.exports = router;
