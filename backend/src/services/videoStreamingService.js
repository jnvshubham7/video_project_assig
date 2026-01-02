/**
 * Video Streaming Service
 * Supports HTTP Range Requests for efficient video streaming
 * Uses FFmpeg/ffprobe for metadata extraction
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set ffmpeg and ffprobe paths from static packages
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

class VideoStreamingService {
  /**
   * Get video file stats
   */
  static getFileStats(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  /**
   * Parse Range header
   * Example: "bytes=0-1023" or "bytes=1024-" or "bytes=-1024"
   */
  static parseRangeHeader(rangeHeader, fileSize) {
    if (!rangeHeader || typeof rangeHeader !== 'string') {
      return null;
    }

    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return null;
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    // Handle different range formats
    if (isNaN(start) && isNaN(end)) {
      return null;
    }

    if (isNaN(start)) {
      // Suffix range: "bytes=-500" (last 500 bytes)
      const suffixLength = end;
      return {
        start: Math.max(0, fileSize - suffixLength),
        end: fileSize - 1
      };
    }

    if (isNaN(end)) {
      // Open range: "bytes=1024-" (from 1024 to end)
      // If start is beyond file size, treat unsatisfiable
      if (start >= fileSize) return null;
      return {
        start: start,
        end: fileSize - 1
      };
    }

    // Closed range: "bytes=0-1023"
    const computedEnd = Math.min(end, fileSize - 1);
    // Unsatisfiable if start is beyond file size or start > end
    if (start >= fileSize || start > computedEnd) return null;
    return {
      start: start,
      end: computedEnd
    };
  }

  /**
   * Validate range request
   */
  static validateRange(range, fileSize) {
    if (!range) {
      return { valid: false };
    }

    const { start, end } = range;

    // Check bounds
    if (start > fileSize - 1 || start < 0 || end < start || end >= fileSize) {
      return {
        valid: false,
        error: 'Invalid range'
      };
    }

    return { valid: true };
  }

  /**
   * Get range response headers
   */
  static getRangeHeaders(start, end, fileSize) {
    return {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4'
    };
  }

  /**
   * Stream video with range request support
   */
  static streamVideo(req, res, filePath) {
    try {
      const stats = this.getFileStats(filePath);
      const fileSize = stats.size;

      const rangeHeader = req.headers.range;
      const range = this.parseRangeHeader(rangeHeader, fileSize);

      // No range requested - send full file
      if (!range) {
        res.header('Accept-Ranges', 'bytes');
        res.header('Content-Length', fileSize);
        res.header('Content-Type', 'video/mp4');
        res.header('Cache-Control', 'public, max-age=86400');

        const stream = fs.createReadStream(filePath);
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });

        return stream.pipe(res);
      }

      // Validate range
      const validation = this.validateRange(range, fileSize);
      if (!validation.valid) {
        return res.status(416).json({
          error: validation.error,
          range: `bytes */${fileSize}`
        });
      }

      const { start, end } = range;

      // Send partial content (206 Partial Content)
      const headers = this.getRangeHeaders(start, end, fileSize);
      Object.entries(headers).forEach(([key, value]) => {
        res.header(key, value);
      });

      res.status(206);

      // Create read stream for the range
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        }
      });

      return stream.pipe(res);
    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get video metadata (duration, codec, resolution, bitrate, etc.)
   * Uses ffprobe via fluent-ffmpeg
   */
  static async getVideoMetadata(filePath) {
    try {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('FFprobe error:', err);
            reject(new Error(`Failed to extract metadata: ${err.message}`));
          }

          try {
            const format = metadata.format || {};
            const stream = metadata.streams && metadata.streams[0] ? metadata.streams[0] : {};

            resolve({
              size: format.size,
              duration: Math.round(format.duration || 0),
              bitrate: format.bit_rate || 'N/A',
              createdAt: format.tags?.creation_time || new Date(format.tags?.date || 0),
              modifiedAt: new Date(),
              codec: {
                video: stream.codec_name || 'unknown',
                profile: stream.profile || 'unknown',
                level: stream.level || 'N/A'
              },
              resolution: {
                width: stream.width || 'N/A',
                height: stream.height || 'N/A'
              },
              frameRate: stream.r_frame_rate || 'N/A',
              pixelFormat: stream.pix_fmt || 'N/A'
            });
          } catch (parseError) {
            console.error('Error parsing metadata:', parseError);
            reject(new Error(`Failed to parse metadata: ${parseError.message}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }
}

module.exports = VideoStreamingService;
