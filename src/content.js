// content.js - Collects page data for classification

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
  
  // Collect page content
  function collectPageData() {
    const data = {
      url: window.location.href,
      title: document.title,
      content: extractMainContent(),
      meta: extractMetadata()
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
  
  // Track scroll depth
  function trackScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.pageYOffset;
    const depth = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
    interactions.scrollDepth = Math.max(interactions.scrollDepth, depth);
  }
  
  // Track clicks
  function trackClick(event) {
    interactions.clickCount++;
    
    // Track form interactions
    if (event.target.matches('input, textarea, select')) {
      interactions.formFields++;
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
  
  // Send classification request
  async function classifyPage() {
    const pageData = collectPageData();
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLASSIFY_CONTENT',
        data: pageData
      });
      
      if (response.success) {
        console.log('Page classified:', response.data);
        // Store classification for popup
        sessionStorage.setItem('classification', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Classification failed:', error);
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
  
  // Initialize tracking
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
    
    // Classify page after load
    if (document.readyState === 'complete') {
      classifyPage();
    } else {
      window.addEventListener('load', classifyPage);
    }
    
    // Send engagement data periodically
    setInterval(sendEngagementData, 30000); // Every 30 seconds
    
    // Send final data on unload
    window.addEventListener('beforeunload', sendEngagementData);
  }
  
  // Start tracking
  initialize();
  
  // Expose API for popup
  window.extensionAPI = {
    getClassification: () => {
      const stored = sessionStorage.getItem('classification');
      return stored ? JSON.parse(stored) : null;
    },
    getEngagement: () => interactions,
    getSessionId: () => sessionId
  };
})();
