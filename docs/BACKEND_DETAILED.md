# Backend Implementation - Detailed Technical Guide

## Table of Contents
1. [Project Setup](#project-setup)
2. [Server Configuration](#server-configuration)
3. [Database Connection](#database-connection)
4. [Authentication Flow](#authentication-flow)
5. [Controllers Deep Dive](#controllers-deep-dive)
6. [Middleware Explained](#middleware-explained)
7. [Services Deep Dive](#services-deep-dive)
8. [Video Processing Pipeline](#video-processing-pipeline)
9. [Error Handling](#error-handling)
10. [Testing Strategy](#testing-strategy)
11. [Common Issues & Solutions](#common-issues--solutions)

---

## Project Setup

### Directory Structure
```
backend/
├── src/
│   ├── server.js                 # Express app + Socket.io setup
│   ├── config/
│   │   └── multerConfig.js       # File upload middleware
│   ├── controllers/              # Request handlers
│   │   ├── authController.js     # Login, register, token management
│   │   ├── videoController.js    # Video CRUD, streaming
│   │   └── organizationController.js  # Team management
│   ├── middleware/               # Express middleware
│   │   ├── authMiddleware.js     # JWT token verification
│   │   └── rbacMiddleware.js     # Role-based access control
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js               # User credentials + metadata
│   │   ├── Organization.js       # Team/org info
│   │   ├── OrganizationMember.js # User-org relationship + role
│   │   └── Video.js              # Video metadata + status
│   ├── routes/                   # Route definitions
│   │   ├── authRoutes.js
│   │   ├── videoRoutes.js
│   │   └── organizationRoutes.js
│   ├── services/                 # Business logic
│   │   ├── videoProcessingService.js  # FFmpeg processing
│   │   └── videoStreamingService.js   # HTTP Range requests
│   └── __tests__/                # Test files
├── .env                          # Environment variables (not in git)
├── .env.example                  # Template for .env
├── .gitignore
├── package.json
├── jest.config.js                # Jest test configuration
├── jest-setup.js                 # Test environment setup
└── README.md
```

### Environment Variables (.env)
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://example.com

# File Upload
MAX_FILE_SIZE=500000000  # 500MB in bytes
UPLOAD_DIR=./uploads

# Cloudinary (optional, for cloud storage)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# FFmpeg (for Docker)
FFMPEG_PATH=/app/node_modules/ffmpeg-static/ffmpeg
FFPROBE_PATH=/app/node_modules/ffprobe-static/bin/linux/x64/ffprobe
```

---

## Server Configuration

### Express App Setup (server.js)

```javascript
// Step 1: Imports and initialization
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

// Step 2: Middleware setup
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Step 3: Make Socket.io accessible to routes
app.set('io', io);

// Step 4: Socket.io connection handling
io.on('connection', (socket) => {
  socket.on('join-org', (organizationId) => {
    socket.join(`org-${organizationId}`);
  });
});

// Step 5: Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/organizations', require('./routes/organizationRoutes'));

// Step 6: Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Step 7: Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Step 8: Database connection & server start
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    httpServer.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
```

### CORS Configuration
```javascript
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    let allowedOrigins = [];

    if (allowedOriginsEnv) {
      allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim());
    } else {
      allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://video-filter-iota.vercel.app'
      ];
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Why CORS?
// Browser security: prevents malicious sites from accessing your API
// Frontend at localhost:3000 makes requests to localhost:5000
// Backend must explicitly allow this cross-origin request
```

### Socket.io Setup
```javascript
const io = new Server(httpServer, {
  cors: corsOptions
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.id}`);

  // Join organization room for real-time updates
  socket.on('join-org', (organizationId) => {
    socket.join(`org-${organizationId}`);
    console.log(`User ${socket.id} joined org ${organizationId}`);
  });

  socket.on('leave-org', (organizationId) => {
    socket.leave(`org-${organizationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.id}`);
  });
});

// Broadcasting from controllers:
// app.get('io').to(`org-${orgId}`).emit('video-processed', data);
```

---

## Database Connection

### Mongoose Connection
```javascript
// In server.js
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✓ MongoDB connected');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});
```

### Connection String Formats
```javascript
// Local MongoDB
mongodb://localhost:27017/video-app

// MongoDB Atlas (Cloud)
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

// In-memory (Testing)
mongodb://localhost:27017/video-app-test
// (Use mongodb-memory-server package)
```

---

## Authentication Flow

### 1. User Registration

#### Frontend Call:
```typescript
await axios.post('/api/auth/register', {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securepass123',
  confirmPassword: 'securepass123',
  organizationName: 'Acme Corp'
});
```

#### Backend Processing (authController.js):

```javascript
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword, organizationName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for existing user (global identity)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // STEP 1: Create global user identity
    const user = new User({
      username,
      email,
      password,  // Mongoose pre-save hook hashes this
      isActive: true
    });
    await user.save();

    // STEP 2: Create or find organization
    let organization;
    let isNewOrg = false;

    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/\s+/g, '-');
      const existingOrg = await Organization.findOne({ slug });
      
      if (existingOrg) {
        organization = existingOrg;
      } else {
        isNewOrg = true;
        organization = new Organization({
          name: organizationName,
          slug: slug.substring(0, 50),
          description: ''
        });
        await organization.save();
      }
    } else {
      // Create default personal organization
      isNewOrg = true;
      organization = new Organization({
        name: `${username}'s Organization`,
        slug: `${username}-${Date.now()}`.toLowerCase(),
        description: 'Personal organization'
      });
      await organization.save();
    }

    // STEP 3: Create membership record
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'  // New users are admin of their org
    });
    await membership.save();

    // STEP 4: Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        currentOrganizationId: organization._id.toString(),
        currentOrganizationRole: 'admin',
        organizations: [
          {
            id: organization._id.toString(),
            name: organization.name,
            role: 'admin'
          }
        ]
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // STEP 5: Send response
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toJSON(),
      organization,
      isNewOrganization: isNewOrg
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};
```

### 2. User Login

#### Frontend Call:
```typescript
await axios.post('/api/auth/login', {
  identifier: 'john@example.com',  // Email or username
  password: 'securepass123'
});
```

#### Backend Processing:

```javascript
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    }).select('+password');  // Include password for comparison

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get all organizations user is member of
    const memberships = await OrganizationMember.find({
      userId: user._id
    }).populate('organizationId', 'name slug');

    // Default to first organization
    const currentMembership = memberships[0];
    if (!currentMembership) {
      return res.status(400).json({ error: 'User not member of any organization' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        currentOrganizationId: currentMembership.organizationId._id.toString(),
        currentOrganizationRole: currentMembership.role,
        organizations: memberships.map(m => ({
          id: m.organizationId._id.toString(),
          name: m.organizationId.name,
          role: m.role
        }))
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
      currentOrganization: {
        id: currentMembership.organizationId._id.toString(),
        name: currentMembership.organizationId.name,
        slug: currentMembership.organizationId.slug,
        role: currentMembership.role
      },
      organizations: memberships.map(m => ({
        id: m.organizationId._id.toString(),
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        role: m.role
      }))
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};
```

### 3. Token Verification

#### Frontend Storage:
```typescript
// Save token to localStorage
localStorage.setItem('authToken', response.data.token);

// Include in every API request
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Or per request:
await axios.get('/api/videos', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Backend Verification (authMiddleware):

```javascript
const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach to request object
    req.userId = decoded.userId;
    req.organizationId = decoded.currentOrganizationId;
    req.userRole = decoded.currentOrganizationRole;
    req.allOrganizations = decoded.organizations;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

### 4. Switch Organization

#### Frontend Call:
```typescript
await axios.post('/api/auth/switch-organization', {
  organizationId: 'new-org-id'
}, {
  headers: { 'Authorization': `Bearer ${currentToken}` }
});
```

#### Backend Processing:

```javascript
exports.switchOrganization = async (req, res) => {
  try {
    const userId = req.userId;
    const { organizationId } = req.body;

    // Verify user is member of organization
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId
    }).populate('organizationId', 'name slug');

    if (!membership) {
      return res.status(403).json({ 
        error: 'User is not member of this organization' 
      });
    }

    // Get all memberships for new token
    const allMemberships = await OrganizationMember.find({
      userId
    }).populate('organizationId', 'name slug');

    // Generate new token with new org context
    const token = jwt.sign(
      {
        userId: userId,
        email: req.userEmail,
        currentOrganizationId: organizationId,
        currentOrganizationRole: membership.role,
        organizations: allMemberships.map(m => ({
          id: m.organizationId._id.toString(),
          name: m.organizationId.name,
          role: m.role
        }))
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Organization switched',
      token,
      organization: {
        id: membership.organizationId._id.toString(),
        name: membership.organizationId.name,
        slug: membership.organizationId.slug,
        role: membership.role
      }
    });

  } catch (error) {
    console.error('Switch org error:', error);
    res.status(500).json({ error: 'Failed to switch organization' });
  }
};
```

---

## Controllers Deep Dive

### videoController.js

#### uploadVideo()
```javascript
exports.uploadVideo = async (req, res) => {
  try {
    const userId = req.userId;
    const organizationId = req.organizationId;
    const { title, description } = req.body;
    const file = req.file;

    // Validation
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // File size check (500MB default)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 500000000;
    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }

    // Check user is editor or admin
    const membership = await OrganizationMember.findOne({
      userId, organizationId
    });

    if (!membership || !['admin', 'editor'].includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Create video document
    const video = new Video({
      title,
      description: description || '',
      owner: userId,
      organization: organizationId,
      originalFilePath: file.path || file.url,
      status: 'pending',
      visibility: 'private',
      sensitivity: {
        score: 0,
        isFlagged: false,
        categories: {}
      }
    });

    await video.save();

    // Enqueue processing (async, don't wait)
    const videoProcessingService = require('../services/videoProcessingService');
    videoProcessingService.processVideo(video._id)
      .catch(error => {
        console.error('Processing error:', error);
        // Update video status to failed
        Video.findByIdAndUpdate(video._id, { status: 'failed' });
      });

    // Notify other users in org via Socket.io
    const io = req.app.get('io');
    io.to(`org-${organizationId}`).emit('video-uploaded', {
      videoId: video._id,
      title: video.title,
      status: 'pending'
    });

    // Return immediately
    res.status(201).json({
      message: 'Video uploaded successfully',
      data: video.toJSON()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};
```

#### getVideos()
```javascript
exports.getVideos = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { page = 1, limit = 20, search = '' } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    const query = {
      organization: organizationId,
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    };

    // Execute query with pagination
    const videos = await Video.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();  // Return plain objects (faster)

    // Get total count
    const total = await Video.countDocuments(query);

    res.json({
      message: 'Videos retrieved',
      data: videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
};
```

#### streamVideo()
```javascript
exports.streamVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const range = req.headers.range;

    // Check permissions
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Verify user has access
    if (video.visibility === 'private' && video.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If video still processing, return status
    if (video.status !== 'completed') {
      return res.status(202).json({ 
        message: 'Video still processing',
        status: video.status
      });
    }

    // Use video streaming service
    const videoStreamingService = require('../services/videoStreamingService');
    videoStreamingService.streamVideo(video.processedFilePath, range, res);

    // Log view
    if (!video.viewedBy.includes(req.userId)) {
      video.viewedBy.push(req.userId);
      await video.save();
    }

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
};
```

---

## Middleware Explained

### authMiddleware.js
```javascript
/**
 * JWT Authentication Middleware
 * Verifies token and attaches user info to request
 * 
 * Required: Authorization header with Bearer token
 * Sets: req.userId, req.organizationId, req.userRole
 */
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authentication token',
        code: 'NO_TOKEN'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer "

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach to request
    req.userId = decoded.userId;
    req.email = decoded.email;
    req.organizationId = decoded.currentOrganizationId;
    req.userRole = decoded.currentOrganizationRole;
    req.allOrganizations = decoded.organizations;

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

module.exports = authMiddleware;
```

### rbacMiddleware.js
```javascript
/**
 * Role-Based Access Control Middleware
 * Checks if user has required role
 * 
 * Role hierarchy: admin (3) > editor (2) > viewer (1)
 */
const OrganizationMember = require('../models/OrganizationMember');

const rbacMiddleware = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const organizationId = req.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: 'User not authenticated'
        });
      }

      // Get user's membership in this organization
      const membership = await OrganizationMember.findOne({
        userId,
        organizationId
      });

      if (!membership) {
        return res.status(403).json({
          error: 'User not member of this organization'
        });
      }

      // Check role hierarchy
      const roleHierarchy = {
        viewer: 1,
        editor: 2,
        admin: 3
      };

      const userRoleLevel = roleHierarchy[membership.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          error: `Insufficient permissions. Required: ${requiredRole}, Got: ${membership.role}`,
          requiredRole,
          userRole: membership.role
        });
      }

      // Attach membership to request
      req.userRole = membership.role;
      req.membership = membership;

      next();

    } catch (error) {
      console.error('RBAC error:', error);
      res.status(500).json({
        error: 'Permission check failed'
      });
    }
  };
};

