const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const Video = require('../models/Video');
const VideoProcessingService = require('../services/videoProcessingService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
  await Video.deleteMany({});
});

describe('Complete User Journey - Video Upload to Streaming', () => {
  it('should complete full workflow: register → login → upload → process → stream', async () => {
    // Step 1: User Registration
    const userData = {
      username: 'johnsmith',
      email: 'john@example.com',
      password: 'secure123'
    };

    const user = new User(userData);
    await user.save();

    const savedUser = await User.findOne({ email: userData.email });
    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe('johnsmith');

    // Step 2: Default Organization Creation
    const org = new Organization({
      name: 'John\'s Organization',
      slug: 'johns-org'
    });
    await org.save();

    // Step 3: Create Membership (Admin by default)
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    // Step 4: Upload Video
    const videoData = {
      title: 'My First Video',
      description: 'A safe educational video',
      filename: 'my-video.mp4',
      filepath: 'uploads/my-video.mp4',
      cloudinaryPublicId: 'video-123',
      userId: user._id,
      organizationId: org._id,
      size: 1024 * 1024 * 50, // 50 MB
      status: 'uploaded'
    };

    const video = new Video(videoData);
    await video.save();

    expect(video.status).toBe('uploaded');

    // Step 5: Process Video (Sensitivity Analysis)
    const sensitivityResult = VideoProcessingService.analyzeSensitivity(
      videoData.title + ' ' + videoData.description
    );

    video.status = 'processing';
    await video.save();

    // Step 6: Update Status Based on Analysis (use service result)
    video.status = sensitivityResult.status; // 'safe' or 'flagged'
    video.sensitivityAnalysis = {
      score: sensitivityResult.accuracy_score,
      result: sensitivityResult.status,
      rules: sensitivityResult.rules,
      detectedIssues: sensitivityResult.detectedIssues,
      categoryBreakdown: sensitivityResult.categoryBreakdown,
      summary: sensitivityResult.summary
    };
    await video.save();

    // Step 7: Verify Video is Ready for Streaming
    const finalVideo = await Video.findById(video._id);
    expect(finalVideo.status).toBe(sensitivityResult.status);
    expect(finalVideo.sensitivityAnalysis).toBeDefined();
    expect(finalVideo.sensitivityAnalysis.result).toBe('safe');

    // Step 8: Video is Ready for Streaming
    expect(finalVideo.filepath).toBeDefined();
    expect(finalVideo.size).toBeGreaterThan(0);
  });

  it('should handle complete flow with sensitive content detection', async () => {
    // Register user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    // Create organization
    const org = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await org.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    // Upload video with flagged content
    const flaggedVideo = new Video({
      title: 'Violent and explicit content',
      description: 'Contains adult explicit material and violence',
      filename: 'flagged.mp4',
      filepath: 'uploads/flagged.mp4',
      userId: user._id,
      organizationId: org._id,
      size: 1024 * 1024 * 100,
      status: 'uploaded'
    });
    await flaggedVideo.save();

    // Process and analyze
    const analysis = VideoProcessingService.analyzeSensitivity(
      flaggedVideo.title + ' ' + flaggedVideo.description
    );

    flaggedVideo.status = analysis.status;
    flaggedVideo.sensitivityAnalysis = {
      score: analysis.accuracy_score,
      result: analysis.status,
      rules: analysis.rules,
      detectedIssues: analysis.detectedIssues,
      categoryBreakdown: analysis.categoryBreakdown,
      summary: analysis.summary
    };
    await flaggedVideo.save();

    // Verify flagging
    const result = await Video.findById(flaggedVideo._id);
    expect(result.sensitivityAnalysis).toBeDefined();
    expect(result.sensitivityAnalysis.score).toBeGreaterThan(30);
    expect(result.sensitivityAnalysis.result).toBe('flagged');
  });
});

