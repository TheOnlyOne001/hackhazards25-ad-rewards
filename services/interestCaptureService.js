// interestCaptureService.js - Always-on local interest capture with privacy

class InterestCaptureService {
  constructor() {
    // 12-dimensional topic vector categories
    this.topicCategories = {
      0: 'technology',     // Software, hardware, programming
      1: 'finance',        // Crypto, investing, banking
      2: 'gaming',         // Video games, esports, game dev
      3: 'health',         // Fitness, medical, wellness
      4: 'education',      // Learning, courses, tutorials
      5: 'entertainment',  // Movies, music, streaming
      6: 'travel',         // Tourism, destinations, planning
      7: 'food',           // Recipes, restaurants, cooking
      8: 'shopping',       // E-commerce, deals, products
      9: 'career',         // Jobs, professional development
      10: 'social',        // Social media, communities
      11: 'lifestyle'      // Fashion, home, hobbies
    };

    // Pattern mappings for each topic
    this.topicPatterns = {
      technology: [
        /\b(api|code|software|developer|programming|javascript|python|github)\b/i,
        /\b(tech|technology|startup|innovation|ai|ml|blockchain)\b/i,
        /\b(database|server|cloud|devops|kubernetes|docker)\b/i
      ],
      finance: [
        /\b(crypto|bitcoin|ethereum|defi|nft|blockchain|wallet)\b/i,
        /\b(invest|trading|stock|market|finance|bank|money)\b/i,
        /\b(portfolio|yield|apr|apy|liquidity|stake)\b/i
      ],
      gaming: [
        /\b(game|gaming|gamer|esports|steam|playstation|xbox)\b/i,
        /\b(fps|rpg|mmo|moba|gameplay|streamer|twitch)\b/i,
        /\b(unity|unreal|gamedev|level|quest|achievement)\b/i
      ],
      health: [
        /\b(health|fitness|workout|exercise|gym|nutrition)\b/i,
        /\b(medical|doctor|symptoms|treatment|wellness|therapy)\b/i,
        /\b(diet|calories|protein|supplement|yoga|meditation)\b/i
      ],
      education: [
        /\b(learn|course|tutorial|education|university|degree)\b/i,
        /\b(study|exam|certification|training|skill|knowledge)\b/i,
        /\b(student|teacher|lecture|lesson|homework|research)\b/i
      ],
      entertainment: [
        /\b(movie|film|netflix|youtube|video|streaming)\b/i,
        /\b(music|spotify|album|concert|artist|song)\b/i,
        /\b(show|series|episode|entertainment|media|content)\b/i
      ],
      travel: [
        /\b(travel|trip|vacation|destination|flight|hotel)\b/i,
        /\b(booking|tourism|adventure|explore|journey|tour)\b/i,
        /\b(airport|visa|passport|luggage|itinerary|guide)\b/i
      ],
      food: [
        /\b(recipe|cooking|food|restaurant|menu|dish)\b/i,
        /\b(ingredient|kitchen|chef|cuisine|meal|dining)\b/i,
        /\b(delivery|takeout|reservation|taste|flavor|gourmet)\b/i
      ],
      shopping: [
        /\b(shop|buy|purchase|cart|checkout|order)\b/i,
        /\b(product|price|discount|deal|sale|coupon)\b/i,
        /\b(amazon|ebay|store|retail|ecommerce|shipping)\b/i
      ],
      career: [
        /\b(job|career|employment|hire|recruit|resume)\b/i,
        /\b(salary|interview|position|company|work|office)\b/i,
        /\b(linkedin|professional|skill|experience|promotion)\b/i
      ],
      social: [
        /\b(social|community|forum|discussion|chat|message)\b/i,
        /\b(facebook|twitter|instagram|reddit|discord|telegram)\b/i,
        /\b(follow|share|like|comment|post|profile)\b/i
      ],
      lifestyle: [
        /\b(fashion|style|clothing|outfit|trend|design)\b/i,
        /\b(home|decor|furniture|diy|garden|interior)\b/i,
        /\b(hobby|craft|art|photography|collection|interest)\b/i
      ]
    };

    // Contextual flags patterns
    this.contextPatterns = {
      productPage: [
        /add to cart|buy now|purchase|price|in stock/i,
        /product details|specifications|reviews/i,
        /\$\d+(\.\d{2})?/
      ],
      videoPage: [
        /watch|play|video|stream|duration/i,
        /\d+:\d+|views|subscribe/i,
        /player|playlist|episode/i
      ],
      articlePage: [
        /article|blog|post|author|published/i,
        /read more|continue reading|comments/i,
        /min read|words|share/i
      ],
      forumPage: [
        /forum|discussion|thread|reply|topic/i,
        /posted by|members|online/i,
        /upvote|downvote|karma/i
      ]
    };

    // Domain boost multipliers
    this.domainBoosts = {
      // Technology
      'github.com': { technology: 2.0 },
      'stackoverflow.com': { technology: 1.8 },
      'dev.to': { technology: 1.5 },
      
      // Finance/Crypto
      'coinbase.com': { finance: 2.0 },
      'binance.com': { finance: 2.0 },
      'tradingview.com': { finance: 1.8 },
      
      // Gaming
      'steam.com': { gaming: 2.0 },
      'twitch.tv': { gaming: 1.8 },
      'ign.com': { gaming: 1.5 },
      
      // Shopping
      'amazon.com': { shopping: 2.0 },
      'ebay.com': { shopping: 1.8 },
      'etsy.com': { shopping: 1.5 },
      
      // Social
      'reddit.com': { social: 1.8 },
      'twitter.com': { social: 1.8 },
      'discord.com': { social: 1.5 }
    };

    // Initialize local vault
    this.interestVault = new Map();
    this.sessionBuffer = [];
  }