// Usage:
// router.post('/videos', authMiddleware, rbacMiddleware('editor'), uploadVideo);
```

### organizationMiddleware.js
```javascript
/**
 * Organization Verification Middleware
 * Verifies user is member of the organization they're accessing
 */
const organizationMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId;
    const organizationId = req.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Verify membership
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId
    });

    if (!membership) {
      return res.status(403).json({
        error: 'User does not belong to this organization'
      });
    }

    // All good, continue
    next();

  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({
      error: 'Failed to verify organization membership'
    });
  }
};

module.exports = organizationMiddleware;
```

---

## Services Deep Dive

### videoProcessingService.js

#### Sensitivity Analysis Algorithm
```javascript
class VideoProcessingService {
  static KEYWORD_CATEGORIES = {
    explicit: {
      keywords: ['adult', 'explicit', 'porn', 'xxx', 'sexual', 'nude', 'naked'],
      weight: 40,
      category: 'Explicit Content'
    },
    violence: {
      keywords: ['violence', 'murder', 'kill', 'death', 'gore', 'blood'],
      weight: 30,
      category: 'Violence/Gore'
    },
    hate: {
      keywords: ['hate', 'racist', 'sexist', 'discrimination', 'slur'],
      weight: 35,
      category: 'Hate Speech'
    },
    illegal: {
      keywords: ['illegal', 'drug', 'cocaine', 'heroin', 'steal', 'robbery'],
      weight: 35,
      category: 'Illegal Activity'
    },
    harmful: {
      keywords: ['suicide', 'self-harm', 'cutting', 'abuse', 'trauma'],
      weight: 38,
      category: 'Self-Harm'
    },
    spam: {
      keywords: ['spam', 'clickbait', 'scam', 'fake', 'hoax', 'misinformation'],
      weight: 20,
      category: 'Spam/Misleading'
    }
  };

