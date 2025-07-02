// content.js - Production-Ready with ALL Critical Bug Fixes Applied
// **CRITICAL FIXES**:
// - Fixed visibility tracking bug (sessionState.isVisible properly set)
// - Added MutationObserver disconnect after engagement
// - Fixed path to match manifest.json
// - All other performance and gaming resistance fixes

console.log('🔄 Content script loaded on:', window.location.href);

// Configuration constants
const CONFIG = {
  MIN_DWELL_TIME: 10000, // 10 seconds in milliseconds
  MIN_SCROLL_PERCENTAGE: 50, // 50% scroll depth required
  MIN_SCROLL_PIXELS: 200, // Minimum pixels scrolled for short pages
  DOMAIN_COOLDOWN: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
  CONTENT_STABILITY_DELAY: 2000, // 2 seconds to wait for dynamic content
  ENGAGEMENT_SAMPLE_RATE: 500, // Sample engagement every 500ms
  SCROLL_VELOCITY_MIN: 300, // Minimum ms between scroll events to count
  MIN_CONTENT_LENGTH: 400, // Mirror background.js check before sending message
  MUTATION_THROTTLE: 1000, // Throttle mutations to prevent CPU burn
  MUTATION_IDLE_TIMEOUT: 2000, // Use requestIdleCallback for better performance
  MAX_CONTENT_CHANGES: 3, // **NEW**: Disconnect observer after this many changes
};

// Session state with enhanced tracking
let sessionState = {
  startTime: Date.now(),
  pausedTime: 0,
  pausedAt: null,
  maxScrollDepth: 0,
  maxScrollPixels: 0,
  isVisible: true, // **CRITICAL**: Properly tracked visibility state
  dwellTime: 0,
  pageAnalyzed: false,
  engagementMet: false,
  rewardClaimed: false,
  domain: extractRootDomain(window.location.href),
  pathBucket: extractPathBucket(window.location.href),
  url: window.location.href,
  lastScrollTime: 0,
  contentChangeCount: 0,
};

// Tracking variables
let visibilityStartTime = Date.now();
let totalDwellTime = 0;
let engagementInterval;
let contentAnalysisTimeout;
let mutationObserver;
let contentHash = '';
let mutationPending = false;
let lastMutationTime = 0;
let observerDisconnected = false; // **NEW**: Track observer state

/**
 * Extract root domain for better cooldown management
 */
function extractRootDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    return parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Extract path bucket for sub-path differentiation
 */
function extractPathBucket(url) {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(s => s.length > 0);
    return segments.length > 0 ? segments[0] : 'root';
  } catch {
    return 'root';
  }
}

/**
 * Generate consistent cooldown key matching background.js
 */
function getCooldownKey() {
  return `domain_cooldown_${sessionState.domain}_${sessionState.pathBucket}`;
}

/**
 * Extract and hash page content for change detection
 */
function extractPageContent() {
  try {
    const title = document.title || '';
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
    
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content',
      '.post',
      '.article',
      'body'
    ];
    
    let mainContent = '';
    let contentElement = null;
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.innerText || '';
        if (text.length > 100) {
          mainContent = text.slice(0, 1500);
          contentElement = element;
          break;
        }
      }
    }
    
    const newContentHash = simpleHash(title + mainContent);
    const contentChanged = contentHash && contentHash !== newContentHash;
    contentHash = newContentHash;
    
    return {
      url: window.location.href,
      title: title.slice(0, 200),
      content: mainContent,
      metaDescription: metaDesc.slice(0, 300),
      language: document.documentElement.lang || 'en',
      timestamp: Date.now(),
      domain: sessionState.domain,
      pathBucket: sessionState.pathBucket,
      contentLength: mainContent.length,
      contentElement: contentElement,
      contentChanged: contentChanged,
      contentHash: newContentHash
    };
  } catch (error) {
    console.error('❌ Error extracting page content:', error);
    return null;
  }
}

/**
 * Simple hash function for content change detection
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Enhanced scroll depth calculation with pixel-based validation
 */
function getScrollMetrics() {
  const windowHeight = window.innerHeight;
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollableHeight = documentHeight - windowHeight;
  
  let scrollPercentage = 0;
  if (scrollableHeight > 0) {
    scrollPercentage = Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
  } else {
    scrollPercentage = 100;
  }
  
  return {
    percentage: scrollPercentage,
    pixels: scrollTop,
    totalHeight: documentHeight,
    scrollableHeight: scrollableHeight
  };
}

/**
 * **CRITICAL FIX**: Enhanced engagement metrics with proper visibility check
 */
