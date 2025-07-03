// enhancedInterestEngine.js - Ad-grade interest capture with privacy preservation

class EnhancedInterestEngine {
  constructor(taxonomyData = null) {
    // Time-boxed activity counters: Map<tag, {d1, d7, d30}>
    this.tagCounters = new Map();
    
    // Intent boost scores
    this.intentBoosts = new Map();
    
    // Behavioral metrics
    this.behavioralMetrics = {
      sessions: new Map(), // sessionId -> metrics
      aggregated: {
        avgTimeOnPage: 0,
        avgScrollDepth: 0,
        totalSessions: 0
      }
    };
    
    // Geo bucket (coarse, privacy-preserving)
    this.geoBucket = null;
    
    // Initialize decay timers
    this.initializeDecaySystem();
    
    // Load taxonomy
    this.taxonomy = taxonomyData?.taxonomy || {};
    this.intentSignals = taxonomyData?.intentSignals || {};
    
    // Log taxonomy loading status
    if (Object.keys(this.taxonomy).length === 0) {
      console.warn('⚠️ Taxonomy not loaded, using empty taxonomy');
    } else {
      console.log(`📚 Loaded taxonomy with ${Object.keys(this.taxonomy).length} sectors`);
    }
    
    // Mini model for text classification (optional)
    this.textClassifier = null;
    this.initializeTextClassifier();
  }

  /**
   * Process page visit with enhanced signals
   */
  async processPageVisit(pageData) {
    try {
      const {
        url,
        title,
        content,
        meta,
        timeOnPage,
        scrollDepth,
        interactions,
        domSignals
      } = pageData;
      
      // 1. Extract fine-grained tags using 3-level taxonomy
      const tags = await this.extractTags(url, title, content, meta);
      
      // 2. Detect purchase intent signals
      const intentLevel = this.detectIntentLevel(url, domSignals, content);
      
      // 3. Update time-boxed counters
      this.updateTagCounters(tags, intentLevel);
      
      // 4. Calculate behavioral scores
      const behavioralScore = this.calculateBehavioralScore({
        timeOnPage,
        scrollDepth,
        interactions,
        recency: Date.now()
      });
      
      // 5. Calculate Probability-to-Act (PtA)
      const ptaScore = this.calculatePtA(tags, intentLevel, behavioralScore);
      
      // 6. Update session metrics
      this.updateSessionMetrics(pageData.sessionId, {
        tags,
        intentLevel,
        behavioralScore,
        ptaScore
      });
      
      // 7. Generate privacy-preserving output
      return this.generatePrivateOutput();
    } catch (error) {
      console.error('❌ Error processing page visit:', error);
      // Return a default output to prevent breaking the flow
      return {
        tagCounts: {},
        intentBoosts: {},
        ptaScore: 0,
        geoBucket: this.geoBucket || '0x00',
        timestamp: Date.now(),
        commitment: '0000000000000000'
      };
    }
  }

  /**
   * Extract tags using 3-level taxonomy
   */
  async extractTags(url, title, content, meta) {
    const tags = new Set();
    const combinedText = `${url || ''} ${title || ''} ${content || ''} ${meta?.description || ''}`.toLowerCase();
    
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch (error) {
      console.warn('Invalid URL:', url);
    }
    
    // Check if taxonomy is loaded
    if (!this.taxonomy || Object.keys(this.taxonomy).length === 0) {
      console.warn('Taxonomy not loaded, returning empty tags');
      return [];
    }
    
    // Iterate through taxonomy
    for (const [sector, subSectors] of Object.entries(this.taxonomy)) {
      if (!subSectors || typeof subSectors !== 'object') continue;
      
      for (const [subSector, intentStates] of Object.entries(subSectors)) {
        if (!intentStates || typeof intentStates !== 'object') continue;
        
        for (const [intentState, config] of Object.entries(intentStates)) {
          if (!config || typeof config !== 'object') continue;
          
          let score = 0;
          
          // Check patterns
          if (config.patterns && Array.isArray(config.patterns)) {
            for (const pattern of config.patterns) {
              if (typeof pattern === 'string' && combinedText.includes(pattern.toLowerCase())) {
                score += 0.3;
              }
            }
          }
          
          // Check keywords
          if (config.keywords && Array.isArray(config.keywords)) {
            for (const keyword of config.keywords) {
              if (typeof keyword === 'string' && combinedText.includes(keyword.toLowerCase())) {
                score += 0.2;
              }
            }
          }
          
          // Check domains
          if (config.domains && Array.isArray(config.domains) && domain) {
            if (config.domains.includes(domain)) {
              score += 0.5;
            }
          }
          
          // Add tag if score threshold met
          if (score >= 0.3 && config.weight && typeof config.weight === 'number') {
            const tagPath = `${sector}/${subSector}/${intentState}`;
            tags.add({
              path: tagPath,
              score: Math.min(score * config.weight, 1.0),
              weight: config.weight
            });
          }
        }
      }
    }
    
    // Use text classifier for uncaught categories
    if (this.textClassifier && tags.size < 3) {
      try {
        const classifiedTags = await this.classifyWithModel(content);
        classifiedTags.forEach(tag => tags.add(tag));
      } catch (error) {
        console.warn('Text classification failed, skipping:', error);
      }
    }
    
    return Array.from(tags);
  }

