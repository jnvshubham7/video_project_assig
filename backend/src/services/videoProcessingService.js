/**
 * Video Processing Service
 * Handles video status pipeline, validation, and content sensitivity analysis
 * Uses FFmpeg for video format validation
 */

const Video = require('../models/Video');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { execSync } = require('child_process');

// Configure FFmpeg paths: prioritize system binaries, fall back to static
function setupFFmpegPaths() {
  const ffmpegStatic = require('ffmpeg-static');
  const ffprobeStatic = require('ffprobe-static');
  
  // Try to use system ffmpeg/ffprobe if available (recommended for production)
  try {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    
    // Test if system binaries are available
    execSync(`${ffmpegPath} -version`, { stdio: 'ignore' });
    execSync(`${ffprobePath} -version`, { stdio: 'ignore' });
    
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('✓ Using system ffmpeg/ffprobe binaries');
  } catch (e) {
    // Fall back to static binaries if system ones not found
    try {
      ffmpeg.setFfmpegPath(ffmpegStatic);
      ffmpeg.setFfprobePath(ffprobeStatic.path);
      console.log('✓ Using static ffmpeg/ffprobe binaries');
    } catch (fallbackError) {
      console.error('✗ FFmpeg configuration failed:', fallbackError.message);
      throw new Error('FFmpeg and ffprobe are not available');
    }
  }
}

// Initialize on module load
setupFFmpegPaths();

// Flagging threshold: score strictly greater than this marks video as 'flagged'
const FLAG_THRESHOLD = 30;

class VideoProcessingService {
  /**
   * Comprehensive keyword lists for different content categories
   */
  static KEYWORD_CATEGORIES = {
    // Explicit/Adult content
    explicit: {
      keywords: ['adult', 'explicit', 'porn', 'xxx', 'sexual', 'nude', 'naked', 'sex', 'xxx', 'hot', 'strip', 'naked', 'orgasm', 'intercourse'],
      weight: 40,
      category: 'Explicit Content'
    },
    // Violence/Gore
    violence: {
      keywords: ['violence', 'murder', 'kill', 'death', 'gore', 'blood', 'brutal', 'assault', 'fight', 'weapon', 'gun', 'knife', 'shoot'],
      weight: 30,
      category: 'Violence/Gore'
    },
    // Hate speech/Discrimination
    hate: {
      keywords: ['hate', 'racist', 'sexist', 'discrimination', 'slur', 'bigot', 'inferior', 'supremacist', 'prejudice'],
      weight: 35,
      category: 'Hate Speech'
    },
    // Illegal activities
    illegal: {
      keywords: ['illegal', 'drug', 'cocaine', 'heroin', 'meth', 'steal', 'robbery', 'crime', 'criminal', 'fraud', 'scam'],
      weight: 35,
      category: 'Illegal Activity'
    },
    // Self-harm/Dangerous
    harmful: {
      keywords: ['suicide', 'self-harm', 'cutting', 'dangerous', 'harm', 'injury', 'trauma', 'abuse', 'domestic violence'],
      weight: 38,
      category: 'Self-Harm/Dangerous Content'
    },
    // Spam/Misleading
    spam: {
      keywords: ['spam', 'clickbait', 'scam', 'fake', 'hoax', 'misinformation', 'misleading', 'phishing', 'malware'],
      weight: 20,
      category: 'Spam/Misleading'
    }
  };