function updateEngagementMetrics() {
  // **CRITICAL FIX**: Early return if tab is hidden or paused
  if (!sessionState.isVisible || sessionState.pausedAt) {
    return;
  }
  
  // Update scroll metrics with velocity check
  const now = performance.now();
  const scrollMetrics = getScrollMetrics();
  
  if (now - sessionState.lastScrollTime > CONFIG.SCROLL_VELOCITY_MIN) {
    sessionState.maxScrollDepth = Math.max(sessionState.maxScrollDepth, scrollMetrics.percentage);
    sessionState.maxScrollPixels = Math.max(sessionState.maxScrollPixels, scrollMetrics.pixels);
    sessionState.lastScrollTime = now;
  }
  
  // Update dwell time (accounting for paused time)
  const currentTime = Date.now();
  sessionState.dwellTime = currentTime - sessionState.startTime - sessionState.pausedTime;
  
  // Enhanced engagement criteria
  const dwellMet = sessionState.dwellTime >= CONFIG.MIN_DWELL_TIME;
  const scrollDepthMet = sessionState.maxScrollDepth >= CONFIG.MIN_SCROLL_PERCENTAGE;
  const scrollPixelsMet = sessionState.maxScrollPixels >= CONFIG.MIN_SCROLL_PIXELS;
  const scrollMet = scrollDepthMet || scrollPixelsMet;
  
  if (dwellMet && scrollMet && !sessionState.engagementMet) {
    sessionState.engagementMet = true;
    console.log('✅ Enhanced engagement criteria met!', {
      dwellTime: Math.round(sessionState.dwellTime / 1000),
      scrollDepth: Math.round(sessionState.maxScrollDepth),
      scrollPixels: sessionState.maxScrollPixels,
      domain: sessionState.domain,
      pathBucket: sessionState.pathBucket
    });
    
    // **NEW**: Disconnect observer after successful engagement to save CPU
    disconnectMutationObserver();
    
    checkAndTriggerReward();
  }
  
  updateProgressBadge();
}

/**
 * **CRITICAL FIX**: Enhanced visibility change handling with proper isVisible tracking
 */
function handleVisibilityChange() {
  const now = Date.now();
  
  // **CRITICAL FIX**: Properly set sessionState.isVisible
  sessionState.isVisible = (document.visibilityState === 'visible');
  
  if (document.hidden || document.visibilityState === 'hidden') {
    if (!sessionState.pausedAt) {
      sessionState.pausedAt = now;
      console.log('⏸️ Page hidden, pausing engagement tracking');
    }
  } else if (document.visibilityState === 'visible') {
    if (sessionState.pausedAt) {
      const pausedDuration = now - sessionState.pausedAt;
      sessionState.pausedTime += pausedDuration;
      sessionState.pausedAt = null;
      console.log('▶️ Page visible, resuming engagement tracking', {
        pausedDuration: pausedDuration,
        totalPausedTime: sessionState.pausedTime
      });
    }
  }
}

/**
 * Enhanced progress badge with better visual feedback
 */
function updateProgressBadge() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const dwellProgress = Math.min(100, (sessionState.dwellTime / CONFIG.MIN_DWELL_TIME) * 100);
    const scrollProgress = Math.min(100, sessionState.maxScrollDepth);
    const overallProgress = Math.min(100, Math.max(dwellProgress, scrollProgress));
    
    if (sessionState.engagementMet) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        progress: 100,
        status: 'completed'
      }).catch(() => {});
    } else if (overallProgress > 0) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        progress: Math.round(overallProgress),
        status: 'tracking'
      }).catch(() => {});
    }
  }
}

/**
 * Enhanced cooldown check with consistent key format
 */
async function checkAndTriggerReward() {
  if (sessionState.rewardClaimed) return;
  
  try {
    const cooldownKey = getCooldownKey();
    const lastReward = await getStorageData(cooldownKey);
    const now = Date.now();
    
    if (lastReward && (now - lastReward) < CONFIG.DOMAIN_COOLDOWN) {
      const remainingTime = Math.round((CONFIG.DOMAIN_COOLDOWN - (now - lastReward)) / 1000 / 60);
      console.log(`⏰ Domain+path still in cooldown period (${remainingTime}m remaining)`);
      return;
    }
    
    sessionState.rewardClaimed = true;
    await setStorageData(cooldownKey, now);
    
    const engagementData = {
      domain: sessionState.domain,
      pathBucket: sessionState.pathBucket,
      url: sessionState.url,
      dwellTime: sessionState.dwellTime,
      scrollDepth: sessionState.maxScrollDepth,
      scrollPixels: sessionState.maxScrollPixels,
      pausedTime: sessionState.pausedTime,
      contentChangeCount: sessionState.contentChangeCount,
      timestamp: now,
      sessionId: `${sessionState.domain}_${sessionState.pathBucket}_${sessionState.startTime}`,
      engagementQuality: calculateEngagementQuality()
    };
    
    console.log('🎯 Sending enhanced engagement data for reward processing:', engagementData);
    
    chrome.runtime.sendMessage({
      type: 'PROCESS_ENGAGEMENT_REWARD',
      engagementData: engagementData,
      pageContent: extractPageContent()
    }).catch(error => {
      console.error('❌ Failed to send engagement data:', error);
    });
    
  } catch (error) {
    console.error('❌ Error in reward processing:', error);
  }
}

