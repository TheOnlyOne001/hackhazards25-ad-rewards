// background.js - Static import version (bundled by webpack)
console.log("ML-enabled background service worker starting...");

// Import transformers statically (webpack will bundle it)
import { pipeline, env } from '@xenova/transformers';

// Configure transformers for Chrome extension compatibility
env.allowRemoteModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = false;

// Configuration
const API_CONFIG = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || null,
  ENABLE_GROQ_FALLBACK: Boolean(process.env.GROQ_API_KEY)
};

const CONFIG = {
  MODEL_NAME: 'Xenova/all-MiniLM-L6-v2', // Smaller, more compatible model
  MAX_CONTENT_LENGTH: 512,
  TOPIC_VECTOR_SIZE: 12,
  MIN_CONTENT_FOR_ML: 400,
  MAX_CLASSIFICATION_TIME: 5000, // Increased timeout for model loading
  SALT_LENGTH: 32,
};

// Storage keys
const ENGAGEMENT_SESSIONS_KEY = 'engagementSessions';
const CRYPTO_SALT_KEY = 'cryptoSalt';

// Global ML state
let bertPipeline = null;
let modelLoading = false;
let cryptoSalt = null;

/**
 * Initialize crypto salt
 */
async function initializeCryptoSalt() {
  if (cryptoSalt) return cryptoSalt;
  
  try {
    const stored = await getStorageData(CRYPTO_SALT_KEY);
    if (stored) {
      cryptoSalt = stored;
      console.log('🔐 Crypto salt loaded');
    } else {
      cryptoSalt = Array.from(self.crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH)));
      await setStorageData(CRYPTO_SALT_KEY, cryptoSalt);
      console.log('🔐 Crypto salt generated');
    }
    return cryptoSalt;
  } catch (error) {
    console.error('❌ Crypto salt error:', error);
    cryptoSalt = Array.from(self.crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH)));
    return cryptoSalt;
  }
}

/**
 * Initialize ML model with static import (bundled by webpack)
 */
