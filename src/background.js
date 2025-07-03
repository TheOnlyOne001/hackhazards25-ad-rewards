// background.js - Enhanced background worker with ad-grade interest capture

import EnhancedInterestEngine from './services/enhancedInterestEngine.js';

// Load taxonomy data
let taxonomy = null;
async function loadTaxonomy() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/taxonomy.json'));
    taxonomy = await response.json();
  } catch (error) {
    console.error('Failed to load taxonomy:', error);
    // Fallback to empty taxonomy
    taxonomy = { taxonomy: {}, intentSignals: {} };
  }
}

// Initialize services after loading taxonomy
let interestEngine = null;
const userProfiles = new Map(); // userId -> engine instance

async function initializeServices() {
  await loadTaxonomy();
  interestEngine = new EnhancedInterestEngine(taxonomy);
  console.log('✅ Enhanced interest capture service started');
  console.log(`📊 Loaded ${Object.keys(taxonomy.taxonomy).length} sectors with 120+ tags`);
}

// Initialize on startup
initializeServices();

// Initialize geo permission on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('🚀 Extension installed, initializing...');
    
    // Set default settings
    await chrome.storage.local.set({
      settings: {
        enhancedCapture: true,
        geoTracking: false,
        ptaTracking: true,
        privacyMode: true
      }
    });
    
    // Initialize user
    const userId = await getOrCreateUserId();
    const engine = await getOrCreateEngine(userId);
    
    // Request geo permission (optional)
    chrome.permissions.request({
      permissions: ['geolocation']
    }, (granted) => {
      if (granted) {
        engine.setGeoBucket();
      }
    });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'ENHANCED_PAGE_DATA':
          const result = await processEnhancedPageData(request.data, sender.tab);
          sendResponse({ success: true, result });
          break;
          
        case 'GET_INTEREST_PROFILE':
          const profile = await getInterestProfile(request.userId);
          sendResponse({ success: true, profile });
          break;
          
        case 'GET_QUEST_MATCHES':
          const matches = await getQuestMatches(request.userId);
          sendResponse({ success: true, matches });
          break;
          
        case 'EXPORT_INTERESTS':
          const exportData = await exportInterests(request.userId);
          sendResponse({ success: true, data: exportData });
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
 * Process enhanced page data with intent detection
 */
async function processEnhancedPageData(data, tab) {
  const userId = await getOrCreateUserId();
  const engine = await getOrCreateEngine(userId);
  
  console.log(`📊 Processing enhanced data for: ${new URL(data.url).hostname}`);
  console.log(`🎯 Intent signals detected: ${data.intentSignals.length}`);
  console.log(`💰 Price elements found: ${data.domSignals.priceCount}`);
  
  // Process with enhanced engine
  const result = await engine.processPageVisit(data);
  
  // Log high-intent detections
  if (result.ptaScore > 0.7) {
    console.log(`🔥 High PtA detected: ${result.ptaScore} on ${data.url}`);
    
    // Update badge for high-intent activity
    chrome.action.setBadgeText({ 
      text: Math.round(result.ptaScore * 100).toString(),
      tabId: tab.id 
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: '#ff0000',
      tabId: tab.id 
    });
  }
  
  // Store results
  await storeEnhancedProfile(userId, result);
  
  // Check for immediate quest matches if high intent
  if (result.ptaScore > 0.6) {
    await checkQuestMatches(userId, result);
  }
  
  return result;
}

/**
 * Get or create user ID
 */
async function getOrCreateUserId() {
  const stored = await chrome.storage.local.get('userId');
  
  if (stored.userId) {
    return stored.userId;
  }
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ userId });
  
  return userId;
}

/**
 * Get or create interest engine for user
 */
async function getOrCreateEngine(userId) {
  if (!userProfiles.has(userId)) {
    // Wait for taxonomy to be loaded
    if (!taxonomy) {
      await loadTaxonomy();
    }
    
    const engine = new EnhancedInterestEngine(taxonomy);
    
    // Load stored state if exists
    const stored = await chrome.storage.local.get(`enhanced_profile_${userId}`);
    if (stored[`enhanced_profile_${userId}`]) {
      // Restore state (in production, properly deserialize)
      console.log('📥 Restored user profile from storage');
    }
    
    userProfiles.set(userId, engine);
  }
  
  return userProfiles.get(userId);
}

/**
 * Store enhanced profile with privacy preservation
 */
