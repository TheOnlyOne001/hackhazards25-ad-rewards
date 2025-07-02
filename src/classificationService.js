// classificationService.js - Production-ready pattern-based classification
class ClassificationService {
  constructor() {
    this.patterns = {
      // E-commerce patterns
      ecommerce: {
        purchase: [
          /\b(buy|purchase|checkout|cart|order|payment)\b/i,
          /\b(add to cart|proceed to checkout|complete order)\b/i,
          /\$\d+(\.\d{2})?/, // Price patterns
          /\b(price|cost|total|subtotal)\b/i
        ],
        browse: [
          /\b(view|browse|shop|catalog|product|item)\b/i,
          /\b(category|collection|search results)\b/i
        ],
        review: [
          /\b(review|rating|feedback|testimonial)\b/i,
          /\d\s*(star|★|☆)/i
        ]
      },
      
      // Content patterns
      content: {
        article: [
          /\b(article|blog|post|news|story)\b/i,
          /\b(read more|continue reading|full story)\b/i,
          /\b(published|author|date|written by)\b/i
        ],
        video: [
          /\b(video|watch|play|stream|youtube|vimeo)\b/i,
          /\b(duration|views|subscribe|channel)\b/i,
          /\d+:\d+/ // Time format
        ],
        social: [
          /\b(share|like|comment|follow|tweet|post)\b/i,
          /\b(facebook|twitter|instagram|linkedin|social)\b/i,
          /@\w+/ // @ mentions
        ]
      },
      
      // Technical patterns
      technical: {
        documentation: [
          /\b(api|documentation|docs|reference|guide)\b/i,
          /\b(example|tutorial|how to|getting started)\b/i,
          /```[\s\S]*?```/, // Code blocks
          /\b(function|method|class|parameter)\b/i
        ],
        error: [
          /\b(error|exception|failed|crash|bug)\b/i,
          /\b(stack trace|traceback|debug|log)\b/i,
          /Error:\s*.+/i,
          /\b\d{3,4}\s*error\b/i // HTTP error codes
        ],
        code: [
          /\b(github|gitlab|repository|commit|branch)\b/i,
          /\b(javascript|python|java|code|script)\b/i,
          /[{}\[\]();]/, // Code syntax
          /\b(var|let|const|function|class)\b/
        ]
      },
      
      // User intent patterns
      intent: {
        search: [
          /\b(search|find|looking for|where|how to)\b/i,
          /\?$/, // Questions
          /\b(help|support|faq|contact)\b/i
        ],
        transaction: [
          /\b(submit|confirm|save|update|delete)\b/i,
          /\b(form|application|registration|signup)\b/i,
          /\b(email|phone|address|name).*required/i
        ],
        navigation: [
          /\b(home|back|next|previous|menu)\b/i,
          /\b(page \d+|showing \d+|results? \d+)/i,
          /›|»|←|→/ // Navigation symbols
        ]
      }
    };
    
    // Engagement scoring weights
    this.engagementWeights = {
      timeOnPage: 0.3,
      scrollDepth: 0.2,
      clicks: 0.15,
      hover: 0.1,
      formInteraction: 0.15,
      mediaInteraction: 0.1
    };
  }

  /**
   * Classify content based on pattern matching
   * @param {Object} data - Content and metadata to classify
   * @returns {Object} Classification results
   */
  classify(data) {
    const { url, title, content, meta } = data;
    const combinedText = `${url} ${title} ${content}`.toLowerCase();
    
    const scores = {};
    let topCategory = 'general';
    let topSubcategory = 'page';
    let maxScore = 0;
    
    // Score each category and subcategory
    for (const [category, subcategories] of Object.entries(this.patterns)) {
      scores[category] = {};
      
      for (const [subcategory, patterns] of Object.entries(subcategories)) {
        let score = 0;
        let matches = 0;
        
        patterns.forEach(pattern => {
          const matchResult = combinedText.match(pattern);
          if (matchResult) {
            matches++;
            // Weight by match length and position
            const matchLength = matchResult[0].length;
            const position = matchResult.index / combinedText.length;
            score += (matchLength / 10) * (1 - position * 0.5);
          }
        });
        
        // Normalize score
        score = (score / patterns.length) * (matches / patterns.length);
        scores[category][subcategory] = score;
        
        if (score > maxScore) {
          maxScore = score;
          topCategory = category;
          topSubcategory = subcategory;
        }
      }
    }
    
    // Apply domain-specific boosts
    const domainBoosts = this.getDomainBoosts(url);
    if (Object.keys(domainBoosts).length > 0) {
      const forcedCategory = Object.keys(domainBoosts)[0];
      if (scores[forcedCategory]) {
        // Boost all subcategories in the domain's category
        Object.keys(scores[forcedCategory]).forEach(sub => {
          scores[forcedCategory][sub] *= 2.5; // Strong boost
        });
      }
    }
    
    return {
      category: topCategory,
      subcategory: topSubcategory,
      confidence: Math.min(maxScore, 1),
      scores,
      metadata: {
        url,
        title,
        timestamp: Date.now(),
        method: 'pattern_matching'
      }
    };
  }