async function initializeTinyML() {
  if (bertPipeline) return bertPipeline;
  if (modelLoading) return null;
  
  modelLoading = true;
  console.log('🤖 Loading bundled ML model...');
  
  try {
    const startTime = Date.now();
    
    // Configure for Chrome extension compatibility
    const pipelineOptions = {
      quantized: false, // Disable quantization for compatibility
      device: 'cpu',
      dtype: 'fp32',
      // Disable threading and SIMD for Chrome extension compatibility
      onnx: {
        wasm: {
          numThreads: 1,
          simd: false
        }
      }
    };
    
    console.log('🔧 Using compatibility mode: single-threaded, no SIMD');
    
    // Static import - webpack bundles this
    bertPipeline = await pipeline('feature-extraction', CONFIG.MODEL_NAME, pipelineOptions);
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Bundled ML model loaded in ${loadTime}ms`);
    
    modelLoading = false;
    return bertPipeline;
    
  } catch (error) {
    console.error('❌ ML model loading failed:', error);
    console.log('💡 Falling back to simple classification');
    modelLoading = false;
    return null;
  }
}

/**
 * Enhanced page content classification with bundled ML
 */
async function classifyPageContent(pageContent, isReanalysis = false) {
  const startTime = Date.now();
  
  try {
    if (pageContent.contentLength < CONFIG.MIN_CONTENT_FOR_ML) {
      console.log('📄 Content too short for ML, using simple fallback');
      return await classifyWithSimpleFallback(pageContent);
    }
    
    // Try bundled ML model
    const pipeline = await initializeTinyML();
    if (!pipeline) {
      console.log('🔄 ML model not available, using simple classification');
      return await classifyWithSimpleFallback(pageContent);
    }
    
    const textContent = preprocessContent(pageContent);
    
    console.log('🔍 Running ML classification...');
    const classificationPromise = pipeline(textContent, {
      pooling: 'mean',
      normalize: true
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Classification timeout')), CONFIG.MAX_CLASSIFICATION_TIME);
    });
    
    const result = await Promise.race([classificationPromise, timeoutPromise]);
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ ML classification completed in ${processingTime}ms`);
    
    const topicVector = await generateEnhancedTopicVector(result.data, pageContent);
    
    return {
      success: true,
      topicVector: topicVector,
      confidence: calculateConfidence(result.data),
      processingTime: processingTime,
      method: 'bundledML',
      isReanalysis: isReanalysis
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ ML classification failed after ${processingTime}ms:`, error);
    
    if (CONFIG.ENABLE_GROQ_FALLBACK && API_CONFIG.GROQ_API_KEY && pageContent.contentLength > 200) {
      console.log('🔄 Falling back to Groq API...');
      return await classifyWithGroqFallback(pageContent);
    } else {
      console.log('🔄 Using simple pattern-based classification...');
      return await classifyWithSimpleFallback(pageContent);
    }
  }
}

function preprocessContent(pageContent) {
  let text = `${pageContent.title} ${pageContent.metaDescription} ${pageContent.content}`;
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, CONFIG.MAX_CONTENT_LENGTH);
}

function calculateConfidence(embeddings) {
  if (!embeddings || embeddings.length === 0) return 0;
  
  const mean = embeddings.reduce((a, b) => a + b, 0) / embeddings.length;
  const variance = embeddings.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / embeddings.length;
  
  return Math.min(1, Math.max(0.1, 1 - Math.sqrt(variance)));
}

async function generateEnhancedTopicVector(embeddings, pageContent) {
  try {
    const baseVector = Array.from(embeddings.slice(0, CONFIG.TOPIC_VECTOR_SIZE));
    const contentFeatures = extractAdvancedContentFeatures(pageContent);
    
    const topicVector = baseVector.map((val, idx) => {
      const contentVal = contentFeatures[idx] || 0;
      return (val * 0.7 + contentVal * 0.3);
    });
    
    const hashedVector = await saltedPoseidonHash(topicVector);
    
    return {
      raw: topicVector,
      hashed: hashedVector,
      salt: await initializeCryptoSalt()
    };
    
  } catch (error) {
    console.error('❌ Error generating topic vector:', error);
    return {
      raw: new Array(CONFIG.TOPIC_VECTOR_SIZE).fill(0.1),
      hashed: null,
      salt: null
    };
  }
}

function extractAdvancedContentFeatures(pageContent) {
  const features = [];
  const content = pageContent.content.toLowerCase();
  const title = pageContent.title.toLowerCase();
  
  const topicAnalysis = {
    technology: { keywords: ['tech', 'software', 'app', 'digital', 'ai', 'algorithm', 'code'], weight: 1.2 },
    business: { keywords: ['business', 'company', 'market', 'finance', 'investment', 'startup'], weight: 1.1 },
    health: { keywords: ['health', 'medical', 'fitness', 'wellness', 'doctor', 'medicine'], weight: 1.0 },
    education: { keywords: ['education', 'learning', 'school', 'university', 'course', 'study'], weight: 1.0 },
    entertainment: { keywords: ['entertainment', 'movie', 'music', 'game', 'fun', 'leisure'], weight: 0.9 },
    news: { keywords: ['news', 'politics', 'world', 'breaking', 'update', 'report'], weight: 1.1 },
    shopping: { keywords: ['shop', 'buy', 'product', 'price', 'sale', 'discount', 'store'], weight: 1.2 },
    travel: { keywords: ['travel', 'trip', 'hotel', 'flight', 'vacation', 'destination'], weight: 1.0 },
    food: { keywords: ['food', 'recipe', 'restaurant', 'cooking', 'cuisine', 'meal'], weight: 0.9 },
    sports: { keywords: ['sport', 'game', 'team', 'player', 'match', 'score'], weight: 0.9 },
    lifestyle: { keywords: ['lifestyle', 'fashion', 'beauty', 'home', 'design', 'style'], weight: 0.8 },
    science: { keywords: ['science', 'research', 'study', 'discovery', 'experiment', 'theory'], weight: 1.0 }
  };
  
  Object.values(topicAnalysis).forEach(topic => {
    let score = 0;
    topic.keywords.forEach(keyword => {
      const titleMatches = (title.match(new RegExp(keyword, 'g')) || []).length;
      const contentMatches = (content.match(new RegExp(keyword, 'g')) || []).length;
      score += (titleMatches * 3 + contentMatches) * topic.weight;
    });
    features.push(Math.min(1, score / 20));
  });
  
  while (features.length < CONFIG.TOPIC_VECTOR_SIZE) {
    features.push(0);
  }
  
  return features.slice(0, CONFIG.TOPIC_VECTOR_SIZE);
}

async function saltedPoseidonHash(vector) {
  try {
    const salt = await initializeCryptoSalt();
    const combined = [...vector, ...salt.slice(0, 4)];
    const hashInput = combined.map(x => Math.floor(x * 1000000)).join('');
    
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return {
      value: Math.abs(hash).toString(36),
      algorithm: 'simple_salted',
      saltUsed: true
    };
    
  } catch (error) {
    console.error('❌ Error in salted hashing:', error);
    return null;
  }
}

async function classifyWithSimpleFallback(pageContent) {
  console.log('🔄 Using simple pattern-based classification');
  
  const features = extractAdvancedContentFeatures(pageContent);
  
  return {
    success: true,
    topicVector: {
      raw: features,
      hashed: await saltedPoseidonHash(features),
      salt: await initializeCryptoSalt()
    },
    confidence: 0.6,
    processingTime: 10,
    method: 'simple_patterns'
  };
}

async function classifyWithGroqFallback(pageContent, retryCount = 0) {
  try {
    if (!API_CONFIG.GROQ_API_KEY) {
      throw new Error('Groq API key not available');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{
          role: 'system',
          content: 'Extract topics and generate 12-dimensional vector (0-1 values). Return JSON: {"topicVector": [0.1, 0.3, ...], "keywords": ["word1"], "confidence": 0.8}'
        }, {
          role: 'user',
          content: `Title: ${pageContent.title}\nContent: ${pageContent.content.slice(0, 1000)}`
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      success: true,
      topicVector: {
        raw: result.topicVector || new Array(12).fill(0.1),
        hashed: await saltedPoseidonHash(result.topicVector),
        salt: await initializeCryptoSalt()
      },
      keywords: result.keywords || [],
      confidence: result.confidence || 0.8,
      method: 'secure_groq'
    };
    
  } catch (error) {
    console.error('❌ Groq fallback failed:', error);
    
    if (retryCount < 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return classifyWithGroqFallback(pageContent, retryCount + 1);
    }
    
    return classifyWithSimpleFallback(pageContent);
  }
}

async function processEngagementReward(engagementData, pageContent) {
  try {
    console.log('🎯 Processing engagement reward with ML');
    
    const classification = await classifyPageContent(pageContent, engagementData.isReanalysis);
    
    if (!classification.success) {
      console.error('❌ Classification failed');
      return { success: false, error: 'Classification failed' };
    }
    
    console.log(`✅ Classification method: ${classification.method}`);
    
    const sessionRecord = {
      ...engagementData,
      topicVector: classification.topicVector,
      confidence: classification.confidence,
      classificationMethod: classification.method,
      rewardAmount: calculateRewardAmount(engagementData, classification),
      processed: true,
      version: 'bundled_ml_v1',
      id: `${engagementData.domain}_${engagementData.pathBucket}_${engagementData.timestamp}`
    };
    
    await saveEngagementSession(sessionRecord);
    
    // Show notification
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'ML Reward Earned!',
          message: `+${sessionRecord.rewardAmount} ADR tokens (${classification.method}) for ${engagementData.domain}`,
          priority: 2
        });
      }
    } catch (error) {
      console.warn('⚠️ Notifications not available:', error);
    }
    
    return {
      success: true,
      sessionRecord: sessionRecord,
      transactionHash: `tx_${Date.now()}`
    };
    
  } catch (error) {
    console.error('❌ Engagement reward error:', error);
    return { success: false, error: error.message };
  }
}

function calculateRewardAmount(engagementData, classification) {
  let baseReward = 1;
  const qualityMultiplier = 0.5 + (engagementData.engagementQuality / 100);
  const confidenceMultiplier = 0.7 + (classification.confidence * 0.3);
  const methodMultiplier = classification.method === 'bundledML' ? 1.0 : 
                          classification.method === 'secure_groq' ? 0.9 : 0.8;
  
  return Math.round(baseReward * qualityMultiplier * confidenceMultiplier * methodMultiplier * 100) / 100;
}

async function saveEngagementSession(sessionRecord) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([ENGAGEMENT_SESSIONS_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      const sessions = result[ENGAGEMENT_SESSIONS_KEY] || [];
      sessions.push(sessionRecord);
      
      const trimmedSessions = sessions.slice(-50);
      
      chrome.storage.local.set({ [ENGAGEMENT_SESSIONS_KEY]: trimmedSessions }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('✅ ML session saved:', sessionRecord.id);
          resolve();
        }
      });
    });
  });
}

async function getStorageData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

async function setStorageData(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.type === 'AUTO_CLASSIFY_PAGE') {
    console.log('🔍 ML auto-classification request');
    
    classifyPageContent(message.pageContent, message.isReanalysis)
      .then(result => {
        console.log('✅ ML classification completed:', {
          method: result.method,
          confidence: result.confidence,
          processingTime: result.processingTime
        });
        sendResponse(result);
      })
      .catch(error => {
        console.error('❌ ML classification error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (message.type === 'PROCESS_ENGAGEMENT_REWARD') {
    console.log('🎯 ML engagement reward request');
    
    processEngagementReward(message.engagementData, message.pageContent)
      .then(result => {
        console.log('✅ ML reward processed');
        
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'REWARD_PROCESSED',
            data: result
          }).catch(() => {});
        }
        
        sendResponse(result);
      })
      .catch(error => {
        console.error('❌ ML reward error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (message.type === 'UPDATE_BADGE') {
    const { progress, status } = message;
    
    if (sender.tab) {
      if (status === 'completed') {
        chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: sender.tab.id });
      } else if (status === 'tracking' && progress > 0 && progress < 100) {
        chrome.action.setBadgeText({ text: `${progress}%`, tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#6050dc', tabId: sender.tab.id });
      }
    }
    
    sendResponse({ success: true });
    return false;
  }
  
  // Legacy handlers
  if (message.type === 'ANALYZE_PAGE_DATA') {
    console.log('⚠️ Legacy analysis - using ML classification');
    if (message.context) {
      const pageContent = {
        url: message.context.url,
        title: message.context.title,
        content: message.context.content,
        contentLength: message.context.content?.length || 0
      };
      
      classifyPageContent(pageContent)
        .then(result => {
          sendResponse({ 
            analysisResult: {
              displayKeywords: result.keywords || ['ml-classified'],
              detailedKeywords: result.keywords || ['ml-classified'],
              surveyQuestions: []
            }
          });
        })
        .catch(error => {
          sendResponse({ error: 'ML classification failed', details: error.message });
        });
      
      return true;
    } else {
      sendResponse({ error: 'Invalid context' });
      return false;
    }
  }
  
  else if (message.type === 'GET_LEARNING_PATH') {
    sendResponse({ path: [] });
    return true;
  }
  
  else {
    sendResponse({ error: 'Unknown message type' });
  }
  
  return false;
});

// Service worker startup
console.log("✅ ML-enabled background service worker started");
console.log("🤖 Transformers bundled via webpack - no dynamic imports");
console.log("🔐 API:", API_CONFIG.ENABLE_GROQ_FALLBACK ? 'Environment vars loaded' : 'Local only');

// Initialize crypto salt
initializeCryptoSalt().catch(error => {
  console.warn("❌ Salt initialization warning:", error);
});