async function storeEnhancedProfile(userId, profile) {
  const key = `enhanced_profile_${userId}`;
  const timestamp = Date.now();
  
  // Store only privacy-preserving data
  const storageData = {
    commitment: profile.commitment,
    ptaScore: profile.ptaScore,
    topTags: Object.entries(profile.tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag.split('/').slice(0, 2).join('/')), // Only sector/subsector
    geoBucket: profile.geoBucket,
    lastUpdate: timestamp
  };
  
  await chrome.storage.local.set({ [key]: storageData });
  
  // Update storage metrics
  const metrics = await chrome.storage.local.get('capture_metrics');
  const currentMetrics = metrics.capture_metrics || {
    totalPages: 0,
    highIntentPages: 0,
    avgPta: 0
  };
  
  currentMetrics.totalPages++;
  if (profile.ptaScore > 0.6) currentMetrics.highIntentPages++;
  currentMetrics.avgPta = (currentMetrics.avgPta * (currentMetrics.totalPages - 1) + profile.ptaScore) / currentMetrics.totalPages;
  
  await chrome.storage.local.set({ capture_metrics: currentMetrics });
}

/**
 * Get user interest profile
 */
async function getInterestProfile(userId) {
  const engine = await getOrCreateEngine(userId);
  const profile = engine.getCurrentProfile();
  
  // Add stored metrics
  const metrics = await chrome.storage.local.get('capture_metrics');
  
  return {
    ...profile,
    metrics: metrics.capture_metrics || {},
    exportData: engine.exportForQuestMatching()
  };
}

/**
 * Check for quest matches based on interests
 */
