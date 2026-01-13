# Quick Reference Guide - Cheat Sheet

## Backend Quick Reference

### Key Files & Their Purpose
```
authController.js    → User login/register/auth logic
videoController.js   → Video CRUD operations
authMiddleware.js    → JWT token verification (ALL protected routes)
rbacMiddleware.js    → Role checking (admin/editor/viewer)
videoProcessingService.js → FFmpeg + sensitivity analysis
videoStreamingService.js  → HTTP Range requests for streaming
```

### API Endpoints at a Glance
```
POST   /api/auth/register           → Create account
POST   /api/auth/login              → Login
GET    /api/auth/me                 → Current user info
POST   /api/auth/switch-organization → Change org

POST   /api/videos                  → Upload video
GET    /api/videos                  → List org videos
GET    /api/videos/:id              → Get video details
GET    /api/videos/:id/stream       → Stream video (Range request)
DELETE /api/videos/:id              → Delete video

GET    /api/organizations/:id/members → List members
POST   /api/organizations/:id/members → Add member
PATCH  /api/organizations/:id/members/:userId → Update role
DELETE /api/organizations/:id/members/:userId → Remove member
```

### Key Concepts
```
JWT Token    → Contains userId, orgId, role, organizations
Role Hierarchy → admin (3) > editor (2) > viewer (1)
Multi-tenancy  → Each org has isolated data
Video Status   → pending → processing → completed/failed
Sensitivity    → Score > 30 = flagged (explicit/violence/hate/etc)
```

### Common Patterns
```
// Protected route
router.post('/videos', authMiddleware, rbacMiddleware('editor'), uploadVideo);

// Check membership
const membership = await OrganizationMember.findOne({ userId, organizationId });

// Emit Socket.io event
io.to(`org-${orgId}`).emit('video-processed', data);

// Validate input
if (!email || !password.length < 6) {
  return res.status(400).json({ error: 'Invalid input' });
}
```

---

## Frontend Quick Reference

### Key Files & Their Purpose
```
App.tsx                   → Root component + routing
authService.ts            → Login/register/token management
videoService.ts           → Video upload/list/stream
socketService.ts          → Real-time Socket.io
OrganizationContext.tsx   → Global state (org, user)
Login.tsx, Register.tsx   → Auth pages
UploadVideo.tsx           → Upload form
VideoPlayer.tsx           → Watch video + sensitivity results
```

### Common Hooks
```
useState(initial)              → Store state
useEffect(() => {}, [deps])    → Run side effects
useContext(SomeContext)        → Access global state
useNavigate()                  → Programmatic routing
useParams()                    → Get URL parameters
useCallback(fn, [deps])        → Memoize function
useMemo(() => calc, [deps])    → Memoize value
```

### Folder Structure (React)
```
components/  → Reusable UI (Header, Toast, ProgressBar)
pages/       → Full pages (UploadVideo, MyVideos, etc)
services/    → API calls + business logic
context/     → Global state management
styles/      → CSS files
```

### Common Patterns
```typescript
// Protected route
<Route element={<ProtectedRoute isAuthenticated={isAuth} />}>
  <Route path="/upload" element={<UploadVideo />} />
</Route>

// API call with loading
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  videoService.getVideos()
    .then(res => setData(res.data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, []);

// Context usage
const { currentOrganization } = useContext(OrganizationContext);

// Toast notification
const { success, error } = useToast();
success('Video uploaded!');
error('Upload failed!');
```

---

## Database Quick Reference

### Schema Summary
```
User
├─ username (unique)
├─ email (unique)
├─ password (hashed)
└─ createdAt

Organization
├─ name (unique)
├─ slug (unique URL-friendly)
└─ description

OrganizationMember
├─ userId (ref: User)
├─ organizationId (ref: Organization)
├─ role (enum: admin/editor/viewer)
└─ Unique index: (userId, organizationId)

Video
├─ title, description
├─ owner (ref: User)
├─ organization (ref: Organization)
├─ status (pending/processing/completed/failed)
├─ sensitivity (score, isFlagged, categories)
├─ metadata (duration, resolution, bitrate, fileSize)
├─ processedFilePath, thumbnailPath
└─ indexes on organizationId, owner, createdAt
```

