# API Reference (Backend)

Base URL: /api

Authentication: JWT in `Authorization: Bearer <token>` header for protected routes.

## Auth

- POST /api/auth/register

  - Body: { username, email, password, confirmPassword, organizationName }
  - Response: { message, token, organization }
- POST /api/auth/login

  - Body: { identifier (email/username), password }
  - Response: { message, token }
- GET /api/auth/me (protected)

  - Response: current user object
- GET /api/auth/my-organizations (protected)

  - Response: list of orgs
- POST /api/auth/switch-organization (protected)

  - Body: { organizationId }

## Videos

- POST /api/videos/upload (protected, role: editor/admin)

  - Content-Type: multipart/form-data (field `video`)
  - Body: video file + optional metadata (title, description, visibility)
  - Response: { videoId, processingJobId }
- GET /api/videos/user/myvideos (protected)

  - Response: user's videos
- GET /api/videos/org/all (protected)

  - Response: organization videos
- GET /api/videos/public/all

  - Response: public videos (no auth required)
- GET /api/videos/:id (protected)

  - Returns video metadata (stream URL or streaming-ready info)
- GET /api/videos/:id/processing-status (protected)

  - Response: processing state, progress percent, sensitivity classification
- PUT /api/videos/:id (protected)

  - Update metadata
- DELETE /api/videos/:id (protected)

  - Delete video
- GET /api/videos/filter/advanced (protected)

  - Query params: dateFrom, dateTo, safety=safe|flagged, minSize, maxSize
- GET /api/videos/stats/overview (protected)

  - Returns organization-level stats

## Organizations

- POST /api/org/ (protected)

  - Create organization
- GET /api/org/ (protected)

  - Get current org
- PUT /api/org/ (protected, admin)

  - Update org
- GET /api/org/members (protected)
- POST /api/org/members (protected, admin)
- DELETE /api/org/members/:userId (protected, admin)
- PUT /api/org/members/:userId/role (protected, admin)
- GET /api/org/my-organizations (protected)

## Streaming

- Video streaming: the server supports Range requests. Client should request `/api/videos/static/:file` or the streaming URL returned in video metadata.

## Real-Time

- Socket.io is used for processing progress updates. Connect to backend root (socket URL derived from `VITE_API_URL` without `/api`).
- Events: `processing:progress` { jobId, percent }, `processing:completed` { jobId, result }

## Errors

- Standard JSON error responses: { message, details? }

---

## Examples

1) Register

curl -X POST http://localhost:5000/api/auth/register 
  -H "Content-Type: application/json" 
  -d '{ "username": "alice", "email": "a@ex.com", "password": "pass123", "confirmPassword": "pass123", "organizationName": "Acme" }'

Response: { "message": "Registered", "token": "`<jwt>`", "organization": { /* org data */ } }

2) Login

curl -X POST http://localhost:5000/api/auth/login 
  -H "Content-Type: application/json" 
  -d '{ "identifier": "a@ex.com", "password": "pass123" }'

Response: { "message": "Logged in", "token": "`<jwt>`" }

3) Upload video (form-data)

curl -X POST http://localhost:5000/api/videos/upload 
  -H "Authorization: Bearer `<jwt>`" 
  -F "video=@/path/to/video.mp4" 
  -F "title=My video" 
  -F "visibility=org"

Response: { "videoId": "`<id>`", "processingJobId": "`<jobId>`" }

4) Check processing status

curl -X GET http://localhost:5000/api/videos/`<videoId>`/processing-status 
  -H "Authorization: Bearer `<jwt>`"

Response: { "status": "processing", "progress": 42, "sensitivity": "pending" }

5) Streaming with Range header (example)

curl -H "Range: bytes=0-" http://localhost:5000/api/videos/static/<file.mp4> --output part.mp4

6) Socket.io (client example)

// Client connects to socket URL (no /api suffix)
const io = require('socket.io-client');
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('connected'));
socket.on('processing:progress', (data) => console.log('progress', data));
