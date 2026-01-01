const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');

// Register with organization creation
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

    // Check if email exists in any organization (emails must be unique globally)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create or get organization
    let organization;
    if (organizationName) {
      // Check if organization already exists
      const existingOrg = await Organization.findOne({ 
        name: organizationName 
      });
      
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization already exists' });
      }

      // Create new organization
      organization = new Organization({
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
        adminId: null // Will be set after user creation
      });
    } else {
      // Create default organization for user
      organization = new Organization({
        name: `${username}'s Organization`,
        slug: `${username}-org-${Date.now()}`,
        adminId: null
      });
    }

    // Placeholder for user ID (will be updated after user creation)
    const tempUserId = new User({}).constructor.prototype.constructor._id;

    // Create new user
    const user = new User({
      username,
      email,
      password,
      organizationId: organization._id,
      role: 'admin',
      permissions: {
        canUploadVideos: true,
        canDeleteVideos: true,
        canViewAllVideos: true,
        canManageUsers: true,
        canManageOrganization: true
      }
    });

    await user.save();
    organization.adminId = user._id;
    organization.members.push({
      userId: user._id,
      role: 'admin'
    });
    await organization.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, organizationId: organization._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON(),
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password').populate('organizationId');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, organizationId: user.organizationId._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      organization: {
        id: user.organizationId._id,
        name: user.organizationId.name,
        slug: user.organizationId.slug
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('organizationId');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user.toJSON(),
      organization: {
        id: user.organizationId._id,
        name: user.organizationId.name,
        slug: user.organizationId.slug
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