### Common Mongoose Queries
```javascript
// Create
const user = await User.create({ username, email, password });

// Read
const user = await User.findById(id);
const users = await User.find({ email });
const user = await User.findOne({ username }).select('+password');

// Update
await Video.findByIdAndUpdate(id, { status: 'completed' });

// Delete
await Video.findByIdAndDelete(id);

// Populate (join)
const videos = await Video.find()
  .populate('owner', 'username email')
  .populate('organization', 'name');

// Count
const total = await Video.countDocuments({ organizationId });

// Pagination
const videos = await Video.find()
  .skip((page - 1) * limit)
  .limit(limit);

// Aggregate
const stats = await Video.aggregate([
  { $match: { organizationId } },
  { $group: { _id: null, count: { $sum: 1 } } }
]);
```

---

## Security Quick Reference

### Authentication Flow
```
1. Register:
   - Validate input
   - Hash password (bcrypt)
   - Create user + default org + membership
   - Return JWT token

2. Login:
   - Find user by email/username
   - Compare password (bcrypt)
   - Get all memberships
   - Return JWT token with org context

3. Every Request:
   - Extract token from Authorization header
   - Verify signature with JWT_SECRET
   - Attach userId, orgId, role to request
   - Continue to route handler
```

### Authorization Checks
```
Layer 1: authMiddleware
  ├─ Check: Token exists and valid
  └─ Result: Attach userId, orgId to request

Layer 2: organizationMiddleware
  ├─ Check: User is member of org
  └─ Result: Verify org access

Layer 3: rbacMiddleware
  ├─ Check: User role >= required role
  └─ Result: Prevent access for insufficient roles

Layer 4: Model validation
  ├─ Check: User owns resource or is org admin
  └─ Result: Prevent cross-user data access
```

### Password Security Checklist
```
✓ Minimum 6 characters
✓ Hash with bcrypt (cost factor 10)
✓ Never store plain password
✓ Never log password
✓ Use HTTPS in production
✓ Never send password via email
✓ Implement rate limiting on login attempts
```

### Common Vulnerabilities Prevented
```
SQL Injection       → Use Mongoose ORM + input validation
XSS                → React escapes by default
CSRF               → JWT tokens instead of cookies
Unauthorized Access → authMiddleware + rbacMiddleware
Brute Force        → Bcrypt with cost factor, rate limiting
CORS               → Whitelist allowed origins
```

---

## Testing Quick Reference

### Jest Setup
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  testTimeout: 30000
};
```

### Common Test Patterns
```javascript
// Setup
beforeEach(() => {
  // Run before each test
});

afterEach(() => {
  // Cleanup after each test
});

// Basic test
test('should do something', () => {
  expect(actual).toBe(expected);
});

// Async test
test('should handle promise', async () => {
  const result = await someAsync();
  expect(result).toBeDefined();
});

// Mock/stub
jest.mock('../module');
Module.mockReturnValue('mocked');

// HTTP test
const response = await request(app)
  .post('/api/login')
  .send({ email, password })
  .expect(200);

// Expectations
expect(value).toBe(exact);        // ===
expect(value).toEqual(obj);       // deep equality
expect(value).toBeDefined();       // not undefined
expect(value).toBeNull();          // null
expect(value).toBeTruthy();        // truthy
expect(value).toContain(item);     // array/string
expect(fn).toThrow();              // throws error
```

### Coverage Goals
```
Target: 80% coverage (most code tested)
      - Statements: 80%+
      - Branches: 75%+
      - Functions: 85%+
      - Lines: 80%+
```

---

## Deployment Checklist

### Environment Variables
```bash
# Backend .env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long-random-secret-key
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend .env
VITE_API_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
```

### Pre-deployment Checklist
```
Backend:
  ✓ All tests passing
  ✓ No console.log() in production code
  ✓ Error handling for all async operations
  ✓ Environment variables set
  ✓ Database backups enabled
  ✓ Logging configured
  ✓ CORS whitelist configured
  ✓ Rate limiting added

Frontend:
  ✓ Build successful (npm run build)
  ✓ All sensitive data in .env
  ✓ No console logs in production
  ✓ API URL uses HTTPS
  ✓ Authentication token stored securely
  ✓ Error boundary added
  
Infrastructure:
  ✓ HTTPS/SSL certificate
  ✓ Database backups scheduled
  ✓ Monitoring/alerts set up
  ✓ Load testing done
  ✓ Disaster recovery plan
```

### Scaling Strategy
```
Single server (not scalable):
  ├─ Bottleneck: CPU, memory, storage
  └─ Max users: ~100 concurrent

Load balanced (scalable):
  ├─ Multiple servers behind load balancer
  ├─ Database replication
  ├─ Redis for caching
  ├─ CDN for static files
  └─ Max users: 1,000,000+ concurrent
