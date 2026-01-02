# Deployment Guide

## Recommended stack
- MongoDB Atlas
- Node.js on Railway/Heroku/Render
- Frontend (Vite) on Vercel/Netlify
- Storage: AWS S3 (recommended) or Cloudinary
- Use a CDN for video assets in production

## Steps
1. Setup environment variables in the hosting platform (see `.env.example`):
   - MONGO_URI, JWT_SECRET, CLOUDINARY_* (if using Cloudinary), PORT
2. Build frontend: `npm run build` in `frontend` and deploy to static host.
3. Deploy backend with env vars and ensure CORS allows the frontend origin.
4. Configure socket origins and verify websocket support on host.

## Tips
- Use a process manager (PM2) or platform-managed container for backend.
- Offload video processing to a job queue or separate worker to improve reliability.
 - Ensure `ffmpeg`/`ffprobe` are available in the runtime environment. The backend includes `ffmpeg-static` and `ffprobe-static` which provide bundled binaries, but for production you may prefer a system-installed FFmpeg or a Docker image that includes ffmpeg for better performance and compatibility.

Docker tip: use a base image that contains ffmpeg or install ffmpeg in your Dockerfile. Example Dockerfile snippet:

```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY backend/package.json ./
RUN npm install --production
COPY backend ./
CMD ["node", "src/server.js"]
```