  /**
   * Extract interest vector from page content
   * @param {Object} pageData - Page content and metadata
   * @returns {Object} Interest vector and context flags
   */
  extractInterests(pageData) {
    const { url, title, content, meta } = pageData;
    const domain = new URL(url).hostname;
    const combinedText = `${title} ${content} ${meta.description || ''}`.toLowerCase();
    
    // Initialize topic vector
    const topicVector = new Float32Array(12);
    
    // Calculate topic scores
    Object.entries(this.topicPatterns).forEach(([topic, patterns]) => {
      let score = 0;
      let matches = 0;
      
      patterns.forEach(pattern => {
        const matchArray = combinedText.match(new RegExp(pattern.source, 'gi'));
        if (matchArray) {
          matches += matchArray.length;
          score += matchArray.length * 0.1;
        }
      });
      
      // Normalize score
      score = Math.min(score / patterns.length, 1.0);
      
      // Apply domain boost
      const topicIndex = Object.keys(this.topicCategories).find(
        key => this.topicCategories[key] === topic
      );
      
      if (this.domainBoosts[domain]?.[topic]) {
        score *= this.domainBoosts[domain][topic];
      }
      
      topicVector[topicIndex] = Math.min(score, 1.0);
    });
    
    // Extract context flags
    const contextFlags = this.extractContextFlags(combinedText);
    
    // Calculate engagement weight based on time spent
    const engagementWeight = this.calculateEngagementWeight(pageData);
    
    return {
      vector: topicVector,
      context: contextFlags,
      weight: engagementWeight,
      timestamp: Date.now(),
      domain: domain
    };
  }

  /**
   * Extract contextual flags from content
   * @param {string} text - Page text
   * @returns {Object} Context flags
   */
  extractContextFlags(text) {
    const flags = {};
    
    Object.entries(this.contextPatterns).forEach(([context, patterns]) => {
      flags[context] = patterns.some(pattern => pattern.test(text));
    });
    
    return flags;
  }

  /**
   * Calculate engagement weight
   * @param {Object} pageData - Page data with interaction metrics
   * @returns {number} Engagement weight (0-1)
   */
  calculateEngagementWeight(pageData) {
    const { timeOnPage = 0, scrollDepth = 0, interactions = 0 } = pageData;
    
    // Weight factors
    const timeWeight = Math.min(timeOnPage / 300, 1) * 0.5; // 5 min max
    const scrollWeight = (scrollDepth / 100) * 0.3;
    const interactionWeight = Math.min(interactions / 10, 1) * 0.2;
    
    return timeWeight + scrollWeight + interactionWeight;
  }

  /**
   * Update user interest profile with new page data
   * @param {string} userId - User/wallet identifier
   * @param {Object} interests - Extracted interests
   */
  async updateInterestProfile(userId, interests) {
    // Get existing profile
    let profile = this.interestVault.get(userId) || {
      vector: new Float32Array(12),
      totalWeight: 0,
      pageCount: 0,
      lastUpdate: Date.now()
    };
    
    // Update vector with exponential moving average
    const alpha = 0.1; // Learning rate
    const weight = interests.weight;
    
    for (let i = 0; i < 12; i++) {
      profile.vector[i] = profile.vector[i] * (1 - alpha * weight) + 
                         interests.vector[i] * alpha * weight;
    }
    
    profile.totalWeight += weight;
    profile.pageCount++;
    profile.lastUpdate = Date.now();
    
    // Store in vault
    this.interestVault.set(userId, profile);
    
    // Buffer for batch processing
    this.sessionBuffer.push({
      userId,
      interests,
      timestamp: Date.now()
    });
    
    // Commit to storage periodically
    if (this.sessionBuffer.length >= 10) {
      await this.commitToStorage(userId);
    }
  }

