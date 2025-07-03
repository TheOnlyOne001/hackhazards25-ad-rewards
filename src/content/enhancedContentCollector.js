// enhancedContentCollector.js - Advanced DOM signal extraction

(function() {
  'use strict';

  class EnhancedContentCollector {
    constructor() {
      this.sessionId = `${window.location.hostname}_${Date.now()}`;
      this.pageStartTime = Date.now();
      this.interactions = {
        clicks: 0,
        formInteractions: 0,
        scrollEvents: 0,
        hoverTime: 0,
        cartActions: 0,
        priceViews: 0
      };
      
      this.observedElements = {
        prices: new Set(),
        cartButtons: new Set(),
        checkoutElements: new Set(),
        forms: new Set()
      };
      
      this.maxScrollDepth = 0;
      this.lastActivityTime = Date.now();
      this.intentSignals = [];
      
      // Initialize observers
      this.initializeObservers();
    }

    /**
     * Initialize all observers and listeners
     */
    initializeObservers() {
      // Mutation observer for dynamic content
      this.mutationObserver = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-price', 'data-product-id']
      });
      
      // Intersection observer for visibility tracking
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.handleIntersections(entries);
      }, {
        threshold: [0.25, 0.5, 0.75, 1.0]
      });
      
      // Performance observer for navigation timing
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          this.handlePerformanceEntries(list.getEntries());
        });
        this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
      }
      
      // Add event listeners
      this.attachEventListeners();
      
      // Initial scan
      this.scanPage();
    }

    /**
     * Scan page for intent signals
     */
    scanPage() {
      // Price detection
      this.detectPrices();
      
      // Cart/checkout detection
      this.detectCartElements();
      
      // Form detection
      this.detectForms();
      
      // Product schema detection
      this.detectStructuredData();
      
      // Open Graph metadata
      this.extractOpenGraphData();
    }

    /**
     * Detect price elements with multiple patterns
     */
    detectPrices() {
      // Common price selectors
      const priceSelectors = [
        '[class*="price"]',
        '[data-price]',
        '[itemprop="price"]',
        '.amount',
        '.cost',
        'span:contains("$")',
        'span:contains("€")',
        'span:contains("£")'
      ];
      
      // Price regex patterns
      const pricePatterns = [
        /\$\s*\d+(?:[.,]\d{2})?/g,
        /€\s*\d+(?:[.,]\d{2})?/g,
        /£\s*\d+(?:[.,]\d{2})?/g,
        /\d+(?:[.,]\d{2})?\s*(?:USD|EUR|GBP)/g
      ];
      
      // Check selectors
      priceSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent || '';
            pricePatterns.forEach(pattern => {
              if (pattern.test(text)) {
                this.observedElements.prices.add(el);
                this.intersectionObserver.observe(el);
                this.interactions.priceViews++;
              }
            });
          });
        } catch (e) {
          // Invalid selector, skip
        }
      });
      
      // Also scan all text nodes for prices
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent || '';
            return pricePatterns.some(p => p.test(text)) 
              ? NodeFilter.FILTER_ACCEPT 
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.parentElement && !this.observedElements.prices.has(node.parentElement)) {
          this.observedElements.prices.add(node.parentElement);
          this.interactions.priceViews++;
        }
      }
    }

    /**
     * Detect cart and checkout elements
     */
    detectCartElements() {
      const cartSelectors = [
        // Generic
        '[class*="cart"]',
        '[class*="basket"]',
        '[class*="checkout"]',
        '[id*="cart"]',
        '[id*="checkout"]',
        'button[class*="add"]',
        'button[class*="buy"]',
        
        // E-commerce specific
        '.add-to-cart',
        '.add-to-bag',
        '.buy-now',
        '.checkout-button',
        '[data-action="add-to-cart"]',
        
        // Platform specific
        '.a-button-oneclick', // Amazon
        '.btn-add-to-cart',   // Shopify
        '.product-add-to-cart' // WooCommerce
      ];
      
      cartSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            this.observedElements.cartButtons.add(el);
            this.intersectionObserver.observe(el);
            
            // Add click tracking
            el.addEventListener('click', () => {
              this.interactions.cartActions++;
              this.intentSignals.push({
                type: 'cart_interaction',
                element: selector,
                timestamp: Date.now()
              });
            }, { once: true });
          });
        } catch (e) {
          // Invalid selector
        }
      });
    }

    /**
     * Detect form elements (especially payment/checkout forms)
     */
    detectForms() {
      const forms = document.querySelectorAll('form');
      const paymentInputs = document.querySelectorAll([
        'input[type="tel"][placeholder*="card"]',
        'input[name*="card"]',
        'input[name*="credit"]',
        'input[name*="payment"]',
        'input[placeholder*="CVV"]',
        'input[placeholder*="CVC"]',
        'input[autocomplete="cc-number"]'
      ].join(','));
      
      forms.forEach(form => {
        const isPaymentForm = 
          form.innerHTML.toLowerCase().includes('payment') ||
          form.innerHTML.toLowerCase().includes('billing') ||
          form.innerHTML.toLowerCase().includes('card number');
        
        if (isPaymentForm || paymentInputs.length > 0) {
          this.observedElements.forms.add(form);
          this.intentSignals.push({
            type: 'payment_form_detected',
            timestamp: Date.now()
          });
        }
      });
      
      // Track form interactions
      document.addEventListener('focus', (e) => {
        if (e.target.matches('input, textarea, select')) {
          this.interactions.formInteractions++;
          
          // Check if it's a high-intent field
          const fieldName = (e.target.name || '').toLowerCase();
          const placeholder = (e.target.placeholder || '').toLowerCase();
          
          if (fieldName.includes('email') || placeholder.includes('email')) {
            this.intentSignals.push({
              type: 'email_field_focus',
              timestamp: Date.now()
            });
          }
          
          if (fieldName.includes('card') || placeholder.includes('card')) {
            this.intentSignals.push({
              type: 'payment_field_focus',
              timestamp: Date.now()
            });
          }
        }
      }, true);
    }

    /**
     * Extract structured data (JSON-LD, microdata)
     */
    detectStructuredData() {
      // JSON-LD
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          
          // Product schema
          if (data['@type'] === 'Product' || data['@type'] === 'Offer') {
            this.intentSignals.push({
              type: 'product_schema',
              data: {
                name: data.name,
                price: data.offers?.price || data.price,
                currency: data.offers?.priceCurrency || data.priceCurrency,
                availability: data.offers?.availability
              },
              timestamp: Date.now()
            });
          }
          
          // BreadcrumbList (indicates category browsing)
          if (data['@type'] === 'BreadcrumbList') {
            this.intentSignals.push({
              type: 'breadcrumb_navigation',
              depth: data.itemListElement?.length || 0,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // Invalid JSON
        }
      });
      
      // Microdata
      const products = document.querySelectorAll('[itemtype*="schema.org/Product"]');
      products.forEach(product => {
        const name = product.querySelector('[itemprop="name"]')?.textContent;
        const price = product.querySelector('[itemprop="price"]')?.content || 
                     product.querySelector('[itemprop="price"]')?.textContent;
        
        if (name || price) {
          this.intentSignals.push({
            type: 'microdata_product',
            data: { name, price },
            timestamp: Date.now()
          });
        }
      });
    }

    /**
     * Extract Open Graph metadata
     */
    extractOpenGraphData() {
      const ogData = {};
      const metaTags = document.querySelectorAll('meta[property^="og:"], meta[property^="product:"]');
      
      metaTags.forEach(tag => {
        const property = tag.getAttribute('property');
        const content = tag.getAttribute('content');
        if (property && content) {
          ogData[property] = content;
        }
      });
      
      // Check for product-related OG tags
      if (ogData['og:type'] === 'product' || ogData['product:price:amount']) {
        this.intentSignals.push({
          type: 'og_product_data',
          data: {
            type: ogData['og:type'],
            title: ogData['og:title'],
            price: ogData['product:price:amount'],
            currency: ogData['product:price:currency']
          },
          timestamp: Date.now()
        });
      }
      
      return ogData;
    }

    /**
     * Handle mutations for dynamic content
     */
    handleMutations(mutations) {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Re-scan for prices and cart elements in new content
              this.scanElement(node);
            }
          });
        }
      });
    }

    /**
     * Scan individual element for intent signals
     */
    scanElement(element) {
      const text = element.textContent || '';
      
      // Check for price
      if (/\$\d+/.test(text) && !this.observedElements.prices.has(element)) {
        this.observedElements.prices.add(element);
        this.intersectionObserver.observe(element);
      }
      
      // Check for cart/checkout keywords
      const cartKeywords = ['add to cart', 'buy now', 'checkout', 'add to bag'];
      if (cartKeywords.some(kw => text.toLowerCase().includes(kw))) {
        this.observedElements.cartButtons.add(element);
      }
    }

    /**
     * Handle element visibility
     */
    handleIntersections(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Element is at least 50% visible
          if (this.observedElements.prices.has(entry.target)) {
            this.intentSignals.push({
              type: 'price_viewed',
              text: entry.target.textContent,
              timestamp: Date.now()
            });
          }
          
          if (this.observedElements.cartButtons.has(entry.target)) {
            this.intentSignals.push({
              type: 'cart_button_viewed',
              text: entry.target.textContent,
              timestamp: Date.now()
            });
          }
        }
      });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Scroll tracking
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          this.updateScrollDepth();
        }, 100);
      }, { passive: true });
      
      // Click tracking
      document.addEventListener('click', (e) => {
        this.interactions.clicks++;
        this.lastActivityTime = Date.now();
        
        // Track specific click types
        const target = e.target;
        const text = target.textContent || '';
        
        if (this.observedElements.cartButtons.has(target)) {
          this.interactions.cartActions++;
        }
        
        // Track link clicks
        if (target.tagName === 'A') {
          const href = target.href || '';
          if (href.includes('/cart') || href.includes('/checkout')) {
            this.intentSignals.push({
              type: 'checkout_navigation',
              url: href,
              timestamp: Date.now()
            });
          }
        }
      });
      
      // Page visibility
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.sendData();
        }
      });
      
      // Before unload
      window.addEventListener('beforeunload', () => {
        this.sendData();
      });
    }

    /**
     * Update scroll depth
     */
    updateScrollDepth() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.pageYOffset;
      const depth = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
      this.maxScrollDepth = Math.max(this.maxScrollDepth, depth);
      this.interactions.scrollEvents++;
    }

    /**
     * Collect all data for sending
     */
    collectData() {
      const timeOnPage = (Date.now() - this.pageStartTime) / 1000;
      
      // Extract main content
      const content = this.extractMainContent();
      
      // Get DOM signals
      const domSignals = {
        priceCount: this.observedElements.prices.size,
        cartButtonCount: this.observedElements.cartButtons.size,
        formCount: this.observedElements.forms.size,
        hasPaymentForm: this.observedElements.forms.size > 0,
        matchedSelectors: this.getMatchedSelectors()
      };
      
      return {
        url: window.location.href,
        title: document.title,
        content: content,
        meta: this.extractMetadata(),
        timeOnPage: timeOnPage,
        scrollDepth: this.maxScrollDepth,
        interactions: this.interactions.clicks + this.interactions.formInteractions,
        domSignals: domSignals,
        intentSignals: this.intentSignals,
        sessionId: this.sessionId
      };
    }

    /**
     * Extract main content intelligently
     */
    extractMainContent() {
      // Priority selectors for main content
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '#main-content',
        '.main-content',
        '.product-description',
        '[itemtype*="Product"]'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return this.cleanText(element.textContent).substring(0, 3000);
        }
      }
      
      // Fallback: extract body without navigation
      const body = document.body.cloneNode(true);
      const removeSelectors = [
        'header', 'nav', 'footer', 'aside',
        '.header', '.nav', '.footer', '.sidebar',
        'script', 'style', 'noscript'
      ];
      
      removeSelectors.forEach(selector => {
        body.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      return this.cleanText(body.textContent).substring(0, 3000);
    }

    /**
     * Extract comprehensive metadata
     */
    extractMetadata() {
      const meta = {
        description: '',
        keywords: '',
        author: '',
        type: '',
        image: '',
        price: '',
        currency: '',
        availability: ''
      };
      
      // Standard meta tags
      document.querySelectorAll('meta').forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property') || '';
        const content = tag.getAttribute('content') || '';
        
        if (name.includes('description')) meta.description = content;
        if (name.includes('keywords')) meta.keywords = content;
        if (name.includes('author')) meta.author = content;
        if (name === 'og:type') meta.type = content;
        if (name === 'og:image') meta.image = content;
        if (name.includes('price')) meta.price = content;
        if (name.includes('currency')) meta.currency = content;
        if (name.includes('availability')) meta.availability = content;
      });
      
      return meta;
    }

    /**
     * Get matched intent selectors for classification
     */
    getMatchedSelectors() {
      const matched = [];
      
      // Check for specific high-intent selectors
      const intentSelectors = [
        '.checkout-button',
        '.add-to-cart',
        '[data-action="checkout"]',
        '.payment-form',
        '#place-order'
      ];
      
      intentSelectors.forEach(selector => {
        if (document.querySelector(selector)) {
          matched.push(selector);
        }
      });
      
      return matched;
    }

    /**
     * Clean text content
     */
    cleanText(text) {
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();
    }

    /**
     * Send data to background script
     */
    async sendData() {
      const data = this.collectData();
      
      // Only send if meaningful interaction occurred
      if (data.timeOnPage > 2 || this.interactions.clicks > 0) {
        try {
          await chrome.runtime.sendMessage({
            type: 'ENHANCED_PAGE_DATA',
            data: data
          });
        } catch (error) {
          console.log('Extension context invalidated');
        }
      }
    }

    /**
     * Handle performance entries
     */
    handlePerformanceEntries(entries) {
      entries.forEach(entry => {
        if (entry.name.includes('/checkout') || entry.name.includes('/cart')) {
          this.intentSignals.push({
            type: 'performance_navigation',
            url: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  // Initialize collector when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.__enhancedCollector = new EnhancedContentCollector();
    });
  } else {
    window.__enhancedCollector = new EnhancedContentCollector();
  }

  // Periodic data sending
  setInterval(() => {
    if (window.__enhancedCollector) {
      window.__enhancedCollector.sendData();
    }
  }, 30000); // Every 30 seconds
})();