  /**
   * Detect intent level from DOM and URL signals
   */
  detectIntentLevel(url, domSignals, content) {
    let maxBoost = 1.0;
    let detectedIntent = 'research_phase';
    
    // Defensive checks
    if (!url || !content) {
      return { type: detectedIntent, boost: maxBoost };
    }
    
    const urlLower = url.toLowerCase();
    const contentLower = content.toLowerCase();
    
    for (const [intentType, config] of Object.entries(this.intentSignals)) {
      if (!config || typeof config !== 'object') continue;
      
      let matches = 0;
      
      // Check URL patterns
      if (config.urlPatterns && Array.isArray(config.urlPatterns)) {
        for (const pattern of config.urlPatterns) {
          if (typeof pattern === 'string' && urlLower.includes(pattern)) {
            matches++;
          }
        }
      }
      
      // Check DOM elements
      if (config.domElements && Array.isArray(config.domElements) && domSignals) {
        for (const selector of config.domElements) {
          if (domSignals.matchedSelectors?.includes(selector)) {
            matches++;
          }
        }
      }
      
      // Check content patterns
      if (config.patterns && Array.isArray(config.patterns)) {
        for (const pattern of config.patterns) {
          if (typeof pattern === 'string' && contentLower.includes(pattern)) {
            matches++;
          }
        }
      }
      
      // Detect price signals (strong purchase indicator)
      const priceRegex = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi;
      const priceMatches = content.match(priceRegex);
      if (priceMatches && priceMatches.length > 0) {
        matches += 0.5;
      }
      
      if (matches > 0 && config.boost && typeof config.boost === 'number' && config.boost > maxBoost) {
        maxBoost = config.boost;
        detectedIntent = intentType;
      }
    }
    
    return {
      type: detectedIntent,
      boost: maxBoost
    };
  }

  /**
   * Update time-boxed tag counters with decay
   */
  updateTagCounters(tags, intentLevel) {
    const now = Date.now();
    
    tags.forEach(tag => {
      if (!this.tagCounters.has(tag.path)) {
        this.tagCounters.set(tag.path, {
          d1: { count: 0, lastUpdate: now },
          d7: { count: 0, lastUpdate: now },
          d30: { count: 0, lastUpdate: now }
        });
      }
      
      const counter = this.tagCounters.get(tag.path);
      
      // Apply time decay before updating
      this.applyTimeDecay(counter, now);
      
      // Update counts with intent boost
      const boost = intentLevel.boost;
      counter.d1.count += tag.score * boost;
      counter.d7.count += tag.score * boost * 0.7;
      counter.d30.count += tag.score * boost * 0.5;
      
      // Update intent boosts
      if (intentLevel.boost > 1.5) {
        const currentBoost = this.intentBoosts.get(tag.path) || 0;
        this.intentBoosts.set(tag.path, Math.max(currentBoost, intentLevel.boost));
      }
    });
  }

  /**
   * Apply exponential time decay to counters
   */
  applyTimeDecay(counter, now) {
    // Decay rates per hour
    const hourlyDecay = {
      d1: 0.95,   // ~0.54 after 24h
      d7: 0.98,   // ~0.87 after 24h
      d30: 0.995  // ~0.97 after 24h
    };
    
    Object.entries(counter).forEach(([window, data]) => {
      const hoursPassed = (now - data.lastUpdate) / (1000 * 60 * 60);
      if (hoursPassed > 0) {
        const decayFactor = Math.pow(hourlyDecay[window], hoursPassed);
        data.count *= decayFactor;
        data.lastUpdate = now;
      }
    });
  }

