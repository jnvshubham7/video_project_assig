# Build stage
FROM node:22.21.1-alpine AS builder

WORKDIR /build

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

# Runtime stage
FROM node:22.21.1-alpine

# Install ffmpeg and ffprobe from Alpine packages (avoids static binary segfault issues)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy backend source code
COPY backend/src ./src
COPY backend/package*.json ./

# Expose port
EXPOSE 5000

# Set NODE_ENV for production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
