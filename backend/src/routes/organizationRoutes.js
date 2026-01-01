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

// Get current organization (from token)
router.get('/',
  authMiddleware,
  organizationMiddleware,
  organizationController.getCurrentOrganization
);

// Update current organization (admin only)
router.put('/',
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware('admin'),
  organizationController.updateCurrentOrganization
);

// Get current organization's members
router.get('/members',
  authMiddleware,
  organizationMiddleware,
  organizationController.getCurrentOrganizationMembers
);

// Add/invite member to current organization (admin only)
router.post('/members',
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware('admin'),
  organizationController.addMemberToCurrent
);

// Invite user to current organization (alias for POST /members)
router.post('/invite',
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware('admin'),
  organizationController.addMemberToCurrent
);

// Remove member from current organization (admin only)
router.delete('/members/:userId',
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware('admin'),
  organizationController.removeMemberFromCurrent
);

// Update member role in current organization (admin only)
router.put('/members/:userId/role',
  authMiddleware,
  organizationMiddleware,
  rbacMiddleware('admin'),
  organizationController.updateMemberRoleInCurrent
);

// Get current user's organizations
router.get('/my-organizations',
  authMiddleware,
  organizationController.getUserOrganizations
);

// Get organization details with members (only match valid MongoDB ObjectIds)
router.get('/:organizationId([a-f0-9]{24})',
  authMiddleware,
  organizationController.getOrganization
);

// Add member to organization (admin only)
router.post('/:organizationId([a-f0-9]{24})/members',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.addMember
);

// Update member role (admin only)
router.put('/:organizationId([a-f0-9]{24})/members/:memberId([a-f0-9]{24})',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.updateMemberRole
);

// Remove member from organization (admin only)
router.delete('/:organizationId([a-f0-9]{24})/members/:memberId([a-f0-9]{24})',
  authMiddleware,
  rbacMiddleware('admin'),
  organizationController.removeMember
);

module.exports = router;
