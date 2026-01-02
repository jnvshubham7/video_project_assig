# Backend - Video Processing Platform

This folder contains the Node.js + Express backend for the project.

Quick start:
- cd backend
- npm install
- Create `.env` with values for MONGO_URI, JWT_SECRET, CLOUDINARY_*, etc.
- npm run dev

FFmpeg support
- This backend uses `fluent-ffmpeg` and ships `ffmpeg-static` and `ffprobe-static` npm packages so processing works out-of-the-box without a separate system FFmpeg install.
- If you prefer or need a system FFmpeg (recommended for some production environments), install `ffmpeg`/`ffprobe` on the host and set `FFMPEG_PATH`/`FFPROBE_PATH` in `.env` if required.

See the project docs at `../docs/` for installation, API reference, architecture, and deployment instructions.