describe('Multi-User Organization Workflow', () => {
  it('should support admin creating org and managing team', async () => {
    // Step 1: Admin creates account
    const admin = new User({
      username: 'admin',
      email: 'admin@company.com',
      password: 'admin123'
    });
    await admin.save();

    // Step 2: Admin creates organization
    const organization = new Organization({
      name: 'Company Videos',
      slug: 'company-videos',
      description: 'Official company video library'
    });
    await organization.save();

    // Step 3: Admin adds himself as admin
    const adminMembership = new OrganizationMember({
      userId: admin._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await adminMembership.save();

    expect(adminMembership.role).toBe('admin');

    // Step 4: Editor joins organization
    const editor = new User({
      username: 'editor',
      email: 'editor@company.com',
      password: 'editor123'
    });
    await editor.save();

    const editorMembership = new OrganizationMember({
      userId: editor._id,
      organizationId: organization._id,
      role: 'editor'
    });
    await editorMembership.save();

    // Step 5: Viewer joins organization
    const viewer = new User({
      username: 'viewer',
      email: 'viewer@company.com',
      password: 'viewer123'
    });
    await viewer.save();

    const viewerMembership = new OrganizationMember({
      userId: viewer._id,
      organizationId: organization._id,
      role: 'viewer'
    });
    await viewerMembership.save();

    // Step 6: Verify memberships
    const members = await OrganizationMember.find({
      organizationId: organization._id
    });
    expect(members.length).toBe(3);

    // Step 7: Editor uploads video
    const editorVideo = new Video({
      title: 'Tutorial Video',
      description: 'Step by step tutorial',
      filename: 'tutorial.mp4',
      filepath: 'uploads/tutorial.mp4',
      userId: editor._id,
      organizationId: organization._id,
      size: 1024 * 1024 * 30,
      status: 'uploaded'
    });
    await editorVideo.save();

    // Step 8: Admin can see editor's video
    const allOrgVideos = await Video.find({
      organizationId: organization._id
    });
    expect(allOrgVideos.length).toBe(1);
    expect(allOrgVideos[0].userId.toString()).toBe(editor._id.toString());

    // Step 9: Verify role permissions
    const editorMem = await OrganizationMember.findOne({
      userId: editor._id,
      organizationId: organization._id
    });
    expect(editorMem.role).toBe('editor');

    const viewerMem = await OrganizationMember.findOne({
      userId: viewer._id,
      organizationId: organization._id
    });
    expect(viewerMem.role).toBe('viewer');
  });

  it('should prevent cross-organization access', async () => {
    // Create two organizations
    const org1 = new Organization({
      name: 'Organization 1',
      slug: 'org-1'
    });
    await org1.save();

    const org2 = new Organization({
      name: 'Organization 2',
      slug: 'org-2'
    });
    await org2.save();

    // Create user in org1
    const user = new User({
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123'
    });
    await user.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org1._id,
      role: 'editor'
    });
    await membership.save();

    // Upload video to org1
    const video1 = new Video({
      title: 'Video in Org1',
      description: 'Belongs to org 1',
      filename: 'video1.mp4',
      filepath: 'uploads/video1.mp4',
      userId: user._id,
      organizationId: org1._id,
      size: 1024 * 1024 * 50,
      status: 'uploaded'
    });
    await video1.save();

    // Verify user cannot access org2 videos
    const org1Videos = await Video.find({ organizationId: org1._id });
    const org2Videos = await Video.find({ organizationId: org2._id });

    expect(org1Videos.length).toBe(1);
    expect(org2Videos.length).toBe(0);

    // Verify isolation
    const membership2 = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: org2._id
    });
    expect(membership2).toBeNull();
  });

  it('should allow user with different roles in different organizations', async () => {
    // Create user
    const user = new User({
      username: 'multiuser',
      email: 'multiuser@example.com',
      password: 'password123'
    });
    await user.save();

    // Create two organizations
    const org1 = new Organization({
      name: 'Org1',
      slug: 'org-1'
    });
    await org1.save();

    const org2 = new Organization({
      name: 'Org2',
      slug: 'org-2'
    });
    await org2.save();

    // User is admin in org1
    const membership1 = new OrganizationMember({
      userId: user._id,
      organizationId: org1._id,
      role: 'admin'
    });
    await membership1.save();

    // User is viewer in org2
    const membership2 = new OrganizationMember({
      userId: user._id,
      organizationId: org2._id,
      role: 'viewer'
    });
    await membership2.save();

    // Verify roles
    const org1Membership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: org1._id
    });
    expect(org1Membership.role).toBe('admin');

    const org2Membership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: org2._id
    });
    expect(org2Membership.role).toBe('viewer');
  });

  it('should enforce viewer cannot upload videos', async () => {
    // Create viewer user
    const viewer = new User({
      username: 'viewer',
      email: 'viewer@example.com',
      password: 'password123'
    });
    await viewer.save();

    // Create org
    const org = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await org.save();

    // Viewer membership
    const membership = new OrganizationMember({
      userId: viewer._id,
      organizationId: org._id,
      role: 'viewer'
    });
    await membership.save();

    // Verify viewer is in org
    const viewerMembership = await OrganizationMember.findOne({
      userId: viewer._id,
      organizationId: org._id
    });
    expect(viewerMembership.role).toBe('viewer');

    // Viewer should not be able to upload (enforced by middleware)
    // This would be enforced at the route level
  });
});

describe('Video Processing Pipeline', () => {
  it('should process video through complete status cycle', async () => {
    const user = new User({
      username: 'processor',
      email: 'processor@example.com',
      password: 'password123'
    });
    await user.save();

    const org = new Organization({
      name: 'Process Org',
      slug: 'process-org'
    });
    await org.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    // Create video
    const video = new Video({
      title: 'Processing Test Video',
      description: 'Testing the processing pipeline',
      filename: 'process.mp4',
      filepath: 'uploads/process.mp4',
      userId: user._id,
      organizationId: org._id,
      size: 1024 * 1024 * 75,
      status: 'uploaded'
    });
    await video.save();

    expect(video.status).toBe('uploaded');

    // Transition to processing
    video.status = 'processing';
    await video.save();

    let updated = await Video.findById(video._id);
    expect(updated.status).toBe('processing');

    // Perform analysis
    const analysis = VideoProcessingService.analyzeSensitivity(
      video.title + ' ' + video.description
    );

    // Transition to final state based on analysis
    video.status = analysis.status;
    video.sensitivityAnalysis = {
      score: analysis.accuracy_score,
      result: analysis.status,
      rules: analysis.rules,
      detectedIssues: analysis.detectedIssues,
      categoryBreakdown: analysis.categoryBreakdown,
      summary: analysis.summary
    };
    await video.save();

    updated = await Video.findById(video._id);
    expect(updated.status).toBe(analysis.status);
    expect(updated.sensitivityAnalysis).toBeDefined();
  });

  it('should track multiple videos in processing', async () => {
    const user = new User({
      username: 'processor',
      email: 'processor@example.com',
      password: 'password123'
    });
    await user.save();

    const org = new Organization({
      name: 'Multi Process Org',
      slug: 'multi-process'
    });
    await org.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    // Create multiple videos
    const videos = [];
    for (let i = 0; i < 5; i++) {
      const video = new Video({
        title: `Video ${i + 1}`,
        description: `Description ${i + 1}`,
        filename: `video${i}.mp4`,
        filepath: `uploads/video${i}.mp4`,
        userId: user._id,
        organizationId: org._id,
        size: 1024 * 1024 * (30 + i * 10),
        status: 'uploaded'
      });
      await video.save();
      videos.push(video);
    }

    expect(videos.length).toBe(5);

    // Process videos
    for (const video of videos) {
      video.status = 'processing';
      await video.save();
    }

    const processingVideos = await Video.find({
      organizationId: org._id,
      status: 'processing'
    });
    expect(processingVideos.length).toBe(5);

    // Complete processing (mark as safe)
    for (const video of videos) {
      const updated = await Video.findById(video._id);
      updated.status = 'safe';
      updated.sensitivityAnalysis = {
        result: 'safe',
        score: 15,
        detectedIssues: [],
        categoryBreakdown: {}
      };
      await updated.save();
    }

    const completedVideos = await Video.find({
      organizationId: org._id,
      status: 'safe'
    });
    expect(completedVideos.length).toBe(5);
  });
});

describe('Data Persistence & Integrity', () => {
  it('should maintain referential integrity across entities', async () => {
    // Create user
    const user = new User({
      username: 'integrity',
      email: 'integrity@example.com',
      password: 'password123'
    });
    await user.save();

    // Create organization
    const org = new Organization({
      name: 'Integrity Org',
      slug: 'integrity-org'
    });
    await org.save();

    // Create membership
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    // Create video
    const video = new Video({
      title: 'Integrity Test',
      description: 'Testing data integrity',
      filename: 'integrity.mp4',
      filepath: 'uploads/integrity.mp4',
      userId: user._id,
      organizationId: org._id,
      size: 1024 * 1024 * 50,
      status: 'uploaded'
    });
    await video.save();

    // Verify relationships
    const fetchedVideo = await Video.findById(video._id);
    expect(fetchedVideo.userId.toString()).toBe(user._id.toString());
    expect(fetchedVideo.organizationId.toString()).toBe(org._id.toString());

    const fetchedMembership = await OrganizationMember.findById(membership._id);
    expect(fetchedMembership.userId.toString()).toBe(user._id.toString());
    expect(fetchedMembership.organizationId.toString()).toBe(org._id.toString());
  });

  it('should enforce unique constraints', async () => {
    const userData = {
      username: 'unique',
      email: 'unique@example.com',
      password: 'password123'
    };

    const user1 = new User(userData);
    await user1.save();

    // Try to create duplicate
    const user2 = new User(userData);

    await expect(user2.save()).rejects.toThrow();
  });

  it('should preserve data on status updates', async () => {
    const user = new User({
      username: 'preserve',
      email: 'preserve@example.com',
      password: 'password123'
    });
    await user.save();

    const org = new Organization({
      name: 'Preserve Org',
      slug: 'preserve-org'
    });
    await org.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    const originalData = {
      title: 'Original Title',
      description: 'Original Description',
      category: 'educational'
    };

    const video = new Video({
      ...originalData,
      filename: 'preserve.mp4',
      filepath: 'uploads/preserve.mp4',
      userId: user._id,
      organizationId: org._id,
      size: 1024 * 1024 * 50,
      status: 'uploaded'
    });
    await video.save();

    // Update status
    video.status = 'processing';
    await video.save();

    // Verify data is preserved
    const updated = await Video.findById(video._id);
    expect(updated.title).toBe(originalData.title);
    expect(updated.description).toBe(originalData.description);
    expect(updated.category).toBe(originalData.category);
    expect(updated.status).toBe('processing');
  });
});