  /**
   * Commit interest data to Chrome storage with privacy preservation
   * @param {string} userId - User identifier
   */
  async commitToStorage(userId) {
    const profile = this.interestVault.get(userId);
    if (!profile) return;
    
    // Create privacy-preserving hash commitment
    const commitment = await this.createPoseidonCommitment(profile.vector);
    
    // Store commitment and metadata (no raw vectors)
    const storageData = {
      [`interest_${userId}`]: {
        commitment: commitment,
        vectorNorm: this.calculateVectorNorm(profile.vector),
        topCategories: this.getTopCategories(profile.vector, 3),
        pageCount: profile.pageCount,
        lastUpdate: profile.lastUpdate
      }
    };
    
    await chrome.storage.local.set(storageData);
    
    // Clear session buffer
    this.sessionBuffer = this.sessionBuffer.filter(
      item => item.userId !== userId
    );
  }

  /**
   * Create Poseidon hash commitment of interest vector
   * @param {Float32Array} vector - Interest vector
   * @returns {string} Hash commitment
   */
  async createPoseidonCommitment(vector) {
    // Simplified hash for demo - in production, use actual Poseidon
    const values = Array.from(vector).map(v => Math.floor(v * 1000));
    const commitment = values.reduce((acc, val, idx) => {
      return acc ^ (val << (idx * 2));
    }, 0);
    
    return commitment.toString(16).padStart(16, '0');
  }

  /**
   * Calculate vector norm for similarity comparisons
   * @param {Float32Array} vector - Interest vector
   * @returns {number} Vector norm
   */
  calculateVectorNorm(vector) {
    return Math.sqrt(
      Array.from(vector).reduce((sum, val) => sum + val * val, 0)
    );
  }

  /**
   * Get top interest categories
   * @param {Float32Array} vector - Interest vector
   * @param {number} n - Number of top categories
   * @returns {Array} Top categories
   */
  getTopCategories(vector, n = 3) {
    const scores = Array.from(vector).map((score, index) => ({
      category: this.topicCategories[index],
      score: score
    }));
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .filter(item => item.score > 0.1)
      .map(item => item.category);
  }

  /**
   * Match user interests with available quests
   * @param {string} userId - User identifier
   * @param {Array} availableQuests - Available quests from partners
   * @returns {Array} Matched quests
   */
  async matchQuests(userId, availableQuests) {
    const profile = this.interestVault.get(userId);
    if (!profile) return [];
    
    const matches = [];
    
    for (const quest of availableQuests) {
      const similarity = this.calculateQuestSimilarity(
        profile.vector,
        quest.requiredInterests
      );
      
      if (similarity > quest.threshold || 0.5) {
        matches.push({
          ...quest,
          matchScore: similarity,
          relevantCategories: this.getRelevantCategories(
            profile.vector,
            quest.requiredInterests
          )
        });
      }
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate similarity between user vector and quest requirements
   * @param {Float32Array} userVector - User interest vector
   * @param {Object} questInterests - Quest interest requirements
   * @returns {number} Similarity score (0-1)
   */
  calculateQuestSimilarity(userVector, questInterests) {
    let similarity = 0;
    let totalWeight = 0;
    
    Object.entries(questInterests).forEach(([category, weight]) => {
      const index = Object.keys(this.topicCategories).find(
        key => this.topicCategories[key] === category
      );
      
      if (index !== undefined) {
        similarity += userVector[index] * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * Get relevant categories for quest match
   * @param {Float32Array} userVector - User interest vector
   * @param {Object} questInterests - Quest requirements
   * @returns {Array} Relevant categories
   */
  getRelevantCategories(userVector, questInterests) {
    return Object.keys(questInterests).filter(category => {
      const index = Object.keys(this.topicCategories).find(
        key => this.topicCategories[key] === category
      );
      return index !== undefined && userVector[index] > 0.2;
    });
  }
}

// Export for use in service worker
export default InterestCaptureService;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterestCaptureService;
}