/**
 * Calculate engagement quality score
 */
function calculateEngagementQuality() {
  const dwellScore = Math.min(1, sessionState.dwellTime / (CONFIG.MIN_DWELL_TIME * 2));
  const scrollScore = Math.min(1, sessionState.maxScrollDepth / 100);
  const consistencyScore = 1 - Math.min(0.5, sessionState.pausedTime / sessionState.dwellTime);
  
  return Math.round((dwellScore + scrollScore + consistencyScore) / 3 * 100);
}

/**
 * Enhanced page content analysis with content length gating
 */
function analyzePageContent(force = false) {
  const pageContent = extractPageContent();
  
  // **CRITICAL FIX**: Mirror background.js check to prevent unnecessary messages
  if (!pageContent || pageContent.contentLength < CONFIG.MIN_CONTENT_LENGTH) {
    console.log('📄 Insufficient content for analysis', {
      contentLength: pageContent?.contentLength || 0,
      required: CONFIG.MIN_CONTENT_LENGTH
    });
    return;
  }
  
  if (sessionState.pageAnalyzed && !force && !pageContent.contentChanged) {
    console.log('📄 Content unchanged, skipping re-analysis');
    return;
  }
  
  sessionState.pageAnalyzed = true;
  
  console.log('🔍 Analyzing page content (auto):', {
    title: pageContent.title,
    contentLength: pageContent.contentLength,
    domain: pageContent.domain,
    pathBucket: pageContent.pathBucket,
    contentChanged: pageContent.contentChanged
  });
  
  chrome.runtime.sendMessage({
    type: 'AUTO_CLASSIFY_PAGE',
    pageContent: pageContent,
    isReanalysis: sessionState.contentChangeCount > 0
  }).catch(error => {
    console.error('❌ Failed to send page content for classification:', error);
  });
}

/**
 * **CRITICAL FIX**: Disconnect mutation observer to prevent CPU burn
 */
function disconnectMutationObserver() {
  if (mutationObserver && !observerDisconnected) {
    mutationObserver.disconnect();
    observerDisconnected = true;
    console.log('🔌 Mutation observer disconnected to save CPU');
  }
}

/**
 * **CRITICAL FIX**: Throttled SPA support with automatic disconnect
 */
function initializeSPASupport() {
  function handleMutationsThrottled(mutations) {
    if (mutationPending || observerDisconnected) return;
    
    const now = Date.now();
    if (now - lastMutationTime < CONFIG.MUTATION_THROTTLE) return;
    
    mutationPending = true;
    lastMutationTime = now;
    
    const scheduleAnalysis = () => {
      let significantChange = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 3 && 
            Array.from(mutation.addedNodes).some(node => 
              node.nodeType === Node.ELEMENT_NODE && 
              (node.tagName === 'ARTICLE' || 
               node.tagName === 'MAIN' || 
               node.matches?.('.post, .article, .content, [role="main"]'))
            )) {
          significantChange = true;
          break;
        }
      }
      
      if (significantChange) {
        sessionState.contentChangeCount++;
        console.log('🔄 SPA content change detected', { 
          changeCount: sessionState.contentChangeCount,
          maxChanges: CONFIG.MAX_CONTENT_CHANGES
        });
        
        // **NEW**: Disconnect observer after too many changes to prevent CPU burn
        if (sessionState.contentChangeCount >= CONFIG.MAX_CONTENT_CHANGES) {
          console.log('🛑 Max content changes reached, disconnecting observer');
          disconnectMutationObserver();
          mutationPending = false;
          return;
        }
        
        setTimeout(() => {
          analyzePageContent(true);
          // **CRITICAL FIX**: Disconnect observer after too many changes to prevent CPU burn
          if (sessionState.contentChangeCount >= CONFIG.MAX_CONTENT_CHANGES) {
            console.log('🛑 Max content changes reached, disconnecting observer');
            disconnectMutationObserver();
          }
          mutationPending = false;
        }, CONFIG.MUTATION_THROTTLE);
      } else {
        mutationPending = false;
      }
    };
    
    // Use requestIdleCallback when available, fallback to setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(scheduleAnalysis, { timeout: CONFIG.MUTATION_IDLE_TIMEOUT });
    } else {
      setTimeout(scheduleAnalysis, 100);
    }
  }
  
  mutationObserver = new MutationObserver(handleMutationsThrottled);
  
  // Observe with restrictive settings for performance
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
  
  console.log('👀 Throttled SPA content monitoring initialized');
}

