# Architecture Overview

## High-level
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (+ Mongoose)
- Real-time: Socket.io (processing progress)
- Storage: Local uploads or Cloudinary/S3 (configurable via .env)
- Video Processing: FFmpeg + custom processing service

## Components
- Auth Service: JWT-based authentication, multi-org context
- Video Service: Upload, enqueue processing, stream via Range requests
- Processing Pipeline: Convert/scan videos, produce sensitivity analysis
	- Implementation detail: the processing pipeline is implemented in `backend/src/services/videoProcessingService.js` using `fluent-ffmpeg` together with `ffmpeg-static` and `ffprobe-static` (static binaries). This enables transcoding, thumbnail extraction, and automated sensitivity analysis steps.
- RBAC: Role-based middleware (admin/editor/viewer)

## Data Models (summary)
- User: credentials, org memberships, roles
- Organization: metadata and members
- Video: file reference, owner, organization, visibility, processing status, sensitivity result

## Notes
- Multi-tenant logic enforced via organization middleware (scoped queries)
- Processing status pushed via Socket.io to relevant user/org channels.