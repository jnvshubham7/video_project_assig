# User Manual

This guide assumes the app is deployed or running locally.

## 1) Sign Up / Login
- Register with username/email and create or join an organization.
- Login to get access token stored in local storage (frontend handles this).

## 2) Upload a Video
- Go to Upload page.
- Select a video file (supported formats: mp4, mov, mkv). Max size depends on server limits (.env).
- Optionally set title, description, visibility (private/org/public).
- Upload progress is shown; after upload, processing starts and progress updates are received via socket.

## 3) Monitor Processing
- Processing status appears in the dashboard or video details view.
- Status values: queued, processing, completed, failed.
- If flagged, the video will show a safety status (safe | flagged) and a reason summary.

## 4) Stream Videos
- Processed videos can be played in-browser using the player.
- The player uses HTTP Range requests for efficient seeking and bandwidth.

## 5) Organization & RBAC
- Admins: invite/manage members, change roles.
- Editors: upload and manage videos.
- Viewers: can view assigned videos only.

## 6) Troubleshooting
- If uploads fail: check server logs and available disk/storage quota.
- If processing hangs: ensure FFmpeg/ffprobe installed and accessible.
- If sockets do not connect: verify backend CORS and socket origin settings.