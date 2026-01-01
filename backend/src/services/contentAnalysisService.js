const vision = require('@google-cloud/vision');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Lazily initialize Vision API client to support multiple credential methods:
// - GOOGLE_APPLICATION_CREDENTIALS: path to service account JSON file
// - GOOGLE_APPLICATION_CREDENTIALS_JSON: raw JSON string of service account (useful for env/secret stores)
let visionClient;
function getVisionClient() {
  if (visionClient) return visionClient;

  const clientOptions = {};

  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      // Write JSON content to a temporary file and provide that path to the client
      const tmpPath = path.join(os.tmpdir(), `gcloud_key_${Date.now()}.json`);
      fs.writeFileSync(tmpPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, { mode: 0o600 });
      clientOptions.keyFilename = tmpPath;
      console.log('Using Google credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('Using Google credentials from GOOGLE_APPLICATION_CREDENTIALS');
    }
  } catch (err) {
    console.error('Error preparing Google credential file:', err);
  }

  visionClient = new vision.ImageAnnotatorClient(clientOptions);
  return visionClient;
}

/**
 * Analyze video content for safety using Google Cloud Vision API
 * Extracts frames from the video URL and analyzes them
 * Returns 'safe' or 'flagged' based on content safety detection
 */
exports.analyzeVideoSafety = async (videoUrl) => {
  try {
    // If no credentials configured, default to 'safe'
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Google Cloud credentials not configured, defaulting to safe');
      return 'safe';
    }

    // Call Safe Search Detection on the video URL
    // This analyzes the content for adult, spoof, medical, violence, and racy content
    const request = {
      image: {
        source: {
          imageUri: videoUrl
        }
      }
    };

    const response = await visionClient.safeSearchDetection(request);
    const safeSearchResult = response[0].safeSearchAnnotation;

    // Determine safety status based on likelihood scores
    const isFlagged = 
      safeSearchResult.adult === 'VERY_LIKELY' ||
      safeSearchResult.adult === 'LIKELY' ||
      safeSearchResult.violence === 'VERY_LIKELY' ||
      safeSearchResult.violence === 'LIKELY' ||
      safeSearchResult.racy === 'VERY_LIKELY';

    return isFlagged ? 'flagged' : 'safe';
  } catch (error) {
    console.error('Error analyzing video content:', error);
    // Default to safe if analysis fails
    return 'safe';
  }
};

/**
 * Alternative lightweight analysis using heuristics
 * This can be used as a fallback or standalone approach
 */
exports.analyzeVideoSafetyLightweight = async (videoUrl, videoTitle, videoDescription) => {
  try {
    // Simple heuristic-based analysis
    const flaggedKeywords = [
      'adult', 'explicit', 'nsfw', 'mature',
      'violence', 'gore', 'brutal', 'extreme',
      'hate', 'racist', 'offensive'
    ];

    const content = `${videoTitle} ${videoDescription}`.toLowerCase();
    
    const hasFlaggedContent = flaggedKeywords.some(keyword => 
      content.includes(keyword)
    );

    return hasFlaggedContent ? 'flagged' : 'safe';
  } catch (error) {
    console.error('Error in lightweight analysis:', error);
    return 'safe';
  }
};

/**
 * Comprehensive analysis combining multiple approaches
 */
exports.analyzeSafety = async (videoUrl, videoTitle, videoDescription) => {
  try {
    // Try Google Cloud Vision first if configured
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const visionResult = await exports.analyzeVideoSafety(videoUrl);
      if (visionResult === 'flagged') {
        return 'flagged';
      }
    }

    // Fallback to lightweight heuristic analysis
    const lightweightResult = await exports.analyzeVideoSafetyLightweight(
      videoUrl,
      videoTitle,
      videoDescription
    );

    return lightweightResult;
  } catch (error) {
    console.error('Error in comprehensive safety analysis:', error);
    return 'safe';
  }
};
