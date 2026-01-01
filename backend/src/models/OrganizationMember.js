const mongoose = require('mongoose');

const organizationMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can belong to an organization only once
organizationMemberSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

// Find membership efficiently
organizationMemberSchema.index({ userId: 1 });
organizationMemberSchema.index({ organizationId: 1 });

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