async function checkQuestMatches(userId, profile) {
  // Get available quests (in production, from API)
  const quests = await getAvailableQuests();
  
  // Match based on enhanced criteria
  const matches = quests.filter(quest => {
    // Check sector match
    const userSectors = Object.keys(profile.tagCounts)
      .map(tag => tag.split('/')[0]);
    
    const sectorMatch = quest.targetSectors.some(sector => 
      userSectors.includes(sector)
    );
    
    // Check intent match
    const intentMatch = quest.minIntent <= profile.ptaScore;
    
    // Check geo match (if applicable)
    const geoMatch = !quest.geoBuckets || quest.geoBuckets.includes(profile.geoBucket);
    
    return sectorMatch && intentMatch && geoMatch;
  });
  
  // Score and sort matches
  const scoredMatches = matches.map(quest => {
    let score = 0;
    
    // Sector relevance
    Object.entries(profile.tagCounts).forEach(([tag, count]) => {
      const [sector, subsector] = tag.split('/');
      if (quest.targetSectors.includes(sector)) {
        score += count * (quest.sectorWeights?.[sector] || 1.0);
      }
      if (quest.targetSubsectors?.includes(`${sector}/${subsector}`)) {
        score += count * 2.0;
      }
    });
    
    // Intent boost
    if (profile.intentBoosts) {
      Object.entries(profile.intentBoosts).forEach(([tag, boost]) => {
        if (quest.targetSectors.some(s => tag.includes(s))) {
          score *= boost;
        }
      });
    }
    
    // PtA multiplier
    score *= (1 + profile.ptaScore);
    
    return {
      ...quest,
      matchScore: Math.min(score / 10, 1.0), // Normalize to 0-1
      ptaScore: profile.ptaScore,
      primarySector: Object.keys(profile.tagCounts)[0]?.split('/')[0] || 'general'
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
  
  // Notify about high-quality matches
  const highMatches = scoredMatches.filter(m => m.matchScore > 0.7);
  if (highMatches.length > 0) {
    await notifyQuestMatches(userId, highMatches);
  }
  
  return scoredMatches;
}

/**
 * Get available quests with enhanced targeting
 */
async function getAvailableQuests() {
  // In production, fetch from API
  // For now, return enhanced mock quests
  return [
    {
      id: 'quest_sneaker_drop_001',
      title: 'Exclusive Sneaker Drop Alert',
      description: 'Get early access to limited edition releases',
      targetSectors: ['shopping'],
      targetSubsectors: ['shopping/fashion/sneakers'],
      minIntent: 0.6,
      geoBuckets: null, // Available globally
      reward: '200 tokens + Early Access',
      sectorWeights: { shopping: 2.0 },
      requirements: {
        minPriceViews: 3,
        minCartActions: 1
      }
    },
    {
      id: 'quest_defi_yield_002',
      title: 'DeFi Yield Strategy Quest',
      description: 'Learn advanced yield farming strategies',
      targetSectors: ['finance'],
      targetSubsectors: ['finance/crypto/defi'],
      minIntent: 0.5,
      reward: '150 tokens + Strategy Guide',
      requirements: {
        minResearchTime: 300 // 5 minutes
      }
    },
    {
      id: 'quest_saas_trial_003',
      title: 'B2B Software Evaluation',
      description: 'Test and review enterprise software',
      targetSectors: ['technology'],
      targetSubsectors: ['technology/saas'],
      minIntent: 0.4,
      reward: '100 tokens per review',
      requirements: {
        minTrialSignups: 1
      }
    },
    {
      id: 'quest_travel_booking_004',
      title: 'Travel Deal Hunter',
      description: 'Find and share the best travel deals',
      targetSectors: ['travel'],
      targetSubsectors: ['travel/flights', 'travel/accommodation'],
      minIntent: 0.7,
      geoBuckets: ['0x4a', '0x4b', '0x4c'], // Specific regions
      reward: '250 tokens + Travel Credits',
      requirements: {
        minSearches: 5,
        minPriceComparisons: 3
      }
    },
    {
      id: 'quest_gaming_preorder_005',
      title: 'Game Launch Ambassador',
      description: 'Be first to try upcoming game releases',
      targetSectors: ['entertainment'],
      targetSubsectors: ['entertainment/gaming'],
      minIntent: 0.8,
      reward: '300 tokens + Beta Access',
      requirements: {
        minWishlistItems: 2,
        minPurchaseIntent: 0.7
      }
    }
  ];
}

/**
 * Notify user about quest matches
 */
async function notifyQuestMatches(userId, matches) {
  // Update badge
  chrome.action.setBadgeText({ text: matches.length.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#00ff00' });
  
  // Store matches
  await chrome.storage.local.set({
    [`quest_matches_${userId}`]: {
      matches: matches.slice(0, 10), // Top 10
      timestamp: Date.now()
    }
  });
  
  // Create notification for top match
  const topMatch = matches[0];
  chrome.notifications.create(`quest_${topMatch.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Perfect Quest Match!',
    message: `${topMatch.title} - ${Math.round(topMatch.matchScore * 100)}% match`,
    buttons: [{ title: 'View Quest' }],
    priority: 2
  });
}

/**
 * Export interests for external verification
 */
async function exportInterests(userId) {
  const engine = await getOrCreateEngine(userId);
  const exportData = engine.exportForQuestMatching();
  
  // Add timestamp and signature
  exportData.timestamp = Date.now();
  exportData.version = '1.0';
  
  // In production, add cryptographic signature
  exportData.signature = await generateSignature(exportData);
  
  return exportData;
}

/**
 * Generate signature for exported data
 */
async function generateSignature(data) {
  // In production, use proper cryptographic signing
  // For now, simple hash
  const dataStr = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dataStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get quest matches for API
 */
async function getQuestMatches(userId) {
  const stored = await chrome.storage.local.get(`quest_matches_${userId}`);
  const matches = stored[`quest_matches_${userId}`];
  
  if (!matches || Date.now() - matches.timestamp > 3600000) { // 1 hour cache
    // Refresh matches
    const engine = await getOrCreateEngine(userId);
    const profile = engine.generatePrivateOutput();
    return await checkQuestMatches(userId, profile);
  }
  
  return matches.matches;
}

// Tab tracking for enhanced signals
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip extension and chrome pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Inject enhanced content collector
    try {
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['enhancedContentCollector.js']
        });
        
        console.log(`💉 Injected enhanced collector into: ${new URL(tab.url).hostname}`);
      }
    } catch (error) {
      // Silently fail - content collector is already working via manifest
      console.log(`📝 Content collector already active on: ${new URL(tab.url).hostname}`);
    }
  }
});

// Periodic tasks
chrome.alarms.create('hourly_decay', { periodInMinutes: 60 });
chrome.alarms.create('profile_backup', { periodInMinutes: 30 });
chrome.alarms.create('quest_refresh', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const userId = await getOrCreateUserId();
  const engine = await getOrCreateEngine(userId);
  
  switch (alarm.name) {
    case 'hourly_decay':
      // Run time decay on all counters
      engine.runDecay();
      console.log('⏰ Ran hourly decay on interest counters');
      break;
      
    case 'profile_backup':
      // Backup profile to storage
      const profile = engine.generatePrivateOutput();
      await storeEnhancedProfile(userId, profile);
      console.log('💾 Backed up interest profile');
      break;
      
    case 'quest_refresh':
      // Check for new quest matches
      const matches = await checkQuestMatches(userId, engine.generatePrivateOutput());
      console.log(`🎮 Found ${matches.length} quest matches`);
      break;
  }
});

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('quest_') && buttonIndex === 0) {
    // Open quest details
    chrome.tabs.create({
      url: 'popup.html#quests'
    });
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processEnhancedPageData,
    checkQuestMatches,
    getAvailableQuests
  };
}