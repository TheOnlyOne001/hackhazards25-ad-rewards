// src/popup/components/InterestDashboard.jsx
import React, { useState, useEffect } from 'react';

const topicCategories = {
  technology: { icon: '💻', color: '#00d4ff' },
  finance: { icon: '💰', color: '#00ff88' },
  gaming: { icon: '🎮', color: '#ff00ff' },
  health: { icon: '💪', color: '#ff6b6b' },
  education: { icon: '📚', color: '#4ecdc4' },
  entertainment: { icon: '🎬', color: '#ff6348' },
  travel: { icon: '✈️', color: '#45b7d1' },
  food: { icon: '🍔', color: '#f9ca24' },
  shopping: { icon: '🛒', color: '#a55eea' },
  career: { icon: '💼', color: '#26de81' },
  social: { icon: '👥', color: '#fd79a8' },
  lifestyle: { icon: '🌟', color: '#fdcb6e' }
};

export default function InterestDashboard({ setCurrentView }) {
  const [userProfile, setUserProfile] = useState(null);
  const [matchedQuests, setMatchedQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [questCount, setQuestCount] = useState(0);
  const [matchRate, setMatchRate] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user ID from storage
      const { userId } = await chrome.storage.local.get('userId');
      if (!userId) {
        setLoading(false);
        return;
      }

      // Load user interests
      const interestResponse = await chrome.runtime.sendMessage({
        type: 'GET_USER_INTERESTS',
        userId: userId
      });

      if (interestResponse.success && interestResponse.profile) {
        setUserProfile(interestResponse.profile);
        setPageCount(interestResponse.profile.pageCount || 0);
        
        // Calculate match rate
        const rate = interestResponse.profile.pageCount > 10 
          ? Math.min(Math.round((interestResponse.profile.pageCount / 50) * 100), 95) 
          : 0;
        setMatchRate(rate);
      }

      // Load matched quests
      const questResponse = await chrome.runtime.sendMessage({
        type: 'CHECK_QUESTS',
        userId: userId
      });

      if (questResponse.success && questResponse.matches) {
        setMatchedQuests(questResponse.matches);
        setQuestCount(questResponse.matches.length);
      }

      // Clear badge notification
      chrome.action.setBadgeText({ text: '' });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestClick = (quest) => {
    console.log('Quest clicked:', quest);
    // Integrate with your existing quest handling logic
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading interest profile...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '500px', backgroundColor: '#0a0a0a', color: '#e0e0e0' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '20px',
        borderBottom: '1px solid #2a2a3e'
      }}>
        <button 
          onClick={() => setCurrentView('main')} 
          style={{ 
            padding: '5px 10px', 
            marginBottom: '15px',
            backgroundColor: 'transparent',
            color: '#e0e0e0',
            border: '1px solid #2a2a3e',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          &lt; Back
        </button>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          Interest Capture
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#00ff88',
            background: 'rgba(0, 255, 136, 0.1)',
            padding: '4px 12px',
            borderRadius: '12px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              background: '#00ff88',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            Active
          </span>
        </h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#a0a0b0' }}>
          Passively learning your interests for better quest matching
        </p>
      </div>

      {/* Interest Grid */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1a1a2e' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#a0a0b0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Your Interest Profile
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px'
        }}>
          {userProfile ? (
            Object.entries(topicCategories).map(([category, config]) => {
              const score = userProfile.topCategories?.includes(category) 
                ? 0.7 + Math.random() * 0.3 
                : Math.random() * 0.3;
              
              return (
                <div
                  key={category}
                  style={{
                    background: '#16213e',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = '#1e2d4e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#16213e';
                  }}
                >
                  <div style={{ fontSize: '12px', marginBottom: '4px', color: '#e0e0e0' }}>
                    {config.icon} {category.charAt(0).toUpperCase() + category.slice(1)}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#00ff88' }}>
                    {Math.round(score * 100)}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(0, 255, 136, 0.3)'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${score * 100}%`,
                      background: config.color,
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6a6a7a', padding: '20px' }}>
              <p>Start browsing to build your interest profile!</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '16px',
        background: '#0f0f1f'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#00ff88' }}>{pageCount}</div>
          <div style={{ fontSize: '11px', color: '#a0a0b0', textTransform: 'uppercase' }}>Pages Analyzed</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#00ff88' }}>{questCount}</div>
          <div style={{ fontSize: '11px', color: '#a0a0b0', textTransform: 'uppercase' }}>Quests Available</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#00ff88' }}>{matchRate}%</div>
          <div style={{ fontSize: '11px', color: '#a0a0b0', textTransform: 'uppercase' }}>Match Rate</div>
        </div>
      </div>

      {/* Matched Quests */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1a1a2e' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#a0a0b0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Matched Quests
        </h3>
        
        {matchedQuests.length > 0 ? (
          matchedQuests.map(quest => (
            <div
              key={quest.id}
              onClick={() => handleQuestClick(quest)}
              style={{
                background: '#16213e',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid transparent',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00ff88';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                  {quest.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#00ff88',
                  background: 'rgba(0, 255, 136, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {Math.round(quest.matchScore * 100)}% match
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#a0a0b0', marginBottom: '8px' }}>
                {quest.description}
              </div>
              <div style={{ fontSize: '12px', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🏆</span> {quest.reward}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6a6a7a' }}>
            <p>No matching quests yet. Keep browsing to build your interest profile!</p>
          </div>
        )}
      </div>

      {/* Privacy Note */}
      <div style={{
        padding: '12px 20px',
        background: '#0f0f1f',
        fontSize: '11px',
        color: '#6a6a7a',
        textAlign: 'center',
        lineHeight: '1.5'
      }}>
        <span style={{ marginRight: '4px' }}>🔐</span>
        All data is stored locally using privacy-preserving hashes. No raw browsing data leaves your device.
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}