  /**
   * Calculate behavioral score from engagement metrics
   */
  calculateBehavioralScore({ timeOnPage, scrollDepth, interactions, recency }) {
    // Normalize inputs
    const normalizedTime = Math.min(timeOnPage / 300, 1); // 5 min max
    const normalizedScroll = scrollDepth / 100;
    const normalizedInteractions = Math.min(interactions / 20, 1);
    
    // Recency factor (exponential decay over hours)
    const hoursAgo = (Date.now() - recency) / (1000 * 60 * 60);
    const recencyFactor = Math.exp(-hoursAgo / 24); // Half-life of ~17 hours
    
    // Weighted combination
    const score = (
      normalizedTime * 0.4 +
      normalizedScroll * 0.3 +
      normalizedInteractions * 0.3
    ) * recencyFactor;
    
    return score;
  }

  /**
   * Calculate Probability-to-Act (PtA) score
   */
  calculatePtA(tags, intentLevel, behavioralScore) {
    // Get strongest tag signal
    const maxTagScore = Math.max(...tags.map(t => {
      const counter = this.tagCounters.get(t.path);
      return counter ? counter.d1.count : 0;
    }), 0);
    
    // Logistic function inputs
    const z = (
      0.8 * Math.log(Math.max(maxTagScore, 1)) +
      0.5 * behavioralScore +
      0.3 * Math.log(intentLevel.boost)
    );
    
    // Sigmoid function: 1 / (1 + e^(-z))
    const pta = 1 / (1 + Math.exp(-z));
    
    return Math.round(pta * 100) / 100; // Round to 2 decimals
  }

  /**
   * Initialize text classifier for open-graph content
   */
  async initializeTextClassifier() {
    // Optional: Load quantized MiniLM model
    // This would use @xenova/transformers with a small model
    // For now, we'll use a placeholder
    this.textClassifier = {
      classify: async (text) => {
        // Placeholder for actual model inference
        // In production, this would use the quantized model
        return [];
      }
    };
  }

  /**
   * Classify text using the mini model (fallback classification)
   */
  async classifyWithModel(content) {
    if (!this.textClassifier) {
      return [];
    }

    try {
      // Use the text classifier to get additional tags
      const results = await this.textClassifier.classify(content);
      
      // Convert results to tag format
      const tags = results.map(result => ({
        path: `general/${result.category}/browse`,
        score: result.confidence || 0.5,
        weight: 1.0
      }));
      
      return tags;
    } catch (error) {
      console.warn('Text classification failed:', error);
      return [];
    }
  }

