// background.js - Unified interest capture and classification service worker

// Import both services
import InterestCaptureService from '../services/interestCaptureService.js';
import ClassificationService from './classificationService.js';

// Initialize services
const interestCapture = new InterestCaptureService();
const classifier = new ClassificationService();
const activeUsers = new Map(); // Track active user sessions

console.log('✅ Unified interest capture and classification service started');

// Listen for tab updates (page navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-capture interests on every page load
    await capturePageInterests(tabId, tab);
  }
});

// Listen for content script messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'PAGE_DATA':
          // Content script sends page data for interest capture
          const interests = await processPageData(request.data, sender.tab.id);
          sendResponse({ success: true, interests });
          break;
          
        case 'CLASSIFY_CONTENT':
          // Content script requests pattern-based classification
          const classification = await handleClassification(request.data);
          sendResponse({ success: true, data: classification });
          break;
          
        case 'TRACK_ENGAGEMENT':
          // Legacy engagement tracking (still supported)
          const engagement = await handleEngagement(request.data);
          sendResponse({ success: true, data: engagement });
          break;
          
        case 'GET_USER_INTERESTS':
          // Popup requests user interests
          const profile = await getUserInterestProfile(request.userId);
          sendResponse({ success: true, profile });
          break;
          
        case 'CHECK_QUESTS':
          // Check for matching quests
          const matches = await checkQuestMatches(request.userId);
          sendResponse({ success: true, matches });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown request type' });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep channel open
});

/**
 * Auto-capture interests when page loads
 */
async function capturePageInterests(tabId, tab) {
  // Skip extension pages and chrome:// URLs
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }
  
  console.log(`📊 Auto-capturing interests for: ${tab.url}`);
  
  // Inject content script if needed
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  } catch (error) {
    console.log('Content script already injected or page not accessible');
  }
}

/**
 * Process page data from content script (unified interest + classification)
 */
async function processPageData(pageData, tabId) {
  // Get user ID (from wallet or generate session ID)
  const userId = await getUserId();
  
  // Extract interests from page using interest capture service
  const interests = interestCapture.extractInterests(pageData);
  
  console.log('🎯 Interests extracted:', {
    domain: new URL(pageData.url).hostname,
    topCategories: interestCapture.getTopCategories(interests.vector, 3),
    contextFlags: interests.context,
    weight: interests.weight.toFixed(2),
    isUpdate: pageData.isUpdate || false
  });
  
  // Update user profile with new interests
  await interestCapture.updateInterestProfile(userId, interests);
  
  // Check for immediate quest matches if high relevance
  if (interests.weight > 0.7) {
    await checkAndNotifyQuestMatches(userId);
  }
  
  return interests;
}

/**
 * Get or create user ID
 */
async function getUserId() {
  const stored = await chrome.storage.local.get('userId');
  
  if (stored.userId) {
    return stored.userId;
  }
  
  // Generate new user ID (in production, this would be wallet-based)
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ userId });
  
  return userId;
}

/**
 * Get user interest profile
 */
async function getUserInterestProfile(userId) {
  // Get from memory first
  const memoryProfile = interestCapture.interestVault.get(userId);
  
  if (memoryProfile) {
    return {
      topCategories: interestCapture.getTopCategories(memoryProfile.vector),
      pageCount: memoryProfile.pageCount,
      lastUpdate: memoryProfile.lastUpdate
    };
  }
  
  // Get from storage
  const stored = await chrome.storage.local.get(`interest_${userId}`);
  return stored[`interest_${userId}`] || null;
}

/**
 * Check for quest matches
 */
async function checkQuestMatches(userId) {
  // Get available quests (in production, fetch from API)
  const availableQuests = await getAvailableQuests();
  
  // Match with user interests
  const matches = await interestCapture.matchQuests(userId, availableQuests);
  
  console.log(`🎮 Found ${matches.length} matching quests for user`);
  
  return matches;
}

/**
 * Check and notify about new quest matches
 */
async function checkAndNotifyQuestMatches(userId) {
  const matches = await checkQuestMatches(userId);
  
  // Get previously shown quests
  const { shownQuests = [] } = await chrome.storage.local.get('shownQuests');
  
  // Find new matches
  const newMatches = matches.filter(
    quest => !shownQuests.includes(quest.id) && quest.matchScore > 0.7
  );
  
  if (newMatches.length > 0) {
    // Update badge
    chrome.action.setBadgeText({ text: newMatches.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
    
    // Store shown quests
    shownQuests.push(...newMatches.map(q => q.id));
    await chrome.storage.local.set({ shownQuests });
    
    console.log(`✨ ${newMatches.length} new quest matches!`);
  }
}

/**
 * Get available quests (mock data for demo)
 */
async function getAvailableQuests() {
  // In production, this would fetch from your API
  return [
    {
      id: 'quest_defi_101',
      title: 'DeFi Explorer Quest',
      description: 'Learn about decentralized finance',
      requiredInterests: {
        finance: 0.7,
        technology: 0.3
      },
      threshold: 0.6,
      reward: '50 tokens'
    },
    {
      id: 'quest_nft_creator',
      title: 'NFT Creator Journey',
      description: 'Create your first NFT',
      requiredInterests: {
        technology: 0.5,
        entertainment: 0.3,
        lifestyle: 0.2
      },
      threshold: 0.5,
      reward: '100 tokens'
    },
    {
      id: 'quest_web3_gamer',
      title: 'Web3 Gaming Challenge',
      description: 'Explore blockchain gaming',
      requiredInterests: {
        gaming: 0.8,
        technology: 0.2
      },
      threshold: 0.7,
      reward: '75 tokens'
    }
  ];
}

// Periodic tasks
chrome.alarms.create('commitInterests', { periodInMinutes: 5 });
chrome.alarms.create('checkQuests', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const userId = await getUserId();
  
  switch (alarm.name) {
    case 'commitInterests':
      // Commit interest data to storage
      await interestCapture.commitToStorage(userId);
      console.log('💾 Interests committed to storage');
      break;
      
    case 'checkQuests':
      // Periodic quest check
      await checkAndNotifyQuestMatches(userId);
      break;
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 Unified extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default storage
    await chrome.storage.local.set({
      settings: {
        autoCapture: true,
        privacyMode: true,
        questNotifications: true,
        patternClassification: true
      }
    });
    
    // Log service statistics
    console.log('📊 Classification patterns:', classifier.getPatternStats());
    console.log('🎯 Interest categories:', Object.keys(interestCapture.topicCategories).length);
    
    // Open onboarding page
    chrome.tabs.create({
      url: 'onboarding.html'
    });
  }
});

/**
 * Handle content classification using pattern-based classifier
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
 * Handle engagement tracking (legacy support)
 */
async function handleEngagement(data) {
  console.log('🎯 Processing engagement data');
  
  try {
    const engagement = classifier.calculateEngagement(data.interactions);
    
    console.log('✅ Engagement calculated:', {
      score: engagement.score.toFixed(2),
      level: engagement.level
    });
    
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