const express = require('express');
const Organization = require('../models/Organization');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware, adminOnly, rolePermissionsMap } = require('../middleware/tenantMiddleware');

const router = express.Router();

// Get organization details
router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId)
      .populate('adminId', 'username email')
      .populate('members.userId', 'username email role');

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update organization details (admin only)
router.put('/', authMiddleware, tenantMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    const organization = await Organization.findById(req.organizationId);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (name) organization.name = name;
    if (description !== undefined) organization.description = description;
    if (settings) {
      organization.settings = { ...organization.settings, ...settings };
    }
    organization.updatedAt = Date.now();

    await organization.save();
    res.json({ 
      message: 'Organization updated successfully',
      organization 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get organization members
router.get('/members', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId)
      .populate('members.userId', 'username email isActive createdAt');

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ 
      members: organization.members,
      count: organization.members.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invite user to organization (admin only)
router.post('/invite', authMiddleware, tenantMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate role
    const validRoles = ['viewer', 'editor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be viewer, editor, or admin.' });
    }

    const finalRole = role || 'viewer';

    // Check if user exists globally
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    // Check if user already in organization
    const organization = await Organization.findById(req.organizationId);
    const alreadyMember = organization.members.some(
      m => m.userId.toString() === user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    // Add user to organization with role-based permissions
    user.organizationId = req.organizationId;
    user.role = finalRole;
    user.permissions = rolePermissionsMap[finalRole];
    await user.save();

    organization.members.push({
      userId: user._id,
      role: finalRole
    });
    await organization.save();

    res.json({
      message: 'User invited to organization successfully',
      member: {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove user from organization (admin only)
router.delete('/members/:userId', authMiddleware, tenantMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent removing admin
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the organization' });
    }

    const organization = await Organization.findById(req.organizationId);
    
    // Remove from members array
    organization.members = organization.members.filter(
      m => m.userId.toString() !== userId
    );
    await organization.save();

    // Update user's organization
    const user = await User.findById(userId);
    if (user && user.organizationId.toString() === req.organizationId.toString()) {
      user.isActive = false;
      await user.save();
    }

    res.json({ message: 'User removed from organization successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change user role (admin only)
router.put('/members/:userId/role', authMiddleware, tenantMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be viewer, editor, or admin.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent downgrading the only admin
    const organization = await Organization.findById(req.organizationId);
    const adminCount = organization.members.filter(m => m.role === 'admin').length;
    
    if (role !== 'admin' && adminCount === 1 && user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot remove the only admin. Assign another admin first.' });
    }

    user.role = role;
    user.permissions = rolePermissionsMap[role];
    await user.save();

    // Update in members array
    const member = organization.members.find(m => m.userId.toString() === userId);
    if (member) {
      member.role = role;
      await organization.save();
    }

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get organization statistics
router.get('/stats', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const Video = require('../models/Video');
    
    const organization = await Organization.findById(req.organizationId);
    const memberCount = organization.members.length;
    const videoCount = await Video.countDocuments({ organizationId: req.organizationId });
    const totalViews = await Video.aggregate([
      { $match: { organizationId: require('mongoose').Types.ObjectId(req.organizationId) } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    res.json({
      stats: {
        memberCount,
        videoCount,
        totalViews: totalViews[0]?.totalViews || 0,
        storageUsed: organization.settings.storageUsed,
        storageQuota: organization.settings.storageQuota
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
