// background.js - Production-ready service worker with pattern-based classification

// Import ClassificationService using ES6 import
import ClassificationService from './classificationService.js';

// Initialize services
const classifier = new ClassificationService();
let sessionData = new Map();

console.log('✅ Pattern-based classification service worker started');

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Keep the message channel open for async response
  (async () => {
    try {
      switch (request.type) {
        case 'CLASSIFY_CONTENT':
          const classification = await handleClassification(request.data);
          sendResponse({ success: true, data: classification });
          break;
          
        case 'TRACK_ENGAGEMENT':
          const engagement = await handleEngagement(request.data);
          sendResponse({ success: true, data: engagement });
          break;
          
        case 'GET_SESSION_DATA':
          const session = await getSessionData(request.sessionId);
          sendResponse({ success: true, data: session });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown request type' });
      }
    } catch (error) {
      console.error('❌ Error processing request:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open
});

/**
 * Handle content classification
 * @param {Object} data - Content data to classify
 * @returns {Object} Classification result
 */
async function handleClassification(data) {
  console.log('🔍 Classification request:', data.url);
  
  try {
    // Perform pattern-based classification
    const result = classifier.classify(data);
    
    console.log('✅ Classification completed:', {
      category: result.category,
      subcategory: result.subcategory,
      confidence: result.confidence.toFixed(2),
      method: 'pattern_matching'
    });
    
    // Store in session
    await storeClassification(data.url, result);
    
    return result;
  } catch (error) {
    console.error('❌ Classification failed:', error);
    // Fallback to basic classification
    return {
      category: 'general',
      subcategory: 'page',
      confidence: 0.5,
      method: 'fallback',
      error: error.message
    };
  }
}

/**
 * Handle engagement tracking
 * @param {Object} data - Engagement data
 * @returns {Object} Engagement metrics
 */
async function handleEngagement(data) {
  console.log('🎯 Processing engagement data');
  
  try {
    const engagement = classifier.calculateEngagement(data.interactions);
    
    console.log('✅ Engagement calculated:', {
      score: engagement.score.toFixed(2),
      level: engagement.level
    });
    
    // Update session data
    await updateSessionEngagement(data.sessionId, engagement);
    
    return engagement;
  } catch (error) {
    console.error('❌ Engagement calculation failed:', error);
    return {
      score: 0,
      level: 'error',
      error: error.message
    };
  }
}

/**
 * Store classification result
 * @param {string} url - Page URL
 * @param {Object} classification - Classification result
 */
async function storeClassification(url, classification) {
  const key = `classification_${new URL(url).hostname}`;
  const data = {
    [url]: {
      ...classification,
      timestamp: Date.now()
    }
  };
  
  // Get existing data
  const existing = await chrome.storage.local.get(key);
  if (existing[key]) {
    Object.assign(existing[key], data);
    await chrome.storage.local.set({ [key]: existing[key] });
  } else {
    await chrome.storage.local.set({ [key]: data });
  }
}

/**
 * Update session engagement data
 * @param {string} sessionId - Session ID
 * @param {Object} engagement - Engagement data
 */
async function updateSessionEngagement(sessionId, engagement) {
  const session = sessionData.get(sessionId) || {
    id: sessionId,
    startTime: Date.now(),
    classifications: [],
    engagements: []
  };
  
  session.engagements.push({
    ...engagement,
    timestamp: Date.now()
  });
  
  // Calculate session totals
  session.totalEngagement = session.engagements.reduce(
    (sum, e) => sum + e.score, 0
  ) / session.engagements.length;
  
  sessionData.set(sessionId, session);
  
  // Persist important sessions
  if (session.totalEngagement > 0.7) {
    await chrome.storage.local.set({
      [`session_${sessionId}`]: session
    });
  }
}

/**
 * Get session data
 * @param {string} sessionId - Session ID
 * @returns {Object} Session data
 */
async function getSessionData(sessionId) {
  // Check memory first
  if (sessionData.has(sessionId)) {
    return sessionData.get(sessionId);
  }
  
  // Check storage
  const stored = await chrome.storage.local.get(`session_${sessionId}`);
  return stored[`session_${sessionId}`] || null;
}

// Clean up old data periodically
chrome.alarms.create('cleanup', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    await cleanupOldData();
  }
});

/**
 * Clean up old classification and session data
 */
async function cleanupOldData() {
  console.log('🧹 Cleaning up old data');
  
  const storage = await chrome.storage.local.get();
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  const toRemove = [];
  
  for (const [key, value] of Object.entries(storage)) {
    if (key.startsWith('classification_') || key.startsWith('session_')) {
      const timestamp = value.timestamp || value.startTime;
      if (timestamp && (now - timestamp) > maxAge) {
        toRemove.push(key);
      }
    }
  }
  
  if (toRemove.length > 0) {
    await chrome.storage.local.remove(toRemove);
    console.log(`✅ Removed ${toRemove.length} old entries`);
  }
}

// Handle extension installation/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 Extension installed/updated:', details.reason);
  
  // Initialize default settings
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      settings: {
        classificationEnabled: true,
        engagementTracking: true,
        debugMode: false
      }
    });
  }
  
  // Log pattern statistics for debugging
  console.log('📊 Pattern statistics:', classifier.getPatternStats());
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifier,
    handleClassification,
    handleEngagement
  };
}
