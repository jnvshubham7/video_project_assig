const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');

/**
 * Get organization details with members
 */
exports.getOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all members
    const members = await OrganizationMember.find({ organizationId })
      .populate('userId', 'username email');

    res.json({
      organization,
      members: members.map(m => ({
        id: m._id,
        userId: m.userId._id,
        username: m.userId.username,
        email: m.userId.email,
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add user to organization
 * Only ADMIN can add members
 * User must exist in system
 */
exports.addMember = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    // Check if user already member
    const existingMembership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    // Create membership
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId,
      role
    });

    await membership.save();

    res.status(201).json({
      message: 'User added to organization successfully',
      member: {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: membership.role,
        joinedAt: membership.joinedAt
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update member role
 * Only ADMIN can update roles
 */
exports.updateMemberRole = async (req, res) => {
  try {
    const { organizationId, memberId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    const membership = await OrganizationMember.findById(memberId);
    if (!membership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Verify membership belongs to this organization
    if (membership.organizationId.toString() !== organizationId) {
      return res.status(403).json({ error: 'Invalid organization' });
    }

    membership.role = role;
    await membership.save();

    const user = await User.findById(membership.userId);

    res.json({
      message: 'Member role updated successfully',
      member: {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: membership.role,
        joinedAt: membership.joinedAt
      }
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove member from organization
 * Only ADMIN can remove members
 * Cannot remove the last admin
 */
exports.removeMember = async (req, res) => {
  try {
    const { organizationId, memberId } = req.params;

    const membership = await OrganizationMember.findById(memberId);
    if (!membership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Verify membership belongs to this organization
    if (membership.organizationId.toString() !== organizationId) {
      return res.status(403).json({ error: 'Invalid organization' });
    }

    // Check if this is the last admin
    const adminCount = await OrganizationMember.countDocuments({
      organizationId,
      role: 'admin'
    });

    if (membership.role === 'admin' && adminCount === 1) {
      return res.status(400).json({ 
        error: 'Cannot remove the last admin from the organization' 
      });
    }

    const user = await User.findById(membership.userId);
    await OrganizationMember.findByIdAndDelete(memberId);

    res.json({
      message: 'Member removed from organization successfully',
      member: {
        userId: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current user's organizations
 */
exports.getUserOrganizations = async (req, res) => {
  try {
    const userId = req.userId;

    const memberships = await OrganizationMember.find({ userId })
      .populate('organizationId');

    const organizations = memberships.map(m => ({
      id: m.organizationId._id,
      name: m.organizationId.name,
      slug: m.organizationId.slug,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    res.json({
      organizations,
      count: organizations.length
    });
  } catch (error) {
    console.error('Get user organizations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create new organization (by authenticated user)
 */
exports.createOrganization = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    // Create slug from name
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 50);

    // Check if slug already exists
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({ error: 'An organization with this name already exists' });
    }

    // Create organization
    const organization = new Organization({
      name,
      slug,
      description: description || ''
    });

    await organization.save();

    // Add creator as admin
    const membership = new OrganizationMember({
      userId: req.userId,
      organizationId: organization._id,
      role: 'admin'
    });

    await membership.save();

    res.status(201).json({
      message: 'Organization created successfully',
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description
      },
      role: 'admin'
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current organization (from token)
 * Used by frontend to load org settings
 */
exports.getCurrentOrganization = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    console.log('[ORG-CONTROLLER] Getting current organization:', organizationId);

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      console.error('[ORG-CONTROLLER] Organization not found in DB:', organizationId);
      return res.status(404).json({ error: 'Organization not found in database' });
    }

    console.log('[ORG-CONTROLLER] Organization found:', organization.name);

    // Get all members of this organization
    const members = await OrganizationMember.find({ organizationId })
      .populate('userId', 'username email isActive');

    res.json({
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description || '',
        status: organization.status,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      members: members.map(m => ({
        _id: m._id,
        userId: {
          _id: m.userId._id,
          username: m.userId.username,
          email: m.userId.email,
          isActive: m.userId.isActive
        },
        role: m.role,
        joinedAt: m.joinedAt
      }))
    });
  } catch (error) {
    console.error('Get current organization error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current organization's members
 */
exports.getCurrentOrganizationMembers = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const members = await OrganizationMember.find({ organizationId })
      .populate('userId', 'username email isActive');

    res.json({
      members: members.map(m => ({
        _id: m._id,
        userId: {
          _id: m.userId._id,
          username: m.userId.username,
          email: m.userId.email,
          isActive: m.userId.isActive,
          createdAt: m.userId.createdAt
        },
        role: m.role,
        joinedAt: m.joinedAt
      })),
      count: members.length
    });
  } catch (error) {
    console.error('Get current organization members error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Add member to current organization
 */
exports.addMemberToCurrent = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    // Validate organizationId
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: `User with email '${email}' not found in system` });
    }

    // Check if user already member
    const existingMembership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: organizationId
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    // Create membership
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organizationId,
      role
    });

    await membership.save();
    
    // Verify the membership was saved
    const savedMembership = await OrganizationMember.findById(membership._id);
    if (!savedMembership) {
      throw new Error('Failed to save membership to database');
    }

    res.status(201).json({
      message: 'User added to organization successfully',
      member: {
        _id: membership._id,
        userId: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        role: membership.role,
        joinedAt: membership.joinedAt
      }
    });
  } catch (error) {
    console.error('Add member to current org error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove member from current organization (admin only)
 */
exports.removeMemberFromCurrent = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const membership = await OrganizationMember.findOne({
      userId: userId,
      organizationId: organizationId
    });

    if (!membership) {
      return res.status(404).json({ error: 'User is not a member of this organization' });
    }

    // Prevent removing the last admin
    if (membership.role === 'admin') {
      const adminCount = await OrganizationMember.countDocuments({
        organizationId: organizationId,
        role: 'admin'
      });

      if (adminCount === 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin from organization' });
      }
    }

    const deleteResult = await OrganizationMember.findByIdAndDelete(membership._id);
    
    if (!deleteResult) {
      throw new Error('Failed to delete membership from database');
    }

    res.json({ 
      message: 'User removed from organization successfully',
      removedUserId: userId
    });
  } catch (error) {
    console.error('Remove member from current org error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update member role in current organization (admin only)
 */
exports.updateMemberRoleInCurrent = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: 'User ID and new role are required' });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, editor, or viewer' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const membership = await OrganizationMember.findOne({
      userId: userId,
      organizationId: organizationId
    });

    if (!membership) {
      return res.status(404).json({ error: 'User is not a member of this organization' });
    }

    // Prevent downgrading the last admin
    if (membership.role === 'admin' && role !== 'admin') {
      const adminCount = await OrganizationMember.countDocuments({
        organizationId: organizationId,
        role: 'admin'
      });

      if (adminCount === 1) {
        return res.status(400).json({ error: 'Cannot remove admin role from the last admin' });
      }
    }

    membership.role = role;
    const updatedMembership = await membership.save();
    
    // Verify the update was saved
    const verifyUpdate = await OrganizationMember.findById(membership._id);
    if (!verifyUpdate || verifyUpdate.role !== role) {
      throw new Error('Failed to update membership role in database');
    }

    res.json({
      message: 'Member role updated successfully',
      member: {
        _id: membership._id,
        userId: userId,
        role: updatedMembership.role,
        joinedAt: updatedMembership.joinedAt
      }
    });
  } catch (error) {
    console.error('Update member role in current org error:', error);
    res.status(500).json({ error: error.message });
  }
};
