const Organization = require('../models/Organization');
const User = require('../models/User');

/**
 * Role-to-permissions mapping
 * Defines default permissions for each role
 */
const rolePermissionsMap = {
  admin: {
    canUploadVideos: true,
    canDeleteVideos: true,
    canViewAllVideos: true,
    canManageUsers: true,
    canManageOrganization: true
  },
  editor: {
    canUploadVideos: true,
    canDeleteVideos: true,
    canViewAllVideos: false,
    canManageUsers: false,
    canManageOrganization: false
  },
  viewer: {
    canUploadVideos: false,
    canDeleteVideos: false,
    canViewAllVideos: false,
    canManageUsers: false,
    canManageOrganization: false
  }
};

/**
 * Tenant validation middleware
 * Ensures user has access to the organization
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const { organizationId } = req.body || req.query || {};
    
    // Get user's organization
    const user = await User.findById(req.userId).populate('organizationId');
    
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'User not associated with any organization' });
    }

    // If organizationId is provided in request, verify it matches user's organization
    if (organizationId && organizationId !== user.organizationId._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    // Attach organization info to request
    req.organization = user.organizationId;
    req.organizationId = user.organizationId._id;
    req.userRole = user.role;
    req.userPermissions = rolePermissionsMap[user.role] || user.permissions;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Permission check middleware
 * Verifies user has required permission
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.userPermissions || !req.userPermissions[permission]) {
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }
    next();
  };
};

/**
 * Role-based check middleware
 * Verifies user has a minimum role level
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: `Role ${req.userRole} not authorized for this action` });
    }
    next();
  };
};

/**
 * Admin-only middleware
 * Ensures user has admin role in organization
 */
const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

/**
 * Organization access middleware
 * Verifies organization exists and is active
 */
const organizationAccess = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (organization.status !== 'active') {
      return res.status(403).json({ error: 'Organization is not active' });
    }

    req.organization = organization;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  tenantMiddleware,
  checkPermission,
  requireRole,
  adminOnly,
  organizationAccess,
  rolePermissionsMap
};
