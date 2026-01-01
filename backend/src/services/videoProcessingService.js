/**
 * Video Processing Service
 * Handles video status pipeline and content sensitivity analysis
 */

const Video = require('../models/Video');

class VideoProcessingService {
  /**
   * Performs dummy sensitivity analysis on video metadata
   * Real implementation would integrate with ML models or APIs
   */
  static async analyzeSensitivity(video) {
    try {
      const { title, description, filename } = video;
      const fullText = `${title} ${description} ${filename}`.toLowerCase();

      let score = 0;
      let result = 'safe';
      const rules = [];

      // Rule 1: Check filename for blocked keywords
      const blockedKeywords = ['adult', 'explicit', 'restricted', 'nsfw', 'inappropriate'];
      blockedKeywords.forEach(keyword => {
        if (filename.toLowerCase().includes(keyword)) {
          score += 30;
          rules.push(`Blocked keyword "${keyword}" found in filename`);
          result = 'flagged';
        }
      });

      // Rule 2: Check title for suspicious patterns
      const suspiciousPatterns = [/\b(xxx|porn|sex)\b/gi];
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(title)) {
          score += 40;
          rules.push('Suspicious content pattern detected in title');
          result = 'flagged';
        }
      });

      // Rule 3: Random flag (simulating ML analysis)
      // In production, this would be real ML model output
      const randomFlagChance = Math.random();
      if (randomFlagChance < 0.05) {
        // 5% chance to flag video
        score += 20;
        rules.push('Random ML model evaluation resulted in flag');
        result = 'flagged';
      }

      // Rule 4: Description length analysis
      if (description && description.length > 500) {
        score += 5;
        rules.push('Unusually long description');
      }

      // Rule 5: Repeated characters (spam detection)
      const repeatedCharPattern = /(.)\1{4,}/g;
      if (repeatedCharPattern.test(fullText)) {
        score += 15;
        rules.push('Repeated characters detected (spam pattern)');
        result = 'flagged';
      }

      // Ensure score stays within bounds
      score = Math.min(score, 100);

      return {
        score,
        result: score > 50 ? 'flagged' : result,
        rules: rules.length > 0 ? rules : ['Passed all content checks']
      };
    } catch (error) {
      console.error('Sensitivity Analysis Error:', error);
      return {
        score: 0,
        result: 'safe',
        rules: ['Analysis skipped due to error'],
        error: error.message
      };
    }
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
      const video = await Video.findByIdAndUpdate(
        videoId,
        { processingProgress: Math.min(progress, 99) },
        { new: true }
      );
      return video;
    } catch (error) {
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
      // Start processing
      await this.startProcessing(videoId);

      if (ioEmitter) {
        ioEmitter('video-processing-start', { videoId });
      }

      // Simulate processing steps with progress
      const steps = [
        { progress: 20, step: 'Validating format', delay: 1000 },
        { progress: 40, step: 'Extracting metadata', delay: 1500 },
        { progress: 60, step: 'Analyzing content sensitivity', delay: 2000 },
        { progress: 80, step: 'Finalizing processing', delay: 1000 }
      ];

      for (const { progress, step, delay } of steps) {
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.updateProgress(videoId, progress);

        if (ioEmitter) {
          ioEmitter('video-progress-update', { videoId, progress, step });
        }
      }

      // Run sensitivity analysis
      const analysisResult = await this.analyzeSensitivity(video);

      // Complete processing with results
      const processed = await this.completeProcessing(videoId, analysisResult);

      if (ioEmitter) {
        ioEmitter('video-processing-complete', {
          videoId,
          status: processed.status,
          analysis: analysisResult
        });
      }

      return processed;
    } catch (error) {
      console.error('Video Processing Error:', error);
      await this.failProcessing(videoId, error.message);

      if (ioEmitter) {
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
