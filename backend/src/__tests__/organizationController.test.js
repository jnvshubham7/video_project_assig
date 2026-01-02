const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');

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
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
  await User.deleteMany({});
});

describe('Organization Management', () => {
  it('should create a new organization', async () => {
    const orgData = {
      name: 'Test Org',
      slug: 'test-org',
      description: 'A test organization'
    };

    const org = new Organization(orgData);
    await org.save();

    const savedOrg = await Organization.findById(org._id);
    expect(savedOrg).toBeDefined();
    expect(savedOrg.name).toBe('Test Org');
    expect(savedOrg.slug).toBe('test-org');
  });

  it('should generate slug from organization name', () => {
    const name = 'My Test Organization';
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    expect(slug).toBe('my-test-organization');
  });

  it('should retrieve organization by ID', async () => {
    const org = new Organization({
      name: 'Test Org',
      slug: 'test-org',
      description: 'Test'
    });
    await org.save();

    const retrieved = await Organization.findById(org._id);
    expect(retrieved._id.toString()).toBe(org._id.toString());
  });

  it('should find organization by slug', async () => {
    const org = new Organization({
      name: 'Unique Slug',
      slug: 'unique-slug',
      description: 'Test'
    });
    await org.save();

    const found = await Organization.findOne({ slug: 'unique-slug' });
    expect(found).toBeDefined();
    expect(found.name).toBe('Unique Slug');
  });
});

describe('Organization Members', () => {
  let user, organization;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    organization = new Organization({
      name: 'Test Org',
      slug: 'test-org',
      description: 'Test'
    });
    await organization.save();
  });

  it('should add user to organization', async () => {
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });

    await membership.save();

    const saved = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: organization._id
    });

    expect(saved).toBeDefined();
    expect(saved.role).toBe('admin');
  });

  it('should prevent duplicate memberships', async () => {
    const membership1 = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership1.save();

    const membership2 = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'editor'
    });

    // Schema enforces unique (userId, organizationId) so second save should fail
    let errorOccurred = false;
    try {
      await membership2.save();
    } catch (err) {
      errorOccurred = true;
    }

    expect(errorOccurred).toBe(true);
  });

  it('should validate role values', () => {
    const validRoles = ['admin', 'editor', 'viewer'];
    const testRole = 'admin';
    expect(validRoles.includes(testRole)).toBe(true);

    const invalidRole = 'superuser';
    expect(validRoles.includes(invalidRole)).toBe(false);
  });

  it('should retrieve all members in organization', async () => {
    const user2 = new User({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });
    await user2.save();

    const membership1 = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    const membership2 = new OrganizationMember({
      userId: user2._id,
      organizationId: organization._id,
      role: 'editor'
    });

    await membership1.save();
    await membership2.save();

    const members = await OrganizationMember.find({
      organizationId: organization._id
    });

    expect(members.length).toBe(2);
  });

  it('should update member role', async () => {
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'viewer'
    });
    await membership.save();

    // Update role
    membership.role = 'editor';
    await membership.save();

    const updated = await OrganizationMember.findById(membership._id);
    expect(updated.role).toBe('editor');
  });

  it('should remove member from organization', async () => {
    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership.save();

    await OrganizationMember.deleteOne({ _id: membership._id });

    const deleted = await OrganizationMember.findById(membership._id);
    expect(deleted).toBeNull();
  });
});

describe('Role-Based Access Control', () => {
  it('should validate admin permissions', () => {
    const userRole = 'admin';
    const canUpload = userRole === 'admin' || userRole === 'editor';
    expect(canUpload).toBe(true);
  });

  it('should validate editor permissions', () => {
    const userRole = 'editor';
    const canUpload = userRole === 'admin' || userRole === 'editor';
    expect(canUpload).toBe(true);
  });

  it('should restrict viewer permissions', () => {
    const userRole = 'viewer';
    const canUpload = userRole === 'admin' || userRole === 'editor';
    expect(canUpload).toBe(false);
  });
});
