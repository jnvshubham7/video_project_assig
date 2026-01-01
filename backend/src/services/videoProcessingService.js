/**
 * Video Processing Service
 * Handles video status pipeline and content sensitivity analysis
 */

const Video = require('../models/Video');

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
  static async analyzeSensitivity(video) {
    try {
      const { title, description, filename } = video;
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

      // Determine final result
      const result = totalScore > 50 ? 'flagged' : 'safe';

      // Create comprehensive summary
      const summary = this._createSummary(
        result,
        totalScore,
        detectedIssues,
        rules,
        categoryBreakdown
      );

      return {
        score: totalScore,
        result,
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
      // Start processing
      await this.startProcessing(videoId);

      if (ioEmitter) {
        ioEmitter('video-processing-start', { videoId, progress: 10, step: 'Starting video processing' });
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
          progress: 100,
          step: 'Processing complete',
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