/**
 * Enhanced scroll event handler with debouncing
 */
function initializeScrollTracking() {
  let scrollTimeout;
  
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateEngagementMetrics();
    }, 100);
  }, { passive: true });
  
  console.log('📜 Enhanced scroll tracking initialized');
}

/**
 * Initialize all tracking systems
 */
function initializeEngagementTracking() {
  initializeScrollTracking();
  initializeSPASupport();
  
  // **CRITICAL FIX**: Proper visibility handling
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  engagementInterval = setInterval(updateEngagementMetrics, CONFIG.ENGAGEMENT_SAMPLE_RATE);
  
  window.addEventListener('beforeunload', () => {
    clearInterval(engagementInterval);
    disconnectMutationObserver();
    
    console.log('📊 Final enhanced engagement metrics:', {
      dwellTime: Math.round(sessionState.dwellTime / 1000),
      scrollDepth: Math.round(sessionState.maxScrollDepth),
      scrollPixels: sessionState.maxScrollPixels,
      pausedTime: Math.round(sessionState.pausedTime / 1000),
      engagementMet: sessionState.engagementMet,
      engagementQuality: calculateEngagementQuality(),
      contentChanges: sessionState.contentChangeCount
    });
  });
  
  console.log('📈 Enhanced engagement tracking initialized');
}

/**
 * Storage helper functions
 */
async function getStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

async function setStorageData(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

/**
 * Enhanced initialization
 */
function initialize() {
  const skipDomains = ['chrome-extension://', 'moz-extension://', 'chrome://', 'about:', 'file://'];
  if (skipDomains.some(domain => window.location.href.startsWith(domain))) {
    console.log('⏭️ Skipping tracking on system page');
    return;
  }
  
  if (document.body && document.body.innerText && document.body.innerText.length < 100) {
    console.log('⏭️ Skipping tracking on minimal content page');
    return;
  }
  
  console.log('🚀 Initializing enhanced automatic engagement tracking', {
    domain: sessionState.domain,
    pathBucket: sessionState.pathBucket,
    url: sessionState.url
  });
  
  initializeEngagementTracking();
  
  contentAnalysisTimeout = setTimeout(() => {
    analyzePageContent();
  }, CONFIG.CONTENT_STABILITY_DELAY);
}

// Enhanced initialization handling
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  setTimeout(initialize, 100);
}

// Enhanced runtime message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ENGAGEMENT_STATUS':
      sendResponse({
        dwellTime: sessionState.dwellTime,
        scrollDepth: sessionState.maxScrollDepth,
        scrollPixels: sessionState.maxScrollPixels,
        pausedTime: sessionState.pausedTime,
        engagementMet: sessionState.engagementMet,
        rewardClaimed: sessionState.rewardClaimed,
        domain: sessionState.domain,
        pathBucket: sessionState.pathBucket,
        contentChanges: sessionState.contentChangeCount,
        engagementQuality: calculateEngagementQuality(),
        isVisible: sessionState.isVisible,
        observerDisconnected: observerDisconnected
      });
      break;
      
    case 'REWARD_PROCESSED':
      console.log('🎉 Reward processed successfully:', message.data);
      showInPageNotification(`Reward earned! +${message.data.sessionRecord?.rewardAmount || 1} ADR tokens`);
      break;
      
    case 'SHOW_REWARD_NOTIFICATION':
      showInPageNotification(`+${message.data.amount} ADR earned for quality engagement!`);
      break;
      
    case 'FORCE_REANALYZE':
      analyzePageContent(true);
      sendResponse({ success: true });
      break;
      
    default:
      break;
  }
});

/**
 * **CRITICAL FIX**: Fallback in-page notification with deduplication
 */
function showInPageNotification(message) {
  // **CRITICAL FIX**: Prevent duplicate toasts
  const existingToast = document.getElementById('earnx-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'earnx-toast'; // **FIX**: Add ID for deduplication
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 4000);
}

console.log('✅ Patched content script fully loaded and ready');