```

---

## Performance Tips

### Backend Optimization
```
✓ Add database indexes on frequently queried fields
✓ Use .lean() for read-only MongoDB queries
✓ Implement caching (Redis)
✓ Use pagination instead of fetching all records
✓ Implement rate limiting
✓ Use async/await properly (don't block event loop)
✓ Monitor with tools like New Relic or DataDog
```

### Frontend Optimization
```
✓ Code splitting with React.lazy()
✓ Memoization (React.memo, useMemo, useCallback)
✓ Image optimization
✓ Bundle analysis with webpack-bundle-analyzer
✓ Lazy load images
✓ Minimize re-renders
✓ Use CDN for static files
```

### Video Processing Optimization
```
✓ Transcode to lower bitrate (10x smaller file)
✓ Use H.264 codec (widely supported)
✓ Generate multiple formats (mobile/desktop)
✓ Implement adaptive bitrate streaming
✓ Cache transcoded versions
✓ Process asynchronously (don't block API)
```

---

## Debugging Tips

### Backend
```bash
# Add logging
console.log('[AUTH]', 'User:', userId, 'Org:', orgId);

# Use debugger
node --inspect src/server.js
# Then visit chrome://inspect

# Check database
db.videos.findOne({ _id: ObjectId('...') })
db.videos.countDocuments({ organizationId: '...' })

# Test API manually
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/videos
```

### Frontend
```javascript
// React DevTools
// Install Chrome extension: React Developer Tools

// Add logging
console.log('[UPLOAD]', 'Progress:', progress, '%');

// Check state
console.log('State:', { currentOrganization, organizations });

// Network tab
// Browser DevTools → Network tab → see all API calls

// Check localStorage
localStorage.getItem('authToken')
```

### Common Issues
```
"CORS error" 
  → Check ALLOWED_ORIGINS in .env
  → Check frontend URL matches backend whitelist

"JWT token invalid"
  → Check JWT_SECRET is same on all servers
  → Check token not expired
  → Check token format: "Bearer {token}"

"Video not found"
  → Check user has access to org
  → Check video exists in database
  → Check organizationId filter

"Out of memory"
  → Lower video processing concurrency
  → Implement job queue
  → Increase server RAM
```

---

## Interview Q&A Quick Reference

### "Tell me about your project"
```
"It's a multi-tenant video upload and processing platform with:
- User authentication (JWT)
- Role-based access (admin/editor/viewer)
- Async video processing (FFmpeg)
- Content sensitivity analysis (keyword scanning)
- Real-time updates (Socket.io)
- Streaming with Range requests

Frontend: React + TypeScript + Vite
Backend: Node.js + Express + MongoDB
Deployed on Vercel (frontend) and Railway (backend)"
```

### "What was the biggest challenge?"
```
"Handling video processing without blocking the API.
Solution: Made processing async with Socket.io for real-time updates.
Benefits: API returns instantly, users see progress, better UX."
```

### "Why did you use X technology?"
```
React      → Component-based, large ecosystem, fast rendering
TypeScript → Type safety, better IDE support, fewer bugs
Node.js    → Non-blocking I/O, good for real-time apps
MongoDB    → Flexible schema, scales well, good with JavaScript
Socket.io  → Real-time bi-directional communication
FFmpeg     → Industry standard for video processing
```

### "How would you improve it?"
```
1. Job queue (Bull) for better processing scalability
2. Multiple transcoding formats (mobile/desktop)
3. User analytics dashboard
4. Advanced search (Elasticsearch)
5. Video thumbnail gallery
6. Webhook notifications
7. API rate limiting
8. Video watermarking
```

---

## Useful Commands

### Git
```bash
git status                    # See changes
git add .                     # Stage all changes
git commit -m "message"       # Commit
git push origin main          # Push to GitHub
git pull origin main          # Pull latest
git log --oneline             # See commit history
```

### npm
```bash
npm install                   # Install dependencies
npm start                     # Run dev server
npm run build                 # Build for production
npm test                      # Run tests
npm run lint                  # Check code quality
```

### Database
```bash
# MongoDB Cloud Connection
mongodb+srv://user:password@cluster.mongodb.net/dbname

# Local MongoDB
mongosh
  > use video-app
  > db.videos.find()
  > db.videos.count()
```

### Terminal Commands
```bash
# Check if port is in use
lsof -i :5000                 # Backend
lsof -i :3000                 # Frontend

# Create environment file from template
cp .env.example .env
```

---

**Print or bookmark this for quick reference during coding interviews!**

**Remember:** Understand the concepts, not just the syntax!
