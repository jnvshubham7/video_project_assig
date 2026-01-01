# Assumptions & Design Decisions

- Authentication: JWT-based tokens stored by frontend in localStorage.
- Multi-tenancy: Users switch organization contexts; data is scoped by organization ID.
- Storage: Local uploads available under `/uploads` and optionally cloud storage (Cloudinary configured in `.env`).
- Processing: FFmpeg is the canonical tool; sensitivity detection is implemented via rules or third-party service.
- Streaming: Server serves partial content using HTTP Range headers for smooth seeking.

Design trade-offs:
- Simplicity over scale: local file storage is simpler to develop; for production use S3/CDN is recommended.
- Processing jobs are synchronous to the server process in dev; in production a job queue (Bull, Redis) is recommended.