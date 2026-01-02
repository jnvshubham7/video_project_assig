# Build stage
FROM node:22.21.1-alpine AS builder

WORKDIR /build

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

# Runtime stage
FROM node:22.21.1-alpine

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy backend source code
COPY backend/src ./src
COPY backend/package*.json ./

# Expose port
EXPOSE 5000

# Set NODE_ENV for production and force static ffmpeg-static binaries
ENV NODE_ENV=production
ENV FFMPEG_PATH=/app/node_modules/ffmpeg-static/ffmpeg
ENV FFPROBE_PATH=/app/node_modules/ffprobe-static/bin/linux/x64/ffprobe

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