  /**
   * Analyzes video sensitivity based on metadata
   * Scans title, description, filename for keywords
   */
  static analyzeSensitivity(videoMetadata) {
    try {
      let textToAnalyze = '';

      if (typeof videoMetadata === 'string') {
        textToAnalyze = videoMetadata;
      } else {
        textToAnalyze = [
          videoMetadata.title || '',
          videoMetadata.description || '',
          videoMetadata.filename || ''
        ].join(' ');
      }

      // Convert to lowercase for analysis
      const lowerText = textToAnalyze.toLowerCase();

      let totalScore = 0;
      const detailedResults = {};

      // Check each category
      for (const [categoryKey, category] of Object.entries(this.KEYWORD_CATEGORIES)) {
        let categoryScore = 0;

        // Count keyword occurrences
        for (const keyword of category.keywords) {
          // Create regex to find whole words
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = (lowerText.match(regex) || []).length;
          categoryScore += matches * category.weight;
        }

        detailedResults[categoryKey] = categoryScore;
        totalScore += categoryScore;
      }

      // Determine if flagged
      const FLAG_THRESHOLD = 30;
      const isFlagged = totalScore > FLAG_THRESHOLD;

      // Get flagged reasons
      const flaggedReasons = [];
      for (const [key, score] of Object.entries(detailedResults)) {
        if (score > 0) {
          flaggedReasons.push(`${this.KEYWORD_CATEGORIES[key].category}: ${score} points`);
        }
      }

      return {
        score: totalScore,
        isFlagged,
        categories: detailedResults,
        flaggedReasons,
        threshold: FLAG_THRESHOLD
      };

    } catch (error) {
      console.error('Sensitivity analysis error:', error);
      return {
        score: 0,
        isFlagged: false,
        categories: {},
        flaggedReasons: [],
        error: error.message
      };
    }
  }

