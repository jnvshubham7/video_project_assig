const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const jwt = require('jsonwebtoken');

// Register - user is global identity
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, organizationName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists globally
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if username already exists globally
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Step 1: Create global user identity
    const user = new User({
      username,
      email,
      password,
      isActive: true
    });

    await user.save();

    // Step 2: Create organization (or join existing one)
    let organization;
    let isNewOrg = false;

    if (organizationName) {
      const existingOrg = await Organization.findOne({ 
        slug: organizationName.toLowerCase().replace(/\s+/g, '-') 
      });
      
      if (existingOrg) {
        organization = existingOrg;
      } else {
        isNewOrg = true;
        organization = new Organization({
          name: organizationName,
          slug: organizationName.toLowerCase().replace(/\s+/g, '-').substring(0, 50),
          description: ''
        });
        await organization.save();
      }
    } else {
      // Create default personal organization
      isNewOrg = true;
      const personalOrgName = `${username}'s Organization`;
      organization = new Organization({
        name: personalOrgName,
        slug: `${username}-${Date.now()}`.toLowerCase(),
        description: 'Personal organization'
      });
      await organization.save();
    }

    // Step 3: Create membership record - new users are always ADMIN of their org
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });

    console.log('[REGISTER] Creating membership for user:', user._id, 'org:', organization._id);
    await membership.save();
    console.log('[REGISTER] Membership saved successfully');

    // Verify membership was created
    const verifyMembership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: organization._id
    });
    console.log('[REGISTER] Membership verification:', verifyMembership ? 'FOUND' : 'NOT FOUND');

    // Generate JWT token with selected organization
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email, 
        organizationId: organization._id.toString() 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    console.log('[REGISTER] Token generated with org:', organization._id.toString());

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      },
      isNewOrganization: isNewOrg
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login - returns all organizations user belongs to
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by email or username (global search)
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { username: identifier }] 
    }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get all organizations this user belongs to
    const memberships = await OrganizationMember.find({ userId: user._id })
      .populate('organizationId');

    console.log('[LOGIN] User:', user._id, 'Memberships found:', memberships.length);
    memberships.forEach(m => {
      console.log('[LOGIN]   - Org:', m.organizationId._id, 'Role:', m.role);
    });

    if (memberships.length === 0) {
      return res.status(403).json({ error: 'User is not part of any organization' });
    }

    // Default to first organization
    const defaultOrg = memberships[0].organizationId;
    const defaultRole = memberships[0].role;

    // Generate JWT token with default organization
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email, 
        organizationId: defaultOrg._id.toString() 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    console.log('[LOGIN] Token generated. User ID:', user._id.toString(), 'Org ID:', defaultOrg._id.toString());

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      currentOrganization: {
        id: defaultOrg._id,
        name: defaultOrg.name,
        slug: defaultOrg.slug,
        role: defaultRole
      },
      organizations: memberships.map(m => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role
      }))
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Switch organization for current user
exports.switchOrganization = async (req, res) => {
  try {
    const { organizationId } = req.body;
    const userId = req.userId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Verify user belongs to this organization
    const membership = await OrganizationMember.findOne({
      userId: userId,
      organizationId: organizationId
    }).populate('organizationId');

    if (!membership) {
      return res.status(403).json({ error: 'User does not belong to this organization' });
    }

    const organization = membership.organizationId;

    // Generate new token with selected organization
    const token = jwt.sign(
      { 
        userId: userId, 
        email: req.userEmail, 
        organizationId: organization._id 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Organization switched successfully',
      token,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        role: membership.role
      }
    });
  } catch (error) {
    console.error('Switch organization error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get current user with all organizations
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all organizations and memberships
    const memberships = await OrganizationMember.find({ userId: req.userId })
      .populate('organizationId');

    // Get current organization
    const currentOrg = await Organization.findById(req.organizationId);

    res.json({
      user: user.toJSON(),
      currentOrganization: currentOrg ? {
        id: currentOrg._id,
        name: currentOrg.name,
        slug: currentOrg.slug
      } : null,
      organizations: memberships.map(m => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role
      }))
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user's organizations (refresh endpoint)
exports.getMyOrganizations = async (req, res) => {
  try {
    const userId = req.userId;

    const memberships = await OrganizationMember.find({ userId })
      .populate('organizationId');

    const organizations = memberships.map(m => ({
      id: m.organizationId._id,
      name: m.organizationId.name,
      slug: m.organizationId.slug,
      role: m.role
    }));

    res.json({
      organizations,
      count: organizations.length
    });
  } catch (error) {
    console.error('Get my organizations error:', error);
    res.status(500).json({ error: error.message });
  }
};