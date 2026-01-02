const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
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
});

describe('Role Hierarchy Validation', () => {
  let adminUser, editorUser, viewerUser, organization;
  let adminMembership, editorMembership, viewerMembership;

  beforeEach(async () => {
    // Create test users
    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123'
    });
    await adminUser.save();

    editorUser = new User({
      username: 'editor',
      email: 'editor@example.com',
      password: 'password123'
    });
    await editorUser.save();

    viewerUser = new User({
      username: 'viewer',
      email: 'viewer@example.com',
      password: 'password123'
    });
    await viewerUser.save();

    // Create organization
    organization = new Organization({
      name: 'Test Organization',
      slug: 'test-org'
    });
    await organization.save();

    // Create memberships with different roles
    adminMembership = new OrganizationMember({
      userId: adminUser._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await adminMembership.save();

    editorMembership = new OrganizationMember({
      userId: editorUser._id,
      organizationId: organization._id,
      role: 'editor'
    });
    await editorMembership.save();

    viewerMembership = new OrganizationMember({
      userId: viewerUser._id,
      organizationId: organization._id,
      role: 'viewer'
    });
    await viewerMembership.save();
  });

  it('should allow admin to access all endpoints', async () => {
    const req = {
      userId: adminUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor'); // Requiring editor role
    await middleware(req, res, next);

    // Admin should pass because admin > editor
    expect(next).toHaveBeenCalled();
  });

  it('should allow editor to access editor endpoints', async () => {
    const req = {
      userId: editorUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor'); // Requiring editor role
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow editor to access viewer endpoints', async () => {
    const req = {
      userId: editorUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer'); // Requiring viewer role
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should restrict viewer from accessing editor endpoints', async () => {
    const req = {
      userId: viewerUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor'); // Requiring editor role
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should restrict viewer from accessing admin endpoints', async () => {
    const req = {
      userId: viewerUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('admin'); // Requiring admin role
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for insufficient permissions', async () => {
    const req = {
      userId: viewerUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('Organization Isolation', () => {
  let user1, user2, org1, org2;
  let membership1, membership2;

  beforeEach(async () => {
    // Create two users
    user1 = new User({
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123'
    });
    await user1.save();

    user2 = new User({
      username: 'user2',
      email: 'user2@example.com',
      password: 'password123'
    });
    await user2.save();

    // Create two organizations
    org1 = new Organization({
      name: 'Organization 1',
      slug: 'org-1'
    });
    await org1.save();

    org2 = new Organization({
      name: 'Organization 2',
      slug: 'org-2'
    });
    await org2.save();

    // User1 is admin of org1
    membership1 = new OrganizationMember({
      userId: user1._id,
      organizationId: org1._id,
      role: 'admin'
    });
    await membership1.save();

    // User2 is admin of org2
    membership2 = new OrganizationMember({
      userId: user2._id,
      organizationId: org2._id,
      role: 'admin'
    });
    await membership2.save();
  });

  it('should verify user belongs to organization', async () => {
    const req = {
      userId: user1._id,
      organizationId: org1._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should deny access to unauthorized organizations', async () => {
    const req = {
      userId: user1._id, // User1 is NOT member of org2
      organizationId: org2._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  it('should enforce per-organization role restrictions', async () => {
    // User is admin in org1 but viewer in org2
    const viewerMembership = new OrganizationMember({
      userId: user1._id,
      organizationId: org2._id,
      role: 'viewer'
    });
    await viewerMembership.save();

    // Test access to org2 requiring editor role
    const req = {
      userId: user1._id,
      organizationId: org2._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should allow same user with different roles in different orgs', async () => {
    // User is admin in org1
    const req1 = {
      userId: user1._id,
      organizationId: org1._id
    };
    const res1 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next1 = jest.fn();

    const middleware1 = rbacMiddleware('admin');
    await middleware1(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    // Add user1 as viewer in org2
    const membership = new OrganizationMember({
      userId: user1._id,
      organizationId: org2._id,
      role: 'viewer'
    });
    await membership.save();

    // User should be viewer in org2
    const req2 = {
      userId: user1._id,
      organizationId: org2._id
    };
    const res2 = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next2 = jest.fn();

    const middleware2 = rbacMiddleware('viewer');
    await middleware2(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });
});

describe('Authentication Checks', () => {
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

  it('should reject requests without userId', async () => {
    const req = {
      userId: null,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject requests without organizationId', async () => {
    const req = {
      userId: user._id,
      organizationId: null
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject requests with missing userId', async () => {
    const req = {
      organizationId: organization._id
      // userId is missing
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should reject requests with missing organizationId', async () => {
    const req = {
      userId: user._id
      // organizationId is missing
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should validate user membership exists', async () => {
    const nonMemberUser = new User({
      username: 'nonmember',
      email: 'nonmember@example.com',
      password: 'password123'
    });
    await nonMemberUser.save();

    const req = {
      userId: nonMemberUser._id,
      organizationId: organization._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('Role Hierarchy System', () => {
  let admin, editor, viewer, org;

  beforeEach(async () => {
    admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123'
    });
    await admin.save();

    editor = new User({
      username: 'editor',
      email: 'editor@example.com',
      password: 'password123'
    });
    await editor.save();

    viewer = new User({
      username: 'viewer',
      email: 'viewer@example.com',
      password: 'password123'
    });
    await viewer.save();

    org = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await org.save();

    await new OrganizationMember({
      userId: admin._id,
      organizationId: org._id,
      role: 'admin'
    }).save();

    await new OrganizationMember({
      userId: editor._id,
      organizationId: org._id,
      role: 'editor'
    }).save();

    await new OrganizationMember({
      userId: viewer._id,
      organizationId: org._id,
      role: 'viewer'
    }).save();
  });

  it('should enforce admin > editor > viewer hierarchy', async () => {
    // Test: admin can access everything
    const roles = ['admin', 'editor', 'viewer'];
    
    for (const role of roles) {
      const req = {
        userId: admin._id,
        organizationId: org._id
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = rbacMiddleware(role);
      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('should attach user role to request', async () => {
    const req = {
      userId: editor._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(req.userRole).toBe('editor');
  });

  it('should attach membership object to request', async () => {
    const req = {
      userId: editor._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('viewer');
    await middleware(req, res, next);

    expect(req.membership).toBeDefined();
    expect(req.membership.role).toBe('editor');
  });

  it('should prevent privilege escalation', async () => {
    const req = {
      userId: viewer._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // Viewer trying to access admin endpoint
    const middleware = rbacMiddleware('admin');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Error Messages', () => {
  let user, org;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    org = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await org.save();

    await new OrganizationMember({
      userId: user._id,
      organizationId: org._id,
      role: 'viewer'
    }).save();
  });

  it('should return meaningful error messages for insufficient permissions', async () => {
    const req = {
      userId: user._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor');
    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Insufficient permissions')
      })
    );
  });

  it('should indicate required role in error message', async () => {
    const req = {
      userId: user._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('admin');
    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('admin')
      })
    );
  });

  it('should indicate user role in error message', async () => {
    const req = {
      userId: user._id,
      organizationId: org._id
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    const middleware = rbacMiddleware('editor');
    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('viewer')
      })
    );
  });
});
