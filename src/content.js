// content.js - Unified page data collection and interest capture

(function() {
  'use strict';
  
  // Session tracking
  const sessionId = `${window.location.hostname}_${Date.now()}`;
  let interactions = {
    startTime: Date.now(),
    timeOnPage: 0,
    scrollDepth: 0,
    clickCount: 0,
    hoverTime: 0,
    formFields: 0,
    mediaPlays: 0
  };
  
  // Data collection state
  let pageDataSent = false;
  let lastDataCapture = 0;
  const CAPTURE_INTERVAL = 10000; // 10 seconds
  
  // Collect comprehensive page data for both classification and interest capture
  function collectPageData() {
    const data = {
      url: window.location.href,
      title: document.title,
      content: extractMainContent(),
      meta: extractMetadata(),
      // Add interaction metrics for interest weighting
      timeOnPage: (Date.now() - interactions.startTime) / 1000,
      scrollDepth: interactions.scrollDepth,
      interactions: interactions.clickCount + interactions.formFields + interactions.mediaPlays
    };
    
    return data;
  }
  
  // Extract main content
  function extractMainContent() {
    // Try to find main content areas
    const contentSelectors = [
      'main', 'article', '[role="main"]', 
      '#content', '.content', '#main', '.main'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return cleanText(element.textContent).substring(0, 1000);
      }
    }
    
    // Fallback to body text
    const bodyText = document.body.textContent || '';
    return cleanText(bodyText).substring(0, 1000);
  }
  
  // Extract metadata
  function extractMetadata() {
    const meta = {
      description: '',
      keywords: '',
      author: '',
      type: ''
    };
    
    // Get meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (name && content) {
        if (name.includes('description')) meta.description = content;
        if (name.includes('keywords')) meta.keywords = content;
        if (name.includes('author')) meta.author = content;
        if (name === 'og:type') meta.type = content;
      }
    });
    
    return meta;
  }
  
  // Clean text
  function cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }
  
  // Track scroll depth with interest update trigger
  function trackScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.pageYOffset;
    const depth = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
    interactions.scrollDepth = Math.max(interactions.scrollDepth, depth);
    
    // Trigger interest update on significant scroll
    if (depth > 25 && !pageDataSent) {
      updateInterests();
    }
  }
  
  // Track clicks with interest signals
  function trackClick(event) {
    interactions.clickCount++;
    
    // Track form interactions
    if (event.target.matches('input, textarea, select')) {
      interactions.formFields++;
    }
    
    // Trigger interest update on meaningful interaction
    if (interactions.clickCount % 3 === 0) {
      updateInterests();
    }
  }
  
  // Track hover time
  let hoverStart = null;
  function trackHoverStart() {
    hoverStart = Date.now();
  }
  
  function trackHoverEnd() {
    if (hoverStart) {
      interactions.hoverTime += (Date.now() - hoverStart) / 1000;
      hoverStart = null;
    }
  }
  
  // Track media plays
  function trackMediaPlay() {
    interactions.mediaPlays++;
  }
  
  // Send both classification and interest capture data
  async function classifyPageAndCaptureInterests() {
    if (pageDataSent) return; // Prevent duplicate sends
    
    const pageData = collectPageData();
    
    try {
      // Send for pattern-based classification
      const classificationResponse = await chrome.runtime.sendMessage({
        type: 'CLASSIFY_CONTENT',
        data: pageData
      });
      
      if (classificationResponse.success) {
        console.log('Page classified:', classificationResponse.data);
        sessionStorage.setItem('classification', JSON.stringify(classificationResponse.data));
      }
      
      // Send for interest capture (passive collection)
      const interestResponse = await chrome.runtime.sendMessage({
        type: 'PAGE_DATA',
        data: pageData
      });
      
      if (interestResponse.success) {
        console.log('Interests captured:', interestResponse.interests);
        sessionStorage.setItem('interests', JSON.stringify(interestResponse.interests));
      }
      
      pageDataSent = true;
      
    } catch (error) {
      console.error('Page analysis failed:', error);
    }
  }
  
  // Periodic interest updates (for long page visits)
  async function updateInterests() {
    const now = Date.now();
    if (now - lastDataCapture < CAPTURE_INTERVAL) return;
    
    const pageData = collectPageData();
    
    try {
      await chrome.runtime.sendMessage({
        type: 'PAGE_DATA',
        data: {
          ...pageData,
          isUpdate: true // Flag as periodic update
        }
      });
      
      lastDataCapture = now;
      console.log('Interest data updated');
      
    } catch (error) {
      console.error('Interest update failed:', error);
    }
  }
  
  // Send engagement data
  async function sendEngagementData() {
    interactions.timeOnPage = (Date.now() - interactions.startTime) / 1000;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRACK_ENGAGEMENT',
        data: {
          sessionId,
          url: window.location.href,
          interactions
        }
      });
      
      if (response.success) {
        console.log('Engagement tracked:', response.data);
      }
    } catch (error) {
      console.error('Engagement tracking failed:', error);
    }
  }
  
  // Initialize unified tracking system
  function initialize() {
    // Add event listeners
    window.addEventListener('scroll', trackScroll, { passive: true });
    document.addEventListener('click', trackClick);
    document.addEventListener('mouseover', trackHoverStart);
    document.addEventListener('mouseout', trackHoverEnd);
    
    // Track media events
    document.querySelectorAll('video, audio').forEach(media => {
      media.addEventListener('play', trackMediaPlay);
    });
    
    // Initial classification and interest capture after load
    if (document.readyState === 'complete') {
      setTimeout(classifyPageAndCaptureInterests, 1000); // Delay for content loading
    } else {
      window.addEventListener('load', () => {
        setTimeout(classifyPageAndCaptureInterests, 1000);
      });
    }
    
    // Periodic interest updates for long visits
    setInterval(updateInterests, CAPTURE_INTERVAL);
    
    // Send engagement data periodically (existing functionality)
    setInterval(sendEngagementData, 30000); // Every 30 seconds
    
    // Send final data on unload
    window.addEventListener('beforeunload', () => {
      sendEngagementData();
      updateInterests(); // Final interest capture
    });
    
    // Page visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        updateInterests(); // Capture when leaving page
      }
    });
  }
  
  // Start tracking
  initialize();
  
  // Expose unified API for popup
  window.extensionAPI = {
    getClassification: () => {
      const stored = sessionStorage.getItem('classification');
      return stored ? JSON.parse(stored) : null;
    },
    getInterests: () => {
      const stored = sessionStorage.getItem('interests');
      return stored ? JSON.parse(stored) : null;
    },
    getEngagement: () => interactions,
    getSessionId: () => sessionId,
    // Combined data for popup
    getPageAnalysis: () => {
      return {
        classification: window.extensionAPI.getClassification(),
        interests: window.extensionAPI.getInterests(),
        engagement: interactions,
        sessionId: sessionId
      };
    }
  };
})();