  /**
   * Performs comprehensive sensitivity analysis on video metadata
   * Checks title, description, and filename against multiple keyword categories
   */
  static analyzeSensitivity(video) {
    try {
      // Support passing a raw string (title/combined text) or a video object
      let title = '';
      let description = '';
      let filename = '';

      if (typeof video === 'string') {
        title = video;
      } else if (video && typeof video === 'object') {
        title = video.title || '';
        description = video.description || '';
        filename = video.filename || '';
      }

      const titleLower = (title || '').toLowerCase();
      const descLower = (description || '').toLowerCase();
      const fileLower = (filename || '').toLowerCase();

      let totalScore = 0;
      const detectedIssues = [];
      const categoryBreakdown = {};

      // Check each category
      for (const [categoryKey, category] of Object.entries(this.KEYWORD_CATEGORIES)) {
        let categoryScore = 0;
        const foundKeywords = [];

        // Check each keyword in this category
        category.keywords.forEach(keyword => {
          // Check in title (higher weight)
          if (titleLower.includes(keyword)) {
            categoryScore += category.weight * 1.2; // 20% boost for title
            foundKeywords.push(`"${keyword}" in title`);
          }

          // Check in description (medium weight)
          if (descLower.includes(keyword)) {
            categoryScore += category.weight;
            foundKeywords.push(`"${keyword}" in description`);
          }

          // Check in filename (lower weight)
          if (fileLower.includes(keyword)) {
            categoryScore += category.weight * 0.8; // 20% penalty for filename
            foundKeywords.push(`"${keyword}" in filename`);
          }
        });

        // If any keywords found in this category, add to results
        if (categoryScore > 0) {
          categoryScore = Math.min(categoryScore, 100); // Cap at 100
          categoryBreakdown[category.category] = {
            score: Math.round(categoryScore),
            keywords: [...new Set(foundKeywords)] // Remove duplicates
          };
          totalScore += categoryScore;
          detectedIssues.push({
            category: category.category,
            score: Math.round(categoryScore),
            keywords: foundKeywords
          });
        }
      }

      // Additional pattern checks
      const rules = [];

      // Pattern 1: Repeated characters (spam detection)
      const fullText = `${titleLower} ${descLower} ${fileLower}`;
      const repeatedCharPattern = /(.)\1{4,}/g;
      if (repeatedCharPattern.test(fullText)) {
        totalScore += 15;
        rules.push('Repeated characters detected (spam pattern)');
      }

      // Pattern 2: Description length analysis
      if (description && description.length > 1000) {
        totalScore += 8;
        rules.push('Unusually long description (potential spam)');
      }

      // Pattern 3: Special character spam
      const specialCharCount = (fullText.match(/[!@#$%^&*]{3,}/g) || []).length;
      if (specialCharCount > 2) {
        totalScore += 12;
        rules.push('Excessive special characters detected');
      }

      // Pattern 4: Number spam
      const numberSequences = (fullText.match(/\d{5,}/g) || []).length;
      if (numberSequences > 1) {
        totalScore += 10;
        rules.push('Excessive number sequences detected');
      }

      // Ensure score stays within bounds
      totalScore = Math.min(Math.round(totalScore), 100);

      // Determine final result (configurable threshold)
      const result = totalScore > FLAG_THRESHOLD ? 'flagged' : 'safe';

      // Create comprehensive summary
      const summary = this._createSummary(
        result,
        totalScore,
        detectedIssues,
        rules,
        categoryBreakdown
      );

      // Backwards-compatible output fields expected by older tests
      const flagged_categories = detectedIssues.map(d => d.category);
      const accuracy_score = totalScore;
      const status = result; // alias

      return {
        score: totalScore,
        result,
        status,
        accuracy_score,
        flagged_categories,
        rules: rules.length > 0 ? rules : ['Passed all content checks'],
        detectedIssues,
        categoryBreakdown,
        summary
      };
    } catch (error) {
      console.error('Sensitivity Analysis Error:', error);
      return {
        score: 0,
        result: 'safe',
        rules: ['Analysis skipped due to error'],
        detectedIssues: [],
        categoryBreakdown: {},
        summary: 'Analysis failed - video marked as safe',
        error: error.message
      };
    }
  }

  /**
   * Create a human-readable summary of the analysis
   */
  static _createSummary(result, score, detectedIssues, rules, categoryBreakdown) {
    if (result === 'flagged') {
      const categories = Object.keys(categoryBreakdown).join(', ');
      return `⚠️ FLAGGED: Content contains ${categories}. Score: ${score}/100`;
    } else {
      if (Object.keys(categoryBreakdown).length > 0) {
        return `✅ SAFE: Some minor issues detected but below threshold. Score: ${score}/100`;
      }
      return `✅ SAFE: Passed all content checks. Score: ${score}/100`;
    }
  }
    


  /**
   * Validate video format and codec using FFmpeg
   * Falls back to basic file validation if ffprobe crashes (e.g., on Alpine/Railway with static binaries)
   */
  static async validateVideoFormat(filePath) {
    const fs = require('fs');
    
    return new Promise((resolve, reject) => {
      // Set a timeout to catch ffprobe hangs/crashes (common with static binaries on Alpine)
      const timeout = setTimeout(() => {
        console.warn('[PROCESSING] FFmpeg validation timeout - using fallback validation');
        // Fallback: basic file validation
        return validateWithFallback();
      }, 5000);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);
        
        if (err) {
          console.warn('[PROCESSING] FFmpeg validation failed, using fallback:', err.message);
          // Fallback to basic file validation instead of rejecting
          return validateWithFallback();
        }

        try {
          const format = metadata.format || {};
          const videoStream = metadata.streams?.find(s => s.codec_type === 'video');

          // Supported codecs
          const supportedCodecs = ['h264', 'h265', 'hevc', 'vp8', 'vp9', 'av1'];
          const supportedFormats = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'];

          if (!videoStream) {
            reject(new Error('No video stream found in file'));
            return;
          }

          const codec = videoStream.codec_name || '';
          const formatName = format.format_name || '';

          // Check codec support
          if (!supportedCodecs.includes(codec.toLowerCase())) {
            reject(new Error(`Unsupported codec: ${codec}. Supported: ${supportedCodecs.join(', ')}`));
            return;
          }

          // Check container format
          const isSupported = supportedFormats.some(fmt => formatName.includes(fmt));
          if (!isSupported) {
            reject(new Error(`Unsupported format: ${formatName}. Supported: ${supportedFormats.join(', ')}`));
            return;
          }

          // Validate duration
          const duration = format.duration || 0;
          if (duration <= 0) {
            reject(new Error('Invalid video duration'));
            return;
          }

          // Maximum file size: 2GB
          const maxSize = 2 * 1024 * 1024 * 1024;
          if (format.size > maxSize) {
            reject(new Error('Video file exceeds maximum size of 2GB'));
            return;
          }

          resolve({
            valid: true,
            codec: videoStream.codec_name,
            format: formatName,
            duration: Math.round(duration),
            size: format.size,
            resolution: {
              width: videoStream.width,
              height: videoStream.height
            },
            frameRate: videoStream.r_frame_rate
          });
        } catch (error) {
          reject(new Error(`Validation error: ${error.message}`));
        }
      });

      // Fallback validation when ffprobe fails or times out
      const validateWithFallback = () => {
        try {
          const fs = require('fs');
          const path = require('path');
          
          // Basic checks on file existence and size
          if (!fs.existsSync(filePath)) {
            reject(new Error('Video file not found'));
            return;
          }

          const stats = fs.statSync(filePath);
          const fileSize = stats.size;
          
          // Check file extension
          const ext = path.extname(filePath).toLowerCase().substring(1);
          const supportedExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'];
          
          if (!supportedExts.includes(ext)) {
            reject(new Error(`Unsupported file format: .${ext}`));
            return;
          }

          // Maximum file size: 2GB
          const maxSize = 2 * 1024 * 1024 * 1024;
          if (fileSize > maxSize) {
            reject(new Error('Video file exceeds maximum size of 2GB'));
            return;
          }

          // Minimum file size: 1KB (sanity check)
          if (fileSize < 1024) {
            reject(new Error('Video file is too small (< 1KB)'));
            return;
          }

          // Return basic validation result
          resolve({
            valid: true,
            codec: 'unknown (ffprobe unavailable)',
            format: ext,
            duration: 0, // Unable to determine
            size: fileSize,
            resolution: {
              width: 0,
              height: 0
            },
            frameRate: 'unknown',
            validatedWithFallback: true
          });
        } catch (fallbackError) {
          reject(new Error(`Fallback validation error: ${fallbackError.message}`));
        }
      };
    });
  }