  /**
   * Calculate engagement score based on user interactions
   * @param {Object} interactions - User interaction data
   * @returns {Object} Engagement metrics
   */
  calculateEngagement(interactions) {
    const {
      timeOnPage = 0,
      scrollDepth = 0,
      clickCount = 0,
      hoverTime = 0,
      formFields = 0,
      mediaPlays = 0
    } = interactions;
    
    // Normalize metrics
    const normalized = {
      timeOnPage: Math.min(timeOnPage / 300, 1), // 5 min max
      scrollDepth: scrollDepth / 100,
      clicks: Math.min(clickCount / 10, 1),
      hover: Math.min(hoverTime / 60, 1), // 60s max
      formInteraction: Math.min(formFields / 5, 1),
      mediaInteraction: Math.min(mediaPlays / 3, 1)
    };
    
    // Calculate weighted score
    let totalScore = 0;
    for (const [metric, weight] of Object.entries(this.engagementWeights)) {
      totalScore += (normalized[metric] || 0) * weight;
    }
    
    return {
      score: totalScore,
      level: this.getEngagementLevel(totalScore),
      metrics: normalized,
      insights: this.generateInsights(normalized)
    };
  }

  /**
   * Get domain-specific category boosts
   * @param {string} url - Page URL
   * @returns {Object} Category boosts
   */
  getDomainBoosts(url) {
    const domain = new URL(url).hostname;
    const boosts = {
      'github.com': { technical: true },
      'stackoverflow.com': { technical: true },
      'amazon.com': { ecommerce: true },     // ← This should override URL patterns
      'amazon.in': { ecommerce: true },      // ← Add regional domains
      'ebay.com': { ecommerce: true },
      'youtube.com': { content: true },
      'medium.com': { content: true }
    };
    
    return boosts[domain] || {};
  }

  /**
   * Get engagement level from score
   * @param {number} score - Engagement score
   * @returns {string} Engagement level
   */
  getEngagementLevel(score) {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'very_low';
  }

  /**
   * Generate insights from engagement metrics
   * @param {Object} metrics - Normalized metrics
   * @returns {Array} Insights
   */
  generateInsights(metrics) {
    const insights = [];
    
    if (metrics.timeOnPage > 0.8) {
      insights.push('High time investment indicates strong interest');
    }
    if (metrics.scrollDepth > 0.7) {
      insights.push('Deep content consumption detected');
    }
    if (metrics.formInteraction > 0.5) {
      insights.push('Active form engagement suggests conversion intent');
    }
    if (metrics.mediaInteraction > 0.3) {
      insights.push('Media consumption indicates content engagement');
    }
    
    return insights;
  }

  /**
   * Batch classify multiple items
   * @param {Array} items - Items to classify
   * @returns {Array} Classification results
   */
  batchClassify(items) {
    return items.map(item => this.classify(item));
  }

  /**
   * Get pattern statistics for debugging
   * @returns {Object} Pattern statistics
   */
  getPatternStats() {
    const stats = {};
    for (const [category, subcategories] of Object.entries(this.patterns)) {
      stats[category] = {};
      for (const [subcategory, patterns] of Object.entries(subcategories)) {
        stats[category][subcategory] = patterns.length;
      }
    }
    return stats;
  }
}

// Export for use in service worker
export default ClassificationService;
