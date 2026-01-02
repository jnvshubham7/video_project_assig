# Installation & Setup

## Requirements
- Node.js LTS (>=18)
- npm
- MongoDB (local or Atlas)
- FFmpeg (for video processing) and ffprobe in PATH — the backend includes `fluent-ffmpeg` plus the `ffmpeg-static` and `ffprobe-static` npm packages so a system-wide FFmpeg is optional. If you prefer to use the system binaries, ensure `ffmpeg` and `ffprobe` are available in your PATH or set `FFMPEG_PATH`/`FFPROBE_PATH` in the backend `.env`.

### Installing system FFmpeg (optional)
- Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ffmpeg
```

- macOS (Homebrew):

```bash
brew install ffmpeg
```

- Windows (Chocolatey):

```powershell
choco install ffmpeg -y
```

If you run the backend in a Docker container, either use a base image that includes ffmpeg (for example `jrottenberg/ffmpeg`) or install ffmpeg in your Dockerfile so the processing service can access the binary.

## Backend (d:/video_project/backend)
1. cd backend
2. cp .env.example .env (create `.env` with required keys - see `.env.example` or README)
3. npm install
4. npm run dev (for development) or npm start

Common scripts:
- npm test (run Jest tests)

## Frontend (d:/video_project/frontend)
1. cd frontend
2. cp .env.local .env (ensure `VITE_API_URL` points to backend, e.g. `http://localhost:5000/api`)
3. npm install
4. npm run dev (starts local dev server, default port 3000)

## Notes
- Make sure MongoDB is accessible (connection string in backend `.env`).
- If using cloud storage (Cloudinary, S3) ensure credentials are set.
- For real-time features, ensure Socket.io server is reachable (backend origin).