  /**
   * Main video processing pipeline
   */
  static async processVideo(videoId) {
    const Video = require('../models/Video');

    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Update status
      video.status = 'processing';
      await video.save();

      // Step 1: Extract metadata
      console.log('Extracting metadata...');
      const metadata = await this.extractMetadata(video.originalFilePath);

      // Step 2: Perform sensitivity analysis
      console.log('Analyzing sensitivity...');
      const sensitivity = this.analyzeSensitivity(video);

      // Step 3: Transcode video
      console.log('Transcoding video...');
      const processedPath = await this.transcodeVideo(video.originalFilePath);

      // Step 4: Generate thumbnail
      console.log('Generating thumbnail...');
      const thumbnailPath = await this.generateThumbnail(video.originalFilePath);

      // Update video document
      video.status = 'completed';
      video.duration = metadata.duration;
      video.resolution = metadata.resolution;
      video.bitrate = metadata.bitrate;
      video.fileSize = metadata.fileSize;
      video.processedFilePath = processedPath;
      video.thumbnailPath = thumbnailPath;
      video.sensitivity = sensitivity;

      await video.save();

      console.log(`✓ Video ${videoId} processed successfully`);

      return video;

    } catch (error) {
      console.error(`✗ Processing failed for ${videoId}:`, error);

      // Mark as failed
      const video = await Video.findById(videoId);
      if (video) {
        video.status = 'failed';
        video.processingError = error.message;
        await video.save();
      }

      throw error;
    }
  }

  /**
   * Extract video metadata using FFprobe
   */
  static async extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .ffprobe((err, data) => {
          if (err) {
            return reject(new Error('Failed to extract metadata'));
          }

          const stream = data.streams[0];
          resolve({
            duration: Math.round(data.format.duration),
            resolution: `${stream.width}x${stream.height}`,
            bitrate: `${Math.round(data.format.bit_rate / 1000)}k`,
            fileSize: data.format.size
          });
        });
    });
  }

  /**
   * Transcode video to MP4
   */
  static async transcodeVideo(inputPath) {
    return new Promise((resolve, reject) => {
      const outputPath = inputPath.replace(/\.[^/.]+$/, '') + '-processed.mp4';

      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Generate thumbnail
   */
  static async generateThumbnail(inputPath) {
    return new Promise((resolve, reject) => {
      const thumbnailPath = inputPath.replace(/\.[^/.]+$/, '') + '-thumb.jpg';

      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: path.dirname(thumbnailPath),
          filename: path.basename(thumbnailPath),
          timestamps: [1]  // 1 second into video
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', (err) => reject(err));
    });
  }
}

module.exports = VideoProcessingService;
```

### videoStreamingService.js
```javascript
/**
 * Video Streaming Service
 * Handles HTTP Range requests for efficient video streaming
 */
const fs = require('fs');
const path = require('path');

class VideoStreamingService {
  /**
   * Stream video with Range request support
   * 
   * @param {string} videoPath - Path to video file
   * @param {string} range - HTTP Range header (e.g., "bytes=0-1023")
   * @param {Response} res - Express response object
   */
  static streamVideo(videoPath, range, res) {
    try {
      // Get file size
      const fileSize = fs.statSync(videoPath).size;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // Validate range
        if (start >= fileSize || end >= fileSize) {
          res.status(416).send('Range not satisfiable');
          return;
        }

        // Read chunk
        const stream = fs.createReadStream(videoPath, {
          start,
          end
        });

        // Set headers
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': (end - start + 1),
          'Content-Type': 'video/mp4'
        });

        // Stream to client
        stream.pipe(res);

      } else {
        // No range header, stream entire file
        const stream = fs.createReadStream(videoPath);

        res.set({
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes'
        });

        stream.pipe(res);
      }

    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).json({ error: 'Failed to stream video' });
    }
  }
}

