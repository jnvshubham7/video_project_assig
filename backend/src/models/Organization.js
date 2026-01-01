const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: 3
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  settings: {
    maxVideoSize: {
      type: Number,
      default: 5368709120 // 5GB in bytes
    },
    maxVideosPerUser: {
      type: Number,
      default: 100
    },
    storageQuota: {
      type: Number,
      default: 107374182400 // 100GB in bytes
    },
    storageUsed: {
      type: Number,
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    allowPublicSharing: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create slug before saving
organizationSchema.pre('save', async function(next) {
  if (!this.isModified('name')) return next();
  
  // Create slug from organization name
  this.slug = this.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .substring(0, 50);
  
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
