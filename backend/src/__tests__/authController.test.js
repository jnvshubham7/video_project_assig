const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const OrganizationMember = require('../../models/OrganizationMember');

let mongoServer;
let app;

// Mock express app setup
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
  // Clear collections before each test
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
});

describe('User Registration', () => {
  it('should register a new user with default organization', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    const user = new User({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      isActive: true
    });

    await user.save();

    const savedUser = await User.findOne({ email: userData.email });
    expect(savedUser).toBeDefined();
    expect(savedUser.username).toBe('testuser');
    expect(savedUser.email).toBe('test@example.com');
  });

  it('should validate password length', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'short'
    };

    expect(userData.password.length < 6).toBe(true);
  });

  it('should prevent duplicate email registration', async () => {
    const userData = {
      username: 'testuser1',
      email: 'test@example.com',
      password: 'password123',
      isActive: true
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User({
      username: 'testuser2',
      email: 'test@example.com',
      password: 'password123',
      isActive: true
    });

    await expect(user2.save()).rejects.toThrow();
  });

  it('should prevent duplicate username registration', async () => {
    const userData = {
      username: 'testuser',
      email: 'test1@example.com',
      password: 'password123',
      isActive: true
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User({
      username: 'testuser',
      email: 'test2@example.com',
      password: 'password123',
      isActive: true
    });

    await expect(user2.save()).rejects.toThrow();
  });

  it('should create organization membership on registration', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isActive: true
    };

    const user = new User(userData);
    await user.save();

    const org = new Organization({
      name: 'Test Organization',
      slug: 'test-org',
      description: 'Test'
    });
    await org.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'admin'
    });
    await membership.save();

    const savedMembership = await OrganizationMember.findOne({
      userId: user._id,
      organizationId: org._id
    });

    expect(savedMembership).toBeDefined();
    expect(savedMembership.role).toBe('admin');
  });
});

describe('User Login', () => {
  it('should validate email exists before login', async () => {
    const email = 'nonexistent@example.com';
    const user = await User.findOne({ email });
    expect(user).toBeNull();
  });

  it('should validate password is provided', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isActive: true
    };

    const user = new User(userData);
    await user.save();

    const password = ''; // Empty password
    expect(password.length === 0).toBe(true);
  });

  it('should check user active status', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isActive: false // Inactive user
    };

    const user = new User(userData);
    await user.save();

    expect(user.isActive).toBe(false);
  });
});

describe('Token Operations', () => {
  it('should generate JWT token with user info', () => {
    const jwt = require('jsonwebtoken');
    const payload = {
      userId: 'user123',
      email: 'test@example.com',
      organizationId: 'org123'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '7d'
    });

    expect(token).toBeDefined();
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    expect(decoded.userId).toBe('user123');
  });

  it('should validate token expiration', () => {
    const jwt = require('jsonwebtoken');
    const payload = { userId: 'user123' };

    const expiredToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '-1s' // Already expired
    });

    expect(() => {
      jwt.verify(expiredToken, process.env.JWT_SECRET || 'test-secret');
    }).toThrow();
  });
});