module.exports = VideoStreamingService;
```

---

## Video Processing Pipeline

### Complete Processing Flow

```
1. USER UPLOADS VIDEO
   ↓
2. Frontend POST /api/videos/upload with file
   ↓
3. authMiddleware validates JWT token
   ↓
4. rbacMiddleware checks editor/admin role
   ↓
5. Multer middleware handles file upload
   ↓
6. videoController.uploadVideo():
   - Validate inputs
   - Create Video document (status: pending)
   - Save to database
   - Return response immediately
   ↓
7. ASYNC: videoProcessingService.processVideo():
   - Update status to "processing"
   - Extract metadata (FFprobe)
   - Analyze sensitivity (keyword scanning)
   - Transcode video (FFmpeg)
   - Generate thumbnail (FFmpeg)
   - Update Video document (status: completed)
   ↓
8. Real-time updates via Socket.io:
   - io.to(`org-${orgId}`).emit('processing-complete', {videoId, ...})
   ↓
9. Frontend receives Socket.io event
   - Update UI
   - Show sensitivity results
   - Display video thumbnail
```

### Error Handling in Processing
```javascript
videoProcessingService.processVideo(video._id)
  .then(processedVideo => {
    console.log('Processing complete');
    // Notify user via Socket.io
    io.to(`org-${orgId}`).emit('processing-complete', {
      videoId: video._id,
      sensitivity: processedVideo.sensitivity
    });
  })
  .catch(error => {
    console.error('Processing failed:', error);
    
    // Mark video as failed
    Video.findByIdAndUpdate(video._id, {
      status: 'failed',
      processingError: error.message
    });
    
    // Notify user
    io.to(`org-${orgId}`).emit('processing-failed', {
      videoId: video._id,
      error: error.message
    });
  });
