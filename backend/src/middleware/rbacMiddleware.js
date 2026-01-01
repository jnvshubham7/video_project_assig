const OrganizationMember = require('../models/OrganizationMember');

/**
 * RBAC Middleware
 * Checks if user has required role in the organization
 * Allowed roles: admin > editor > viewer (hierarchical)
 */
const rbacMiddleware = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const organizationId = req.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Check if user is member of this organization
      const membership = await OrganizationMember.findOne({
        userId: userId,
        organizationId: organizationId
      });

      if (!membership) {
        return res.status(403).json({ 
          error: 'User does not belong to this organization' 
        });
      }

      // Role hierarchy: admin > editor > viewer
      const roleHierarchy = {
        admin: 3,
        editor: 2,
        viewer: 1
      };

      const userRoleLevel = roleHierarchy[membership.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ 
          error: `Insufficient permissions. Required role: ${requiredRole}, User role: ${membership.role}` 
        });
      }

      // Attach user role and membership to request for later use
      req.userRole = membership.role;
      req.membership = membership;

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

/**
 * Organization middleware
 * Checks if user is member of organization (any role)
 */
const organizationMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId;
    const organizationId = req.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const membership = await OrganizationMember.findOne({
      userId: userId,
      organizationId: organizationId
    });

    if (!membership) {
      return res.status(403).json({ 
        error: 'User does not belong to this organization' 
      });
    }

    req.userRole = membership.role;
    req.membership = membership;

    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({ error: 'Error checking organization access' });
  }
};

module.exports = {
  rbacMiddleware,
  organizationMiddleware
};
