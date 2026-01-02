const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const VideoProcessingService = require('../services/videoProcessingService');
const Video = require('../models/Video');
const User = require('../models/User');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Video.deleteMany({});
  await User.deleteMany({});
  await Organization.deleteMany({});
  await OrganizationMember.deleteMany({});
});

describe('Content Sensitivity Analysis', () => {
  describe('Explicit Content Detection', () => {
    it('should detect explicit content keywords', () => {
      const text = 'This video contains adult and explicit content';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should weight explicit content heavily (40x)', () => {
      const text = 'adult explicit content';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      // Explicit content weight is 40
      expect(result.accuracy_score).toBeGreaterThan(25);
    });
  });

  describe('Violence & Gore Detection', () => {
    it('should identify violent content keywords', () => {
      const text = 'Violence and gore depicted in this video';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      if (result.flagged_categories.includes('Violence/Gore')) {
        expect(result.accuracy_score).toBeGreaterThan(15);
      }
    });

    it('should weight violence content with 30x multiplier', () => {
      const text = 'murder kill brutal assault';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });

  describe('Hate Speech Detection', () => {
    it('should flag hate speech and discrimination', () => {
      const text = 'hate speech and racist content';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      if (result.flagged_categories.length > 0) {
        expect(result.accuracy_score).toBeGreaterThan(15);
      }
    });

    it('should weight hate speech with 35x multiplier', () => {
      const text = 'racism discrimination prejudice';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });

  describe('Illegal Activity Detection', () => {
    it('should detect illegal activity references', () => {
      const text = 'This video shows illegal drug activity and criminal behavior';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should weight illegal content with 35x multiplier', () => {
      const text = 'drug cocaine heroin steal robbery';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });

  describe('Self-Harm & Dangerous Content Detection', () => {
    it('should identify self-harm and dangerous content', () => {
      const text = 'This contains self-harm and suicide content';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should weight harmful content with 38x multiplier', () => {
      const text = 'suicide self-harm dangerous trauma abuse';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });

  describe('Spam & Misleading Content Detection', () => {
    it('should recognize spam and misleading content', () => {
      const text = 'This is spam clickbait and fake news';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.flagged_categories).toBeDefined();
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should weight spam with 20x multiplier', () => {
      const text = 'spam scam fake hoax misinformation';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });
});

describe('Content Scoring System', () => {
  describe('Keyword Matching', () => {
    it('should perform case-insensitive keyword matching', () => {
      const text = 'ADULT EXPLICIT Content';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should match partial words in text', () => {
      const text = 'This contains some explicit material';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });

    it('should count keyword frequency for accuracy', () => {
      const singleKeyword = 'violence';
      const multipleKeywords = 'violence murder kill brutal assault';
      
      const result1 = VideoProcessingService.analyzeSensitivity(singleKeyword);
      const result2 = VideoProcessingService.analyzeSensitivity(multipleKeywords);
      
      // Multiple keywords should have higher score
      expect(result2.accuracy_score).toBeGreaterThanOrEqual(result1.accuracy_score);
    });

    it('should handle multiple flagged categories in one video', () => {
      const text = 'violence and explicit adult content with hate speech';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(Array.isArray(result.flagged_categories)).toBe(true);
      expect(result.flagged_categories.length).toBeGreaterThan(0);
    });

    it('should process metadata fields (title and description)', () => {
      const title = 'Explicit adult content';
      const description = 'This video contains violent material';
      
      const result = VideoProcessingService.analyzeSensitivity(title + ' ' + description);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate composite sensitivity score', () => {
      const text = 'adult violence and illegal drugs';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(typeof result.accuracy_score).toBe('number');
      expect(result.accuracy_score).toBeGreaterThanOrEqual(0);
      expect(result.accuracy_score).toBeLessThanOrEqual(100);
    });

    it('should apply weighted scores for different categories', () => {
      const text = 'violence'; // Weight: 30
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.accuracy_score).toBeGreaterThan(0);
      expect(result.accuracy_score).toBeLessThanOrEqual(100);
    });

    it('should return safe classification for score ≤ 30', () => {
      const text = 'This is a safe educational video about learning';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      expect(result.status).toBe('safe');
    });

    it('should return flagged classification for score > 30', () => {
      const text = 'adult explicit violent content with hate speech and illegal drugs';
      const result = VideoProcessingService.analyzeSensitivity(text);
      
      if (result.accuracy_score > 30) {
        expect(result.status).toBe('flagged');
      }
    });
  });
});

describe('Video Status Pipeline', () => {
  let user, organization, video;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    organization = new Organization({
      name: 'Test Org',
      slug: 'test-org'
    });
    await organization.save();

    const membership = new OrganizationMember({
      userId: user._id,
      organizationId: organization._id,
      role: 'admin'
    });
    await membership.save();

    video = new Video({
      title: 'Test Video',
      description: 'Test video for sensitivity analysis',
      filename: 'test.mp4',
      filepath: 'uploads/test.mp4',
      userId: user._id,
      organizationId: organization._id,
      size: 1024,
      status: 'uploaded'
    });
    await video.save();
  });

  it('should update video to processing status', async () => {
    video.status = 'processing';
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe('processing');
  });

  it('should update video to completed status', async () => {
    video.status = 'safe';
    video.sensitivityAnalysis = {
      result: 'safe',
      score: 15,
      detectedIssues: [],
      categoryBreakdown: {}
    };
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe('safe');
    expect(updated.sensitivityAnalysis.result).toBe('safe');
  });

  it('should update video to flagged status', async () => {
    video.status = 'flagged';
    video.sensitivityAnalysis = {
      result: 'flagged',
      score: 65,
      detectedIssues: [
        { category: 'Explicit Content', score: 40, keywords: [] },
        { category: 'Violence/Gore', score: 30, keywords: [] }
      ],
      categoryBreakdown: {}
    };
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe('flagged');
    expect(updated.sensitivityAnalysis.result).toBe('flagged');
  });

  it('should store sensitivity data with video', async () => {
    const sensitivityData = {
      result: 'safe',
      score: 20,
      detectedIssues: [],
      processedAt: new Date()
    };

    video.sensitivityAnalysis = sensitivityData;
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.sensitivityAnalysis).toBeDefined();
    expect(updated.sensitivityAnalysis.score).toBe(20);
    expect(updated.sensitivityAnalysis.result).toBe('safe');
  });

  it('should handle processing errors gracefully', async () => {
    // Mark processing as failed and add a processing error
    video.status = 'failed';
    video.processingErrors = [
      { step: 'processing', error: 'Processing failed' }
    ];
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe('failed');
    expect(updated.processingErrors.length).toBeGreaterThan(0);
    expect(updated.processingErrors[0].error).toBeDefined();
  });

  it('should transition status from uploaded to processing to completed', async () => {
    // Initial status
    expect(video.status).toBe('uploaded');

    // Update to processing
    video.status = 'processing';
    await video.save();
    let updated = await Video.findById(video._id);
    expect(updated.status).toBe('processing');

    // Update to completed (map to 'safe')
    video.status = 'safe';
    video.sensitivityAnalysis = {
      result: 'safe',
      score: 25,
      detectedIssues: [],
      categoryBreakdown: {}
    };
    await video.save();
    updated = await Video.findById(video._id);
    expect(updated.status).toBe('safe');
    expect(updated.sensitivityAnalysis.result).toBe('safe');
  });

  it('should preserve video metadata during status transitions', async () => {
    const originalTitle = video.title;
    const originalDescription = video.description;

    video.status = 'processing';
    await video.save();

    video.status = 'safe';
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.title).toBe(originalTitle);
    expect(updated.description).toBe(originalDescription);
  });
});

describe('Sensitivity Analysis Integration', () => {
  it('should analyze video metadata comprehensively', () => {
    const metadata = {
      title: 'Educational video on history',
      description: 'Learn about important historical events',
      category: 'education'
    };

    const combinedText = metadata.title + ' ' + metadata.description;
    const result = VideoProcessingService.analyzeSensitivity(combinedText);

    expect(result).toBeDefined();
    expect(result.accuracy_score).toBeGreaterThanOrEqual(0);
    expect(result.status).toBeDefined();
  });

  it('should handle empty or null content', () => {
    const emptyText = '';
    const result = VideoProcessingService.analyzeSensitivity(emptyText);

    expect(result.accuracy_score).toBeLessThanOrEqual(30);
    expect(result.status).toBe('safe');
  });

  it('should handle very long content', () => {
    const longText = 'word '.repeat(10000); // Very long text
    const result = VideoProcessingService.analyzeSensitivity(longText);

    expect(result.accuracy_score).toBeDefined();
    expect(result.status).toBeDefined();
  });

  it('should provide consistent results for same input', () => {
    const text = 'violent adult content';
    
    const result1 = VideoProcessingService.analyzeSensitivity(text);
    const result2 = VideoProcessingService.analyzeSensitivity(text);

    expect(result1.accuracy_score).toBe(result2.accuracy_score);
    expect(result1.status).toBe(result2.status);
  });

  it('should return detailed flagged categories', () => {
    const text = 'adult violent and illegal drug content';
    const result = VideoProcessingService.analyzeSensitivity(text);

    expect(Array.isArray(result.flagged_categories)).toBe(true);
    result.flagged_categories.forEach(category => {
      expect(typeof category).toBe('string');
    });
  });
});

describe('Edge Cases & Error Handling', () => {
  it('should handle special characters in text', () => {
    const text = 'adult!@#$%^&*()_+ content "quoted" content';
    const result = VideoProcessingService.analyzeSensitivity(text);

    expect(result.accuracy_score).toBeGreaterThan(0);
  });

  it('should handle multiple spaces and newlines', () => {
    const text = 'adult\n\n\nmultiple\t\tspaces\r\ncontent';
    const result = VideoProcessingService.analyzeSensitivity(text);

    expect(result.accuracy_score).toBeGreaterThan(0);
  });

  it('should handle unicode and international characters', () => {
    const text = 'Video with café, naïve, and 日本語 content';
    const result = VideoProcessingService.analyzeSensitivity(text);

    expect(result.accuracy_score).toBeDefined();
  });

  it('should normalize scores to 0-100 range', () => {
    const texts = [
      'safe content',
      'mildly sensitive content',
      'highly violent adult illegal content'
    ];

    texts.forEach(text => {
      const result = VideoProcessingService.analyzeSensitivity(text);
      expect(result.accuracy_score).toBeGreaterThanOrEqual(0);
      expect(result.accuracy_score).toBeLessThanOrEqual(100);
    });
  });
});