  /**
   * Start processing a video - set status to 'processing'
   */
  static async startProcessing(videoId) {
    try {
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          status: 'processing',
          processingProgress: 10,
          processingStartedAt: new Date()
        },
        { new: true }
      );
      return video;
    } catch (error) {
      throw new Error(`Failed to start processing: ${error.message}`);
    }
  }

  /**
   * Update processing progress
   */
  static async updateProgress(videoId, progress) {
    try {
      console.log('[PROGRESS-UPDATE] Updating video', videoId, 'to', progress, '%');
      const video = await Video.findByIdAndUpdate(
        videoId,
        { processingProgress: Math.min(progress, 99) },
        { new: true }
      );
      console.log('[PROGRESS-UPDATE] Updated successfully');
      return video;
    } catch (error) {
      console.error('[PROGRESS-UPDATE] Error:', error.message);
      throw new Error(`Failed to update progress: ${error.message}`);
    }
  }

  /**
   * Complete processing with analysis results
   */
  static async completeProcessing(videoId, analysisResult) {
    try {
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          status: analysisResult.result,
          processingProgress: 100,
          processingCompletedAt: new Date(),
          sensitivityAnalysis: {
            score: analysisResult.score,
            result: analysisResult.result,
            rules: analysisResult.rules,
            detectedIssues: analysisResult.detectedIssues || [],
            categoryBreakdown: analysisResult.categoryBreakdown || {},
            summary: analysisResult.summary || '',
            analyzedAt: new Date()
          }
        },
        { new: true }
      );
      return video;
    } catch (error) {
      throw new Error(`Failed to complete processing: ${error.message}`);
    }
  }

  /**
   * Mark video as failed during processing
   */
  static async failProcessing(videoId, errorMessage) {
    try {
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          status: 'failed',
          processingProgress: 0,
          processingCompletedAt: new Date(),
          $push: {
            processingErrors: {
              step: 'processing',
              error: errorMessage,
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );
      return video;
    } catch (error) {
      throw new Error(`Failed to mark video as failed: ${error.message}`);
    }
  }

  /**
   * Simulate async processing (in real app, would use job queue like Bull)
   */
  static async processVideoAsync(videoId, video, ioEmitter = null) {
    try {
      console.log('[PROCESSING] Starting async processing for video:', videoId);
      
      // Start processing
      await this.startProcessing(videoId);
      console.log('[PROCESSING] Status set to processing');

      if (ioEmitter) {
        console.log('[PROCESSING] Emitting video-processing-start');
        ioEmitter('video-processing-start', { videoId, progress: 10, step: 'Starting video processing' });
      }

      // Validate video format with FFmpeg
      try {
        console.log('[PROCESSING] Validating video format with FFmpeg');
        const filePath = video.filepath || video.path || video.url;
        const validation = await this.validateVideoFormat(filePath);
        console.log('[PROCESSING] Video validation successful:', validation);
        
        // Update video with FFmpeg validation results
        await Video.findByIdAndUpdate(
          videoId,
          {
            $set: {
              'ffmpegValidation.codec': validation.codec,
              'ffmpegValidation.format': validation.format,
              'ffmpegValidation.duration': validation.duration,
              'ffmpegValidation.resolution': validation.resolution,
              'ffmpegValidation.frameRate': validation.frameRate,
              'ffmpegValidation.validatedAt': new Date()
            }
          },
          { new: true }
        );
      } catch (validationError) {
        console.error('[PROCESSING] FFmpeg validation failed:', validationError.message);
        await this.failProcessing(videoId, `FFmpeg validation failed: ${validationError.message}`);
        throw validationError;
      }

      // Simulate processing steps with progress
      const steps = [
        { progress: 20, step: 'Validating video format and codec', delay: 1000 },
        { progress: 35, step: 'Extracting metadata and duration', delay: 1500 },
        { progress: 50, step: 'Generating thumbnail preview', delay: 1200 },
        { progress: 65, step: 'Analyzing content sensitivity', delay: 2000 },
        { progress: 80, step: 'Optimizing video for streaming', delay: 1500 },
        { progress: 95, step: 'Finalizing processing and indexing', delay: 1000 }
      ];

      for (const { progress, step, delay } of steps) {
        try {
          console.log(`[PROCESSING] Step: ${step} - Waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.log(`[PROCESSING] Updating progress to ${progress}%`);
          await this.updateProgress(videoId, progress);

          if (ioEmitter) {
            console.log(`[PROCESSING] Emitting progress update: ${progress}%`);
            ioEmitter('video-progress-update', { videoId, progress, step });
          }
        } catch (stepError) {
          console.error(`[PROCESSING] Error in step (${progress}%):`, stepError.message);
          throw stepError;
        }
      }

      console.log('[PROCESSING] All steps complete, running sensitivity analysis');
      // Run sensitivity analysis
      const analysisResult = await this.analyzeSensitivity(video);
      console.log('[PROCESSING] Analysis complete, result:', analysisResult.result);

      // Complete processing with results
      const processed = await this.completeProcessing(videoId, analysisResult);
      console.log('[PROCESSING] Processing complete');

      if (ioEmitter) {
        console.log('[PROCESSING] Emitting video-processing-complete');
        ioEmitter('video-processing-complete', {
          videoId,
          progress: 100,
          step: 'Processing complete',
          status: processed.status,
          analysis: analysisResult
        });
      }

      console.log('[PROCESSING] Async processing finished successfully for:', videoId);
      return processed;
    } catch (error) {
      console.error('[PROCESSING] Video Processing Error:', error.message, error.stack);
      try {
        await this.failProcessing(videoId, error.message);
      } catch (failError) {
        console.error('[PROCESSING] Error marking video as failed:', failError.message);
      }

      if (ioEmitter) {
        console.log('[PROCESSING] Emitting video-processing-failed');
        ioEmitter('video-processing-failed', {
          videoId,
          error: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Get video processing status
   */
  static async getProcessingStatus(videoId) {
    try {
      const video = await Video.findById(videoId).select(
        'status processingProgress sensitivityAnalysis processingErrors createdAt processingCompletedAt'
      );

      if (!video) {
        throw new Error('Video not found');
      }

      return {
        status: video.status,
        progress: video.processingProgress,
        analysis: video.sensitivityAnalysis,
        errors: video.processingErrors,
        timeline: {
          createdAt: video.createdAt,
          completedAt: video.processingCompletedAt
        }
      };
    } catch (error) {
      throw new Error(`Failed to get processing status: ${error.message}`);
    }
  }
}

module.exports = VideoProcessingService;