```

---

## Error Handling

### Global Error Handler
```javascript
// In server.js
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle specific errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Try-Catch Pattern
```javascript
// Good practice
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(video);
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid video ID' });
    }
    
    res.status(500).json({ error: 'Failed to retrieve video' });
  }
};
```

---

## Testing Strategy

### Setting Up Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
```

### JWT Token Tests
```javascript
// __tests__/authController.test.js
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          organizationName: 'Test Org'
        });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');

      // Verify JWT structure
      const decoded = jwt.decode(response.body.token);
      expect(decoded.userId).toBeDefined();
      expect(decoded.currentOrganizationId).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user1',
          email: 'duplicate@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'duplicate@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'logintest',
          email: 'login@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
```

### Video Controller Tests
```javascript
describe('Video Controller', () => {
  let token;
  let userId;
  let organizationId;

  beforeEach(async () => {
    // Setup: Register user and get token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'vidtest',
        email: 'vid@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      });

    token = registerRes.body.token;
    userId = registerRes.body.user._id;
    organizationId = registerRes.body.organization._id;
  });

  test('should upload video', async () => {
    const response = await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Video')
      .field('description', 'Test Description')
      .attach('video', 'path/to/test-video.mp4');

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending');
  });

  test('should list organization videos', async () => {
    // Upload a video first
    await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Video')
      .attach('video', 'path/to/test-video.mp4');

    // Then list
    const response = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.pagination).toBeDefined();
  });

  test('should require auth token', async () => {
    const response = await request(app)
      .get('/api/videos');

    expect(response.status).toBe(401);
  });
});
```

### Sensitivity Analysis Tests
```javascript
describe('Sensitivity Analysis', () => {
  const VideoProcessingService = require('../services/videoProcessingService');

  test('should flag explicit content', () => {
    const result = VideoProcessingService.analyzeSensitivity({
      title: 'Adult Content Video',
      description: 'Explicit material'
    });

    expect(result.isFlagged).toBe(true);
    expect(result.score).toBeGreaterThan(30);
    expect(result.categories.explicit).toBeGreaterThan(0);
  });

  test('should flag violent content', () => {
    const result = VideoProcessingService.analyzeSensitivity({
      title: 'Murder Documentary',
      description: 'Gore and violence'
    });

    expect(result.isFlagged).toBe(true);
    expect(result.categories.violence).toBeGreaterThan(0);
  });

  test('should not flag normal content', () => {
    const result = VideoProcessingService.analyzeSensitivity({
      title: 'My Family Vacation',
      description: 'Fun times at the beach'
    });

    expect(result.isFlagged).toBe(false);
    expect(result.score).toBe(0);
  });
});
```

---

## Common Issues & Solutions

### Issue: "FFMPEG not found"
```javascript
// Solution: Ensure static FFmpeg binaries are configured
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);
```

### Issue: "MongoDB connection timeout"
```javascript
// Solution: Check connection string and network access
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});

// For MongoDB Atlas, whitelist your IP
```

### Issue: "CORS error"
```javascript
// Solution: Add frontend URL to ALLOWED_ORIGINS
// In .env:
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com

// Or in server.js:
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173'
];
```

### Issue: "Token expired"
```javascript
// Solution: Regenerate token or implement refresh token
exports.switchOrganization = async (req, res) => {
  // Issue new token when user switches org
  const newToken = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });
  res.json({ token: newToken });
};
```

### Issue: "File size exceeds limit"
```javascript
// Solution: Adjust MAX_FILE_SIZE in .env
// Current: 500MB
MAX_FILE_SIZE=500000000

// Or implement chunked upload for larger files
```

### Issue: "Out of memory during video processing"
```javascript
// Solution: Process videos in queue to avoid parallel processing
// Don't process multiple large videos simultaneously
// Implement job queue (Redis, Bull)

// Current: Simple async processing
// Better: Use job queue
const Queue = require('bull');
const videoQueue = new Queue('video-processing');

videoQueue.process(async (job) => {
  await processVideo(job.data.videoId);
});
```

---

**This comprehensive backend guide covers all major concepts, patterns, and implementation details needed to understand and extend the video processing platform!**