  /**
   * Set geo bucket (coarse location)
   */
  async setGeoBucket() {
    if (!this.geoBucket && navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000
          });
        });
        
        // Hash city-level location to 8-bit bucket
        const lat = Math.floor(position.coords.latitude);
        const lon = Math.floor(position.coords.longitude);
        const cityHash = this.simpleHash(`${lat},${lon}`);
        this.geoBucket = (cityHash & 0xFF).toString(16).padStart(2, '0');
      } catch (error) {
        console.log('Geo permission denied, using default bucket');
        this.geoBucket = '00';
      }
    }
  }

  /**
   * Simple hash function for geo bucketing
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate privacy-preserving output
   */
  generatePrivateOutput() {
    // Aggregate tag counts (only top tags)
    const tagCounts = {};
    const sortedTags = Array.from(this.tagCounters.entries())
      .sort((a, b) => b[1].d1.count - a[1].d1.count)
      .slice(0, 10); // Top 10 tags
    
    sortedTags.forEach(([tag, counter]) => {
      if (counter.d1.count > 0.1) {
        tagCounts[tag] = Math.round(counter.d1.count * 10) / 10;
      }
    });
    
    // Aggregate intent boosts
    const intentBoosts = {};
    this.intentBoosts.forEach((boost, tag) => {
      if (boost > 1.5) {
        // Extract sector/subsector from tag path
        const parts = tag.split('/');
        const key = `${parts[0]}/${parts[1]}`;
        intentBoosts[key] = Math.round(boost * 10) / 10;
      }
    });
    
    // Calculate overall PtA
    const overallPta = this.calculateOverallPtA();
    
    // Create output object
    const output = {
      tagCounts,
      intentBoosts,
      ptaScore: overallPta,
      geoBucket: this.geoBucket || '0x00',
      timestamp: Date.now()
    };
    
    // Generate Poseidon commitment
    output.commitment = this.generatePoseidonCommitment(output);
    
    return output;
  }

  /**
   * Calculate overall PtA from all signals
   */
  calculateOverallPtA() {
    const sessions = Array.from(this.behavioralMetrics.sessions.values());
    if (sessions.length === 0) return 0;
    
    // Average PtA from recent sessions
    const recentSessions = sessions
      .filter(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000) // Last 24h
      .slice(-10); // Last 10 sessions
    
    if (recentSessions.length === 0) return 0;
    
    const avgPta = recentSessions.reduce((sum, s) => sum + s.ptaScore, 0) / recentSessions.length;
    return Math.round(avgPta * 100) / 100;
  }

  /**
   * Generate Poseidon commitment (placeholder)
   */
  generatePoseidonCommitment(data) {
    // In production, use actual Poseidon hash
    const dataStr = JSON.stringify(data);
    const nonce = Math.random().toString(36).substring(7);
    
    // Simple hash for demo
    let hash = 0;
    const combined = dataStr + nonce;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Initialize decay system with hourly cron
   */
  initializeDecaySystem() {
    // Run decay every hour
    setInterval(() => {
      this.runDecay();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Run time decay on all counters
   */
  runDecay() {
    const now = Date.now();
    this.tagCounters.forEach((counter, tag) => {
      this.applyTimeDecay(counter, now);
      
      // Clean up near-zero entries
      if (counter.d30.count < 0.01) {
        this.tagCounters.delete(tag);
      }
    });
    
    // Decay intent boosts
    this.intentBoosts.forEach((boost, tag) => {
      const decayed = boost * 0.95;
      if (decayed < 1.1) {
        this.intentBoosts.delete(tag);
      } else {
        this.intentBoosts.set(tag, decayed);
      }
    });
  }

  /**
   * Update session metrics
   */
  updateSessionMetrics(sessionId, metrics) {
    this.behavioralMetrics.sessions.set(sessionId, {
      ...metrics,
      timestamp: Date.now()
    });
    
    // Clean old sessions (keep last 100)
    if (this.behavioralMetrics.sessions.size > 100) {
      const sorted = Array.from(this.behavioralMetrics.sessions.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      this.behavioralMetrics.sessions.delete(sorted[0][0]);
    }
  }

  /**
   * Get current interest profile for debugging
   */
  getCurrentProfile() {
    return {
      tagCounts: Object.fromEntries(
        Array.from(this.tagCounters.entries())
          .map(([tag, counter]) => [tag, {
            d1: Math.round(counter.d1.count * 10) / 10,
            d7: Math.round(counter.d7.count * 10) / 10,
            d30: Math.round(counter.d30.count * 10) / 10
          }])
      ),
      intentBoosts: Object.fromEntries(this.intentBoosts),
      sessionCount: this.behavioralMetrics.sessions.size,
      overallPta: this.calculateOverallPtA(),
      geoBucket: this.geoBucket
    };
  }

  /**
   * Export data for quest matching
   */
  exportForQuestMatching() {
    const profile = this.generatePrivateOutput();
    
    // Extract top interests by sector
    const sectorInterests = new Map();
    
    Object.entries(profile.tagCounts).forEach(([tagPath, count]) => {
      const [sector, subsector] = tagPath.split('/');
      const key = `${sector}/${subsector}`;
      
      if (!sectorInterests.has(key)) {
        sectorInterests.set(key, 0);
      }
      sectorInterests.set(key, sectorInterests.get(key) + count);
    });
    
    // Sort and return top sectors
    const topInterests = Array.from(sectorInterests.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector, score]) => ({
        sector,
        score: Math.round(score * 10) / 10,
        hasIntent: profile.intentBoosts[sector] || 1.0
      }));
    
    return {
      interests: topInterests,
      ptaScore: profile.ptaScore,
      geoBucket: profile.geoBucket,
      commitment: profile.commitment
    };
  }
}

export default EnhancedInterestEngine;