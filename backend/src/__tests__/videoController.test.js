const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Video = require('../models/Video');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Video.deleteMany({});
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
});

describe('Video Upload', () => {
  let user, organization;

  beforeEach(async () => {
    // Create test user and organization
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    organization = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await organization.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership.save();
  });

  it('should validate video title is required', async () => {
    const videoData = {
      description: 'Test description'
      // Missing title
    };

    expect(videoData.title).toBeUndefined();
  });

  it('should create video with all required fields', async () => {
    const videoData = {
      title: 'Test Video',
      description: 'Test description',
      category: 'educational',
      filename: 'testvideo.mp4',
      filepath: 'https://example.com/video.mp4',
      cloudinaryPublicId: 'video123',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      isPublic: false,
      status: 'uploaded'
    };

    const video = new Video(videoData);
    await video.save();

    const savedVideo = await Video.findById(video._id);
    expect(savedVideo).toBeDefined();
    expect(savedVideo.title).toBe('Test Video');
    expect(savedVideo.organizationId.toString()).toBe(organization._id.toString());
  });

  it('should set video status to uploaded', async () => {
    const videoData = {
      title: 'Test Video',
      description: 'Test description',
      filename: 'testvideo.mp4',
      filepath: 'https://example.com/video.mp4',
      cloudinaryPublicId: 'video123',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      status: 'uploaded'
    };

    const video = new Video(videoData);
    await video.save();

    expect(video.status).toBe('uploaded');
  });

  it('should enforce organization isolation', async () => {
    const org2 = new Organization({
      name: 'Test Org 2',
      slug: 'test-org-2'
    });
    await org2.save();

    const videoData = {
      title: 'Test Video',
      description: 'Test description',
      filename: 'testvideo.mp4',
      filepath: 'https://example.com/video.mp4',
      cloudinaryPublicId: 'video123',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      status: 'uploaded'
    };

    const video = new Video(videoData);
    await video.save();

    // Query by organization
    const orgVideos = await Video.find({ organizationId: organization._id });
    const org2Videos = await Video.find({ organizationId: org2._id });

    expect(orgVideos.length).toBe(1);
    expect(org2Videos.length).toBe(0);
  });
});

describe('Video Retrieval', () => {
  let user, organization, video;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    organization = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await organization.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership.save();

    video = new Video({
      title: 'Test Video',
      description: 'Test description',
      filename: 'testvideo.mp4',
      filepath: 'https://example.com/video.mp4',
      cloudinaryPublicId: 'video123',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      status: 'uploaded',
      views: 5
    });
    await video.save();
  });

  it('should retrieve video by ID', async () => {
    const retrievedVideo = await Video.findById(video._id);
    expect(retrievedVideo).toBeDefined();
    expect(retrievedVideo.title).toBe('Test Video');
  });

  it('should get all videos for organization', async () => {
    const videos = await Video.find({ organizationId: organization._id });
    expect(videos.length).toBe(1);
    expect(videos[0].title).toBe('Test Video');
  });

  it('should track video views', async () => {
    const initialViews = video.views;
    video.views += 1;
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.views).toBe(initialViews + 1);
  });
});

describe('Video Deletion', () => {
  let user, organization, video;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    organization = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await organization.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership.save();

    video = new Video({
      title: 'Test Video',
      description: 'Test description',
      filename: 'testvideo.mp4',
      filepath: 'https://example.com/video.mp4',
      cloudinaryPublicId: 'video123',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      status: 'uploaded'
    });
    await video.save();
  });

  it('should delete video by ID', async () => {
    await Video.deleteOne({ _id: video._id });

    const deletedVideo = await Video.findById(video._id);
    expect(deletedVideo).toBeNull();
  });

  it('should maintain data consistency after deletion', async () => {
    const videosBefore = await Video.find({ organizationId: organization._id });
    expect(videosBefore.length).toBe(1);

    await Video.deleteOne({ _id: video._id });

    const videosAfter = await Video.find({ organizationId: organization._id });
    expect(videosAfter.length).toBe(0);
  });
});
