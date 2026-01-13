# Video Processing Platform - Comprehensive Learning Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Core Concepts](#core-concepts)
4. [Architecture Deep Dive](#architecture-deep-dive)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Database Design](#database-design)
8. [Security & Authentication](#security--authentication)
9. [API Design Patterns](#api-design-patterns)
10. [Interview Topics](#interview-topics)
11. [Best Practices](#best-practices)

---

## Project Overview

### What is this project?
A **full-stack video platform** where users can:
- Register and create/join organizations
- Upload videos
- Process videos (transcoding, analysis)
- Analyze video sensitivity (adult content, violence, hate speech, etc.)
- Stream videos with range request support
- Manage team members with role-based access control (RBAC)
- Real-time processing notifications via WebSockets

### Key Features
- **Multi-tenant**: Multiple organizations with separate data
- **Role-based Access Control**: Admin, Editor, Viewer roles
- **Real-time Processing**: WebSocket notifications during video processing
- **Video Processing**: FFmpeg-based transcoding and analysis
- **Sensitivity Analysis**: AI-powered keyword scanning for content moderation
- **Secure Authentication**: JWT-based tokens with organization context
- **Scalable Storage**: Cloudinary/S3 integration

---

## Tech Stack

### Backend (Node.js + Express)
```
Node.js 22.21.1
├── Express 4.18.2          (Web framework)
├── Mongoose 8.0.3          (MongoDB ODM)
├── JWT 9.0.2               (Authentication)
├── bcryptjs 2.4.3          (Password hashing)
├── fluent-ffmpeg 2.1.2     (Video processing)
├── ffmpeg-static 5.2.0     (Static FFmpeg binary)
├── ffprobe-static 3.1.0    (Video metadata extraction)
├── Multer 1.4.5            (File upload middleware)
├── Cloudinary 1.41.3       (Cloud storage)
├── Socket.io 4.7.0         (Real-time communication)
├── CORS 2.8.5              (Cross-origin requests)
└── dotenv 16.3.1           (Environment variables)

Testing:
├── Jest 29.7.0             (Testing framework)
├── Supertest 6.3.3         (HTTP testing)
└── mongodb-memory-server   (In-memory MongoDB)
```

### Frontend (React + TypeScript)
```
React 18.2.0
├── Vite 7.2.4              (Build tool - faster than Webpack)
├── TypeScript 5.9.3        (Type safety)
├── React Router 7.0.0      (Client-side routing)
├── Axios 1.6.0             (HTTP client)
├── Socket.io-client 4.8.3  (Real-time updates)
└── ESLint                  (Code quality)

Testing:
├── Jest 29.7.0
├── React Testing Library   (Component testing)
└── @testing-library utilities
```

### Infrastructure
```
MongoDB         → Database
Railway/Vercel  → Hosting
Docker          → Containerization
```

---

## Core Concepts

### 1. Multi-Tenancy Architecture
**What**: Multiple organizations (tenants) use the same application with isolated data.

**How it works**:
```
User (Global Identity)
├── Can be member of multiple organizations
└── Each membership has a specific role

Organization (Tenant)
├── Contains videos
├── Contains members
└── Isolated data from other organizations
```

**Example**:
- User "john@example.com" can be:
  - Admin in "Acme Corp" organization
  - Viewer in "Tech Startup" organization
  - Editor in "Content Team" organization

### 2. Role-Based Access Control (RBAC)
**What**: Users have different permission levels based on their role.

**Role Hierarchy** (admin > editor > viewer):
| Role | Upload Videos | Edit Videos | Delete Videos | Manage Members | View Reports |
|------|---------------|------------|---------------|----------------|-------------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | Own only | ✗ | ✓ |
| Viewer | ✗ | ✗ | ✗ | ✗ | ✓ |

### 3. JWT Authentication
**What**: Stateless authentication using JSON Web Tokens.

**Token Structure**:
```javascript
{
  userId: "user123",
  email: "user@example.com",
  currentOrganizationId: "org456",
  currentOrganizationRole: "admin",
  organizations: [
    { id: "org456", role: "admin" },
    { id: "org789", role: "viewer" }
  ],
  iat: 1704283200,
  exp: 1704369600
}
```

**Why JWT?**
- Stateless (no server-side session storage)
- Scalable (works with load balancers)
- Can contain organization context
- Includes expiration for security

### 4. Video Processing Pipeline
**What**: Automated workflow that processes uploaded videos.

**Steps**:
```
Upload Video → Enqueue → Processing → Sensitivity Analysis → Complete
                  ↓
            WebSocket Notification
```

**Processing Tasks**:
1. **Transcoding**: Convert video to standard formats (MP4, WebM)
2. **Thumbnail Extraction**: Generate preview images
3. **Metadata Extraction**: Get video duration, resolution, bitrate
4. **Sensitivity Analysis**: Scan for inappropriate content
5. **Status Update**: Push notifications via Socket.io

### 5. Sensitivity Analysis
**What**: AI-powered content moderation system.

**Categories**:
- **Explicit**: Adult/sexual content (weight: 40)
- **Violence**: Gore, weapons, fighting (weight: 30)
- **Hate Speech**: Discrimination, slurs (weight: 35)
- **Illegal**: Drug references, crime (weight: 35)
- **Harmful**: Self-harm, abuse (weight: 38)
- **Spam**: Clickbait, misinformation (weight: 20)

**Scoring Algorithm**:
```
Score = Sum of (keyword_weight × keyword_matches)
Flagged if Score > 30 (threshold)

Example:
Video Title: "Free Money - Make $10k in 1 Hour!!!"
- Keywords: "Free" (spam), "Money" (spam), "Make" (neutral)
- Score: 20 × 2 = 40
- Result: FLAGGED (Spam/Misleading)
```

### 6. WebSocket Real-time Communication
**What**: Bi-directional communication for instant updates.

**Events**:
- `join-org`: User joins organization room
- `video-status`: Video processing status update
- `processing-complete`: Video finished processing
- `new-member`: New member added to organization

**Benefits**:
- Real-time progress bars
- Instant notifications
- No polling needed
- Scalable with multiple users

---

## Architecture Deep Dive

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Auth Pages   │  │ Video Pages  │  │ Organization     │      │
│  │ (Login,      │  │ (Upload,     │  │ Management       │      │
│  │ Register)    │  │ Stream, View)│  │ (Members, Roles) │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└────────┬──────────────────────────────────────────────────────┬─┘
         │ Axios HTTP Requests                   Socket.io      │
         │                                       Connection     │
┌────────▼────────────────────────────────────────────────────┬──▼─┐
│                   BACKEND (Express.js)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Authentication Layer                       │   │
│  │  (JWT verification, CORS, Rate limiting)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Routes & Controllers                        │   │
│  │  ├── Auth Routes (register, login, switch org)         │   │
│  │  ├── Video Routes (upload, get, stream, delete)        │   │
│  │  └── Organization Routes (members, settings)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Business Logic Layer                        │   │
│  │  ├── Video Processing Service (FFmpeg)                 │   │
│  │  ├── Video Streaming Service (Range requests)          │   │
│  │  └── Sensitivity Analysis Service                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Data Access Layer (Models)                 │   │
│  │  ├── User Model                                        │   │
│  │  ├── Organization Model                                │   │
│  │  ├── OrganizationMember Model                           │   │
│  │  └── Video Model                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────────────────┴───┐
         │ Mongoose                                                   │
┌────────▼──────────────────────────────────────────────────────────┐
│                    MongoDB Database                                │
│  ├── users collection                                             │
│  ├── organizations collection                                     │
│  ├── organizationmembers collection                               │
│  └── videos collection                                            │
└─────────────────────────────────────────────────────────────────────┘

External Services:
├── Cloudinary (Video storage)
├── FFmpeg (Video processing)
└── SMTP (Email notifications - future)
```

### Request Flow Example: Upload & Process Video

```
1. USER UPLOADS VIDEO
   Frontend → POST /api/videos/upload
   │
   └─ Multer middleware validates file
   └─ authMiddleware verifies JWT token
   └─ rbacMiddleware checks if user is editor/admin
   └─ organizationMiddleware ensures org context
   └─ videoController.uploadVideo()
      ├─ Save file to Cloudinary
      ├─ Create Video document in MongoDB
      ├─ Enqueue processing task
      └─ Return video metadata

2. VIDEO PROCESSING (Async)
   videoProcessingService.processVideo()
   ├─ Update status → "processing"
   ├─ Socket.io broadcast: "video-status"
   │
   ├─ Transcoding (FFmpeg)
   │  └─ Convert to MP4
   │
   ├─ Metadata Extraction
   │  └─ Duration, resolution, bitrate
   │
   ├─ Thumbnail Generation
   │  └─ Extract frame at 1s mark
   │
   ├─ Sensitivity Analysis
   │  ├─ Scan title/description keywords
   │  ├─ Calculate sensitivity score
   │  └─ Mark as "flagged" if score > threshold
   │
   ├─ Update status → "completed"
   ├─ Save results to MongoDB
   └─ Socket.io broadcast: "processing-complete"

3. USER VIEWS VIDEO
   Frontend → GET /api/videos/:id/stream
   │
   └─ authMiddleware verifies token
   └─ rbacMiddleware checks viewer role
   └─ videoStreamingService.streamVideo()
      ├─ Check HTTP Range header
      ├─ Calculate byte range
      ├─ Return video chunk with 206 Partial Content
      └─ Client continues requesting chunks until complete
```

---

## Backend Implementation

### Directory Structure
```
backend/
├── src/
│   ├── server.js                 # Express app setup, Socket.io
│   ├── config/
│   │   └── multerConfig.js       # File upload configuration
│   ├── controllers/              # Request handlers
│   │   ├── authController.js     # Auth logic
│   │   ├── videoController.js    # Video logic
│   │   └── organizationController.js
│   ├── middleware/               # Express middleware
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── rbacMiddleware.js     # Role checking
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js
│   │   ├── Organization.js
│   │   ├── OrganizationMember.js
│   │   └── Video.js
│   ├── routes/                   # Route definitions
│   │   ├── authRoutes.js
│   │   ├── videoRoutes.js
│   │   └── organizationRoutes.js
│   ├── services/                 # Business logic
│   │   ├── videoProcessingService.js
│   │   └── videoStreamingService.js
│   └── __tests__/               # Test files
├── package.json
├── jest.config.js
└── jest-setup.js
```

### Key Controllers

#### authController.js
**Responsibilities**:
- User registration
- User login
- Token refresh
- Organization switching
- Get current user info

**Key Functions**:
```javascript
register()      → Create user + default org + membership
login()         → Verify credentials + return JWT token
switchOrganization() → Change active org in token
getCurrentUser() → Return user + current org + all orgs
```

#### videoController.js
**Responsibilities**:
- Upload video
- Get video list/details
- Delete video
- Stream video
- Update video metadata

**Key Functions**:
```javascript
uploadVideo()   → Save to Cloudinary + DB + enqueue processing
getVideos()     → List org videos with pagination
getVideoById()  → Get single video details
deleteVideo()   → Remove video file + DB record
streamVideo()   → Handle Range requests for streaming
```

#### organizationController.js
**Responsibilities**:
- Manage organization members
- Update member roles
- Remove members
- Organization settings

### Key Services

#### videoProcessingService.js
```javascript
CLASS: VideoProcessingService
├── setupFFmpegPaths()           // Configure FFmpeg
├── processVideo()               // Main processing pipeline
├── analyzeSensitivity()         // Keyword-based analysis
├── calculateSensitivityScore()  // Score calculation
├── extractMetadata()            // Duration, resolution, etc.
├── transcodingVideo()           // FFmpeg transcoding
└── generateThumbnail()          // Extract preview image
```

**Sensitivity Analysis Algorithm**:
```javascript
analyzeSensitivity(videoMetadata) {
  let totalScore = 0;
  
  for (category in KEYWORD_CATEGORIES) {
    let categoryScore = 0;
    
    for (keyword in category.keywords) {
      const matches = countMatches(text, keyword);
      categoryScore += matches * category.weight;
    }
    
    totalScore += categoryScore;
  }
  
  return {
    score: totalScore,
    isFlagged: totalScore > THRESHOLD,
    categories: detailedBreakdown
  };
}
```

#### videoStreamingService.js
**HTTP Range Request Support**:
```javascript
streamVideo(videoPath, range) {
  // Client sends: Range: bytes=0-1023
  // Server returns: 206 Partial Content with bytes 0-1023
  // Client requests next chunk: Range: bytes=1024-2047
  // Continue until EOF
  
  Benefits:
  ✓ Seek in video (don't need to download from start)
  ✓ Resume downloads after interruption
  ✓ Efficient bandwidth usage
  ✓ Browser video player support
}
```

---

## Frontend Implementation

### Directory Structure
```
frontend/src/
├── App.tsx                  # Main app component
├── main.tsx                 # Entry point
├── setupTests.ts            # Jest configuration
├── components/              # Reusable components
│   ├── Header.tsx          # Navigation
│   ├── ProtectedRoute.tsx  # Auth guard
│   ├── Toast.tsx           # Notifications
│   └── ProgressBar.tsx     # Upload progress
├── context/                # State management
│   └── OrganizationContext.tsx
├── pages/                  # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Home.tsx
│   ├── UploadVideo.tsx
│   ├── MyVideos.tsx
│   ├── AllVideos.tsx
│   ├── VideoPlayer.tsx
│   ├── MemberManagement.tsx
│   └── OrganizationSettings.tsx
├── services/               # API calls
│   ├── authService.ts
│   ├── videoService.ts
│   ├── organizationService.ts
│   └── socketService.ts
├── styles/                 # CSS files
│   ├── Auth.css
│   ├── Home.css
│   ├── Upload.css
│   └── Videos.css
└── assets/                 # Images, icons
```

### State Management: OrganizationContext
```typescript
interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization(orgId: string): Promise<void>;
  updateOrganizations(orgs: Organization[]): void;
}

// Usage:
const { currentOrganization, organizations, switchOrganization } = useContext(OrganizationContext);
```

### Key Components

#### ProtectedRoute.tsx
```typescript
// Guards routes that require authentication
<Route element={<ProtectedRoute />}>
  <Route path="/upload" element={<UploadVideo />} />
  <Route path="/videos" element={<MyVideos />} />
</Route>
```

#### UploadVideo.tsx
**Features**:
- Form validation
- File type checking
- Progress bar during upload
- Real-time processing status via Socket.io
- Sensitivity analysis results display

```typescript
// Flow:
1. User selects video file
2. Frontend validates (size, format)
3. Show progress bar
4. Upload to backend
5. Listen to Socket.io events for processing status
6. Display results (sensitivity, metadata)
```

#### VideoPlayer.tsx
**Features**:
- Stream video with Range requests
- Show video metadata
- Display sensitivity flags
- Download option

### Key Services

#### authService.ts
```typescript
register(username, email, password, organizationName)
login(identifier, password)
getCurrentUser()
getMyOrganizations()
switchOrganization(orgId)
logout()
getAuthToken()
setAuthToken(token)
```

#### videoService.ts
```typescript
uploadVideo(file, title, description)
getVideos(page, limit)
getVideoById(id)
deleteVideo(id)
getVideoStream(id, range?)
searchVideos(query)
```

#### socketService.ts
```typescript
connect(organizationId)
joinOrganization(orgId)
leaveOrganization(orgId)
onVideoStatus(callback)
onProcessingComplete(callback)
disconnect()
```

---

## Database Design

### User Model
```javascript
{
  username:   String (unique, min 3),
  email:      String (unique, valid email),
  password:   String (hashed with bcrypt),
  isActive:   Boolean (default: true),
  createdAt:  Date (auto),
  
  // Relationships:
  // → OrganizationMember (one-to-many)
  // → Video (one-to-many, as owner)
}
```

**Key Methods**:
```javascript
comparePassword(password)  → Compare plain vs hashed
toJSON()                  → Exclude password in responses
```

### Organization Model
```javascript
{
  name:          String (unique),
  slug:          String (unique, URL-friendly),
  description:   String,
  createdAt:     Date (auto),
  updatedAt:     Date (auto),
  
  // Relationships:
  // → OrganizationMember (one-to-many)
  // → Video (one-to-many)
}
```

### OrganizationMember Model
```javascript
{
  userId:         ObjectId (ref: User),
  organizationId: ObjectId (ref: Organization),
  role:           String (enum: ['admin', 'editor', 'viewer']),
  joinedAt:       Date (auto),
  
  // Composite unique index: (userId, organizationId)
  // Ensures user can only have one role per org
}
```

### Video Model
```javascript
{
  title:              String (required),
  description:        String,
  owner:              ObjectId (ref: User),
  organization:       ObjectId (ref: Organization),
  originalFilePath:   String (Cloudinary URL),
  processedFilePath:  String (MP4 on Cloudinary),
  thumbnailPath:      String (Thumbnail URL),
  
  // Metadata
  duration:           Number (seconds),
  resolution:         String (e.g., "1920x1080"),
  bitrate:            String (e.g., "5000k"),
  fileSize:           Number (bytes),
  
  // Processing
  status:             String (enum: ['pending', 'processing', 'completed', 'failed']),
  processingError:    String,
  
  // Sensitivity
  sensitivity: {
    score:           Number (0-100+),
    isFlagged:       Boolean (> threshold),
    categories: {
      explicit:      Number,
      violence:      Number,
      hate:          Number,
      illegal:       Number,
      harmful:       Number,
      spam:          Number
    },
    flaggedReasons:  [String]
  },
  
  // Access control
  visibility:        String (enum: ['private', 'org-members', 'public']),
  viewedBy:          [ObjectId] (users who viewed),
  createdAt:         Date (auto),
  updatedAt:         Date (auto)
}
```

### Database Indexing Strategy
```javascript
// Performance optimizations
db.organizationmembers.createIndex({ userId: 1, organizationId: 1 }, { unique: true });
db.videos.createIndex({ organizationId: 1, createdAt: -1 });
db.videos.createIndex({ owner: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.organizations.createIndex({ slug: 1 }, { unique: true });
```

**Why these indexes?**
- Fast membership lookups during auth
- Efficient video list queries per org
- Quick user searches by email/username
- Organization slug-based URL handling

---

## Security & Authentication

### JWT Token Structure & Lifecycle

#### Token Creation (Login)
```javascript
const token = jwt.sign(
  {
    userId: user._id.toString(),
    email: user.email,
    currentOrganizationId: selectedOrg._id.toString(),
    currentOrganizationRole: membership.role,
    organizations: [
      { id: org1._id, name: org1.name, role: 'admin' },
      { id: org2._id, name: org2.name, role: 'viewer' }
    ]
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

#### Token Verification (Every Request)
```javascript
// authMiddleware.js
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.organizationId = decoded.currentOrganizationId;
    req.userRole = decoded.currentOrganizationRole;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Password Security

#### Hashing with Bcrypt
```javascript
// User Model pre-save hook
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);  // Cost factor 10
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Why Bcrypt?**
- Adaptive (can increase cost factor as CPUs get faster)
- Built-in salt generation
- Slow by design (prevents brute-force attacks)
- Industry standard

#### Password Comparison
```javascript
userSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};
```

### CORS Configuration
```javascript
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://video-filter-iota.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**What is CORS?**
- Cross-Origin Resource Sharing
- Browser security: prevents malicious websites from accessing your API
- Frontend at `localhost:3000` requests API at `localhost:5000`
- API must explicitly allow this origin

### Multi-tenancy Security

#### Organization Middleware
```javascript
const organizationMiddleware = async (req, res, next) => {
  const userId = req.userId;
  const organizationId = req.organizationId;
  
  // Check if user is actually a member of this org
  const membership = await OrganizationMember.findOne({
    userId, organizationId
  });
  
  if (!membership) {
    return res.status(403).json({ error: 'User not in this organization' });
  }
  
  next();
};
```

**Why needed?**
- User JWT contains organizationId
- User could manually change JWT organizationId in local storage
- Server must verify user is actually member of requested org
- Prevents user from accessing other org's data

#### RBAC Middleware
```javascript
const rbacMiddleware = (requiredRole) => {
  return async (req, res, next) => {
    const membership = await OrganizationMember.findOne({
      userId: req.userId,
      organizationId: req.organizationId
    });
    
    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    
    if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage:
router.post('/videos', authMiddleware, rbacMiddleware('editor'), uploadVideo);
```

**Role Hierarchy**:
```
admin (3)  - highest
  ↓
editor (2) - middle
  ↓
viewer (1) - lowest
```

### Input Validation & Sanitization
```javascript
// Register validation
if (!username || !email || !password) {
  return res.status(400).json({ error: 'Missing required fields' });
}

if (password.length < 6) {
  return res.status(400).json({ error: 'Password too short' });
}

if (!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

---

## API Design Patterns

### RESTful Endpoint Structure
```
Authentication
  POST   /api/auth/register       → Register new user
  POST   /api/auth/login          → Login user
  GET    /api/auth/me             → Get current user
  POST   /api/auth/switch-organization → Change active org
  GET    /api/auth/my-organizations → List user's orgs

Videos
  POST   /api/videos              → Upload video
  GET    /api/videos              → List org's videos
  GET    /api/videos/:id          → Get video details
  GET    /api/videos/:id/stream   → Stream video
  DELETE /api/videos/:id          → Delete video
  PATCH  /api/videos/:id          → Update metadata

Organization
  GET    /api/organizations/:id/members     → List members
  POST   /api/organizations/:id/members     → Add member
  PATCH  /api/organizations/:id/members/:userId → Update role
  DELETE /api/organizations/:id/members/:userId → Remove member
```

### HTTP Status Codes
```
200 OK              → Request succeeded
201 Created         → Resource created
206 Partial Content → Range request (video streaming)
400 Bad Request     → Invalid input
401 Unauthorized    → Missing/invalid token
403 Forbidden       → Insufficient permissions
404 Not Found       → Resource not found
500 Server Error    → Internal error
```

### Response Format
```javascript
// Success
{
  message: "Video uploaded successfully",
  data: {
    id: "123",
    title: "My Video",
    status: "processing"
  }
}

// Error
{
  error: "Video not found",
  details: "No video with ID 456"
}

// Paginated List
{
  message: "Videos retrieved",
  data: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
}
```

### Middleware Chain
```
Request
  ↓
CORS middleware (allow cross-origin)
  ↓
Body parser (parse JSON)
  ↓
Static file server (serve uploads)
  ↓
Route handler
  ↓
authMiddleware (verify JWT)
  ↓
organizationMiddleware (verify user in org)
  ↓
rbacMiddleware (verify user role)
  ↓
Controller (business logic)
  ↓
Database query
  ↓
Response
```

---

## Interview Topics

### 1. Multi-Tenancy
**Q: How do you ensure data isolation between organizations?**

A: We use three layers of isolation:
```
1. Database Level: Organization ID in every query
   db.videos.find({ organizationId: req.organizationId })

2. Middleware Level: organizationMiddleware verifies membership
   User must be member of org they're accessing

3. Application Level: Services filter by organization
   getOrgVideos(orgId) only returns videos for that org
```

**Q: What's the difference between multi-tenancy and multi-user?**

A: 
- Multi-user: Different users, same application, shared data
- Multi-tenancy: Different organizations, isolated data, custom configs

**Q: How do you handle org-wide settings?**

A: Store in Organization model with org-specific fields like:
- Branding (logo, colors)
- Privacy settings
- Storage limits
- Member permissions

---

### 2. Authentication & Authorization
**Q: Why use JWT instead of sessions?**

A:
```
Sessions:
✗ Server stores session state (not scalable)
✗ Requires session replication across servers
✓ Can revoke immediately

JWT:
✓ Stateless (no server storage needed)
✓ Scalable (works with multiple backends)
✓ Can contain custom claims (org ID, role)
✗ Can't revoke immediately (expires at token expiry)
```

**Q: How do you handle token expiration?**

A: Two-token strategy (optional implementation):
```
Access Token (short-lived, 15 minutes)
  - Used for API requests
  - Expires quickly

Refresh Token (long-lived, 7 days)
  - Stored securely (HTTP-only cookie)
  - Used to get new access token
  - Can be revoked
```

**Q: What's the difference between authentication and authorization?**

A:
- **Authentication**: Verifying who the user is (login)
- **Authorization**: Verifying what the user can do (permissions)

```
Authentication: "Are you John?"
Authorization: "Can John upload videos?"
```

---

### 3. Video Processing
**Q: How do you handle large file uploads?**

A:
```javascript
// Multer + Cloudinary
1. User selects file (frontend validates size)
2. Multer middleware receives file
3. Upload to Cloudinary (cloud storage)
4. Store Cloudinary URL in database
5. Start async processing

Benefits:
✓ Don't store on server disk
✓ Offload processing to background job
✓ Return response quickly
✓ Notify client of progress via Socket.io
```

**Q: What's the purpose of FFmpeg?**

A: FFmpeg is a multimedia framework for:
```
1. Transcoding: Convert video formats (MP4, WebM, etc)
2. Metadata extraction: Duration, resolution, bitrate
3. Thumbnail generation: Extract frame at time T
4. Validation: Check if file is valid video

Why not just stream original?
✗ Browser might not support original format
✗ Original might be very high bitrate (slow streaming)
✓ Transcoded version optimized for web playback
```

**Q: How do you avoid processing bottleneck?**

A:
```javascript
// Don't process synchronously
// Instead, enqueue async task:

uploadVideo() {
  1. Save video to Cloudinary
  2. Create Video doc in DB with status: 'pending'
  3. Enqueue processing task (doesn't wait)
  4. Return response immediately
  5. Backend: Process async, update status, push Socket.io event
}

This allows:
✓ Upload API returns quickly
✓ Multiple videos process in parallel
✓ Client gets real-time progress via WebSocket
```

---

### 4. Real-time Communication
**Q: Why use Socket.io instead of HTTP polling?**

A:
```
HTTP Polling:
✗ Client constantly asks "is it done yet?"
✗ Wasted bandwidth
✗ Higher latency
✗ More server load

WebSocket/Socket.io:
✓ Server pushes updates to client
✓ True bi-directional communication
✓ Instant notifications
✓ Fewer requests
```

**Q: How do you handle multiple users in same org?**

A:
```javascript
// Socket.io rooms
socket.on('join-org', (orgId) => {
  socket.join(`org-${orgId}`);  // User joins org room
});

// When video completes:
io.to(`org-${orgId}`).emit('processing-complete', {
  videoId: '123',
  title: 'My Video'
});

// All users in that org get notified instantly
```

---

### 5. Database Design
**Q: Why use indexes?**

A:
```javascript
// Without index:
db.videos.find({ organizationId: '123' })
// Scans entire collection (slow)

// With index:
db.videos.createIndex({ organizationId: 1 })
// Seeks directly to org's videos (fast)

Cost:
✓ Faster queries
✗ Slower writes (must update index)
✗ More disk space
```

**Q: How do you handle one-to-many relationships?**

A:
```javascript
// Option 1: Embed (small related docs)
{
  _id: userId,
  name: "John",
  roles: ["admin", "user"]  // Small array
}

// Option 2: Reference (large related docs)
{
  _id: userId,
  name: "John"
}
// Separate collection:
{
  userId: userId,
  organizationId: orgId,
  role: "admin"
}

When to embed: Simple, bounded data (< 100 items)
When to reference: Complex, large data (many items)
```

---

### 6. Testing
**Q: How do you test async processes?**

A:
```javascript
test('processing updates video status', async () => {
  const video = await uploadVideo(testFile);
  expect(video.status).toBe('pending');
  
  // Wait for processing
  await waitFor(() => {
    expect(video.status).toBe('completed');
  }, { timeout: 5000 });
  
  expect(video.sensitivity.score).toBeGreaterThan(0);
});
```

**Q: How do you test protected routes?**

A:
```javascript
test('requires auth token', async () => {
  const response = await request(app)
    .get('/api/videos')
    .expect(401);
    
  expect(response.body.error).toContain('Unauthorized');
});

test('accepts valid token', async () => {
  const token = generateTestToken();
  const response = await request(app)
    .get('/api/videos')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});
```

---

### 7. Error Handling
**Q: How do you handle errors gracefully?**

A:
```javascript
// Good error handling
try {
  const video = await Video.findById(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // Process video
  res.json({ success: true, data: video });
} catch (error) {
  console.error('Error:', error);
  
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
}
```

---

### 8. Performance Optimization
**Q: How do you optimize video streaming?**

A:
```
1. HTTP Range Requests
   - Client can seek without downloading entire file
   - Resume after interruption
   
2. Cloudinary CDN
   - Files cached globally
   - Distributed edge servers
   - Faster delivery to users worldwide
   
3. Transcoding
   - Reduce bitrate (smaller file)
   - Optimize for web playback
   - Different formats for different devices
   
4. Compression
   - H.264 video codec (widely supported)
   - AAC audio codec
   
Typical video file:
Original: 500 MB
Transcoded: 50 MB
Difference: 90% smaller, same quality
```

**Q: How do you optimize database queries?**

A:
```javascript
// Bad: N+1 problem
const videos = await Video.find({ organizationId });
const owners = videos.map(v => User.findById(v.owner)); // N queries!

// Good: Use populate
const videos = await Video.find({ organizationId })
  .populate('owner', 'username email')  // 1 query
  .select('title description status'); // Only needed fields

// Good: Use lean() for read-only
const videos = await Video.find()
  .lean()  // Returns plain objects (faster)
  .limit(20); // Pagination
```

---

### 9. Security Vulnerabilities
**Q: What security vulnerabilities did you address?**

A:
```
1. SQL Injection
   ✓ Use Mongoose (prevents injected queries)
   ✓ Validate all inputs
   
2. XSS (Cross-Site Scripting)
   ✓ React escapes by default
   ✓ Validate on backend
   
3. CSRF (Cross-Site Request Forgery)
   ✓ JWT tokens (not cookies)
   ✓ CORS validation
   
4. Unauthorized Access
   ✓ authMiddleware checks token
   ✓ organizationMiddleware verifies membership
   ✓ rbacMiddleware checks role
   
5. Password Attacks
   ✓ Bcrypt hashing (slow by design)
   ✓ Never store plain passwords
   ✓ Minimum 6 characters
   
6. Token Hijacking
   ✓ HTTPS only (production)
   ✓ HttpOnly cookies (optional)
   ✓ Short expiration times
```

---

### 10. Scalability
**Q: How would you scale this to 1 million users?**

A:
```
Current:
- Single MongoDB instance
- Single Express server
- Local file uploads

Improvements:

1. Database Scaling
   ├─ Sharding by organizationId
   ├─ Read replicas for queries
   └─ Index optimization
   
2. Backend Scaling
   ├─ Load balancer (distribute requests)
   ├─ Multiple server instances
   └─ Stateless (JWT doesn't require sessions)
   
3. Video Processing
   ├─ Queue system (Redis, RabbitMQ)
   ├─ Worker processes (process multiple videos)
   └─ Caching (Redis for frequently accessed data)
   
4. Storage
   ├─ Cloudinary (already using - scalable)
   ├─ CDN for faster delivery
   └─ Object storage (S3) backup
   
5. Real-time
   ├─ Redis for Socket.io adapter
   ├─ Horizontal scaling of Socket.io servers
   └─ Message queue for events
   
Architecture:
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │
┌──────▼──────────────┐
│  Load Balancer      │
└──────┬──────┬───────┘
       │      │
┌──────▼──┐  ┌───────▼──┐
│ Server1 │  │ Server2  │
└─────┬───┘  └─────┬────┘
      │            │
    ┌─┴────────────┴─┐
    │  MongoDB       │  (Sharded)
    │  +            │
    │  Redis Cache  │
    └────────────────┘
    
External:
- Cloudinary (video storage)
- Redis (queue, cache, Socket.io adapter)
- Message Queue (background jobs)
```

---

### 11. Deployment
**Q: What's the deployment pipeline?**

A:
```
1. Code Commit
   ↓
2. GitHub Actions (CI/CD pipeline)
   ├─ Run tests
   ├─ Lint code
   ├─ Build Docker image
   └─ Push to registry
   ↓
3. Railway/Vercel Deployment
   ├─ Backend: Railway (Dockerfile)
   ├─ Frontend: Vercel (auto-deploy from GitHub)
   └─ Database: MongoDB Atlas (cloud)
   ↓
4. Health Checks
   └─ HEALTHCHECK in Dockerfile
   └─ Vercel analytics
   ↓
5. Monitoring
   └─ Logs on Railway
   └─ Error tracking
```

**Docker Setup**:
```dockerfile
FROM node:22.21.1-alpine AS builder
WORKDIR /build
COPY backend/package*.json ./
RUN npm install

FROM node:22.21.1-alpine
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package*.json ./
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
```

---

## Best Practices

### Code Organization
```
✓ Separate concerns:
  - Controllers: Handle HTTP requests/responses
  - Services: Business logic
  - Models: Data structure and validation
  - Middleware: Cross-cutting concerns
  
✓ DRY (Don't Repeat Yourself)
  - Reusable middleware
  - Shared validation functions
  - Common response formats
  
✓ Single Responsibility Principle
  - Each file does one thing well
  - Easy to test
  - Easy to maintain
```

### Error Handling
```javascript
// ✓ Good
try {
  const result = await risky();
  res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed:', error);
  res.status(500).json({ error: 'Operation failed' });
}

// ✗ Bad
const result = await risky();  // Crashes if error
res.json({ data: result });    // Generic response
```

### Validation
```javascript
// ✓ Good: Validate early
if (!email || !email.includes('@')) {
  return res.status(400).json({ error: 'Invalid email' });
}

// ✗ Bad: Assume valid input
const user = new User({ email });  // May fail
```

### Async Operations
```javascript
// ✓ Good: Don't wait for long operations
uploadVideo() {
  1. Save file
  2. Create DB record
  3. Enqueue processing (don't wait)
  4. Return immediately
}

// ✗ Bad: Wait for everything
uploadVideo() {
  1. Save file
  2. Process (wait 30 seconds)
  3. Analyze (wait 20 seconds)
  4. Return (user waiting 50+ seconds)
}
```

### Testing
```javascript
// ✓ Good: Test behavior, not implementation
test('should flag explicit videos', () => {
  const result = analyzeSensitivity({ title: 'Adult Content' });
  expect(result.isFlagged).toBe(true);
});

// ✗ Bad: Test implementation details
test('should have weight of 40', () => {
  expect(KEYWORD_CATEGORIES.explicit.weight).toBe(40);
});
```

### Documentation
```javascript
/**
 * Upload video and enqueue for processing
 * 
 * @param {File} file - Video file from request
 * @param {string} title - Video title
 * @param {string} description - Video description
 * @returns {Promise<Object>} Video document with status 'pending'
 * 
 * @throws {400} If file validation fails
 * @throws {403} If user lacks editor role
 * 
 * @example
 * const video = await uploadVideo(file, 'My Video', 'Description');
 * // Returns: { id, title, status: 'pending', owner, ... }
 */
exports.uploadVideo = async (req, res) => {
  // ...
};
```

---

## Summary: Key Takeaways for Interviews

### Architecture
1. **Multi-tenant system**: Isolated data per organization
2. **Layered architecture**: Controllers → Services → Models
3. **Async processing**: Don't block user for long operations
4. **Real-time updates**: WebSocket instead of polling

### Technologies
1. **Backend**: Node.js/Express (fast, event-driven)
2. **Frontend**: React/TypeScript (component-based, type-safe)
3. **Database**: MongoDB (flexible schema, scales well)
4. **Video Processing**: FFmpeg (industry standard)
5. **Cloud Storage**: Cloudinary (reliable, CDN included)

### Security
1. **Authentication**: JWT tokens with org context
2. **Authorization**: RBAC with role hierarchy
3. **Password Security**: Bcrypt hashing
4. **Input Validation**: Validate all inputs
5. **Multi-tenancy**: Verify user is member of org

### Performance
1. **Indexes**: Fast database queries
2. **Caching**: Reduce database load
3. **Video Optimization**: Transcoding + CDN
4. **Range Requests**: Efficient streaming
5. **Async Processing**: Don't block users

### Testing
1. **Unit tests**: Test isolated functions
2. **Integration tests**: Test API endpoints
3. **Mock data**: Use in-memory MongoDB
4. **Coverage**: Aim for >80% coverage
5. **Edge cases**: Test error scenarios

---

**Good luck with your interviews! This platform demonstrates real-world knowledge of authentication, databases, file handling, real-time communication, and scalable architecture.**
