const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    minlength: 3
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  filename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  duration: {
    type: Number,
    default: 0
  },
  size: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allowedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  tags: [String],
  category: {
    type: String,
    default: 'general',
    enum: ['general', 'educational', 'entertainment', 'tutorial', 'other']
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'safe', 'flagged', 'failed'],
    default: 'uploaded',
    index: true
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  sensitivityAnalysis: {
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    result: {
      type: String,
      enum: ['safe', 'flagged'],
      default: 'safe'
    },
    rules: [String],
    summary: {
      type: String,
      default: ''
    },
    detectedIssues: [
      {
        category: String,
        score: Number,
        keywords: [String]
      }
    ],
    categoryBreakdown: {
      type: Map,
      of: {
        score: Number,
        keywords: [String]
      },
      default: new Map()
    },
    analyzedAt: Date
  },
  processingErrors: [
    {
      step: String,
      error: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  processingStartedAt: Date,
  processingCompletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for user and organization for efficient filtering
videoSchema.index({ userId: 1, organizationId: 1 });
videoSchema.index({ organizationId: 1, createdAt: -1 });
videoSchema.index({ status: 1, organizationId: 1 });
videoSchema.index({ 'sensitivityAnalysis.result': 1, organizationId: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ size: 1 });

module.exports = mongoose.model('Video', videoSchema);
