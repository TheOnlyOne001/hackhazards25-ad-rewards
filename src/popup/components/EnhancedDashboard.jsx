// EnhancedDashboard.jsx - Ad-grade interest dashboard with PtA visualization

import React, { useState, useEffect } from 'react';

const SECTOR_COLORS = {
  shopping: '#FF6B6B',
  finance: '#4ECDC4',
  technology: '#45B7D1',
  entertainment: '#FD79A8',
  travel: '#A55EEA',
  health: '#26DE81',
  food: '#F9CA24',
  education: '#0984E3',
  automotive: '#6C5CE7'
};

export default function EnhancedDashboard({ setCurrentView }) {
  const [profile, setProfile] = useState(null);
  const [questMatches, setQuestMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState('d1');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadEnhancedProfile();
  }, []);

  const loadEnhancedProfile = async () => {
    try {
      const { userId } = await chrome.storage.local.get('userId');
      if (!userId) {
        setLoading(false);
        return;
      }

      // Get enhanced profile
      const response = await chrome.runtime.sendMessage({
        type: 'GET_INTEREST_PROFILE',
        userId: userId
      });

      if (response.success && response.profile) {
        setProfile(response.profile);
        setMetrics(response.profile.metrics);
      }

      // Get quest matches
      const questResponse = await chrome.runtime.sendMessage({
        type: 'GET_QUEST_MATCHES',
        userId: userId
      });

      if (questResponse.success && questResponse.matches) {
        setQuestMatches(questResponse.matches);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTagHeatmap = () => {
    if (!profile?.tagCounts) return null;

    // Group by sector
    const sectorData = {};
    Object.entries(profile.tagCounts).forEach(([tag, counts]) => {
      const [sector, subsector, intent] = tag.split('/');
      if (!sectorData[sector]) {
        sectorData[sector] = {};
      }
      if (!sectorData[sector][subsector]) {
        sectorData[sector][subsector] = {};
      }
      sectorData[sector][subsector][intent] = counts[selectedTimeWindow];
    });

    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Interest Heatmap - {selectedTimeWindow === 'd1' ? '24 Hours' : selectedTimeWindow === 'd7' ? '7 Days' : '30 Days'}
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={() => setSelectedTimeWindow('d1')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedTimeWindow === 'd1' ? '#007AFF' : '#E5E5EA',
              color: selectedTimeWindow === 'd1' ? 'white' : '#333',
              cursor: 'pointer'
            }}
          >
            24h
          </button>
          <button 
            onClick={() => setSelectedTimeWindow('d7')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedTimeWindow === 'd7' ? '#007AFF' : '#E5E5EA',
              color: selectedTimeWindow === 'd7' ? 'white' : '#333',
              cursor: 'pointer'
            }}
          >
            7d
          </button>
          <button 
            onClick={() => setSelectedTimeWindow('d30')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedTimeWindow === 'd30' ? '#007AFF' : '#E5E5EA',
              color: selectedTimeWindow === 'd30' ? 'white' : '#333',
              cursor: 'pointer'
            }}
          >
            30d
          </button>
        </div>

        {Object.entries(sectorData).map(([sector, subsectors]) => (
          <div key={sector} style={{ marginBottom: '20px' }}>
            <h4 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: SECTOR_COLORS[sector] || '#333'
            }}>
              {sector.toUpperCase()}
            </h4>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(subsectors).map(([subsector, intents]) => (
                <div key={subsector} style={{
                  background: '#f5f5f7',
                  borderRadius: '8px',
                  padding: '12px',
                  minWidth: '200px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '8px' }}>
                    {subsector}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['research', 'cart', 'purchase'].map(intent => {
                      const value = intents[intent] || 0;
                      const intensity = Math.min(value / 5, 1);
                      
                      return (
                        <div
                          key={intent}
                          style={{
                            width: '60px',
                            height: '40px',
                            borderRadius: '4px',
                            background: `rgba(${SECTOR_COLORS[sector] ? 
                              parseInt(SECTOR_COLORS[sector].slice(1,3), 16) + ',' +
                              parseInt(SECTOR_COLORS[sector].slice(3,5), 16) + ',' +
                              parseInt(SECTOR_COLORS[sector].slice(5,7), 16)
                              : '0,0,0'}, ${intensity})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            color: intensity > 0.5 ? 'white' : '#333',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          <div>{intent}</div>
                          <div>{value.toFixed(1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPtAGauge = () => {
    const pta = profile?.overallPta || 0;
    const angle = (pta * 180) - 90; // Convert to angle (-90 to 90)
    
    return (
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Probability to Act (PtA)
        </h3>
        
        <div style={{ position: 'relative', width: '200px', height: '100px', margin: '0 auto' }}>
          <svg width="200" height="100" viewBox="0 0 200 100">
            {/* Background arc */}
            <path
              d="M 20 80 A 60 60 0 0 1 180 80"
              fill="none"
              stroke="#E5E5EA"
              strokeWidth="20"
            />
            
            {/* PtA arc */}
            <path
              d={`M 20 80 A 60 60 0 0 1 ${100 + 80 * Math.cos(angle * Math.PI / 180)} ${80 - 80 * Math.sin(angle * Math.PI / 180)}`}
              fill="none"
              stroke={pta > 0.7 ? '#FF3B30' : pta > 0.4 ? '#FF9500' : '#34C759'}
              strokeWidth="20"
              strokeLinecap="round"
            />
            
            {/* Needle */}
            <line
              x1="100"
              y1="80"
              x2={100 + 70 * Math.cos(angle * Math.PI / 180)}
              y2={80 - 70 * Math.sin(angle * Math.PI / 180)}
              stroke="#333"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Center dot */}
            <circle cx="100" cy="80" r="6" fill="#333" />
          </svg>
          
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            {(pta * 100).toFixed(0)}%
          </div>
        </div>
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          {pta > 0.7 ? 'High Purchase Intent' : 
           pta > 0.4 ? 'Moderate Interest' : 
           'Research Phase'}
        </div>
      </div>
    );
  };

  const renderQuestMatches = () => {
    return (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          Targeted Quests ({questMatches.length})
        </h3>
        
        {questMatches.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            background: '#f5f5f7', 
            borderRadius: '12px',
            color: '#666'
          }}>
            Keep browsing to unlock personalized quests!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questMatches.slice(0, 5).map(quest => (
              <div
                key={quest.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E5EA',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Match score indicator */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(to right, 
                    ${SECTOR_COLORS[quest.primarySector] || '#007AFF'} 0%, 
                    ${SECTOR_COLORS[quest.primarySector] || '#007AFF'} ${quest.matchScore * 100}%, 
                    #E5E5EA ${quest.matchScore * 100}%)`
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      {quest.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      {quest.description}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: '#FFF3CD',
                        color: '#856404',
                        borderRadius: '4px'
                      }}>
                        {quest.reward}
                      </span>
                      {quest.minIntent && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: quest.ptaScore >= quest.minIntent ? '#D4EDDA' : '#F8D7DA',
                          color: quest.ptaScore >= quest.minIntent ? '#155724' : '#721C24',
                          borderRadius: '4px'
                        }}>
                          PtA: {(quest.ptaScore * 100).toFixed(0)}% / {(quest.minIntent * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: SECTOR_COLORS[quest.primarySector] || '#007AFF'
                  }}>
                    {Math.round(quest.matchScore * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>Loading enhanced profile...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Analyzing your interests across 120+ categories</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => setCurrentView('main')}
        style={{
          padding: '5px 10px',
          marginBottom: '20px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Back to Main
      </button>
      
      {/* Header Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Pages Analyzed', value: metrics?.totalPages || 0, color: '#007AFF' },
          { label: 'High Intent Pages', value: metrics?.highIntentPages || 0, color: '#FF3B30' },
          { label: 'Active Categories', value: Object.keys(profile?.tagCounts || {}).length, color: '#34C759' },
          { label: 'Avg PtA Score', value: `${((metrics?.avgPta || 0) * 100).toFixed(0)}%`, color: '#FF9500' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            border: '1px solid #E5E5EA',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* PtA Gauge */}
      {renderPtAGauge()}

      {/* Tag Heatmap */}
      {renderTagHeatmap()}

      {/* Quest Matches */}
      {renderQuestMatches()}

      {/* Privacy Notice */}
      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: '#F5F5F7',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        🔒 All interest data is processed locally. Only privacy-preserving hashes are stored.
        <br />
        Commitment: {profile?.exportData?.commitment?.substring(0, 16)}...
      </div>
    </div>
  );
}