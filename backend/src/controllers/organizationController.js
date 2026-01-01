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
