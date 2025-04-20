import React from 'react';

export default function QuestCard({ quest, handleAcceptSponsoredQuest, completedQuestIds }) {
  // Proper completed check using completedQuestIds
  const isCompleted = completedQuestIds && (
    completedQuestIds.has(quest.id) || 
    Array.from(completedQuestIds).some(item => 
      typeof item === 'object' && item.id === quest.id
    )
  );
  
  // Format badge icons for display
  const badgeIconDisplay = quest.badgeIcon || '🏆';
  
  // Determine quest background color based on type
  const questTypeColors = {
    educational: { bg: '#e3f2fd', border: '#bbdefb', icon: '📚' },
    challenge: { bg: '#fff3e0', border: '#ffe0b2', icon: '🏆' },
    survey: { bg: '#e8f5e9', border: '#c8e6c9', icon: '📝' },
    content_creation: { bg: '#f3e5f5', border: '#e1bee7', icon: '🎨' },
    default: { bg: '#f5f5f5', border: '#e0e0e0', icon: '✨' }
  };
  
  const typeStyle = questTypeColors[quest.type] || questTypeColors.default;
  
  return (
    <div
      style={{
        border: `1px solid ${typeStyle.border}`,
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: isCompleted ? '#f9f9f9' : typeStyle.bg,
        position: 'relative',
        opacity: isCompleted ? 0.85 : 1,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      {/* Type Badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          backgroundColor: isCompleted ? '#9e9e9e' : '#757575',
          color: 'white',
          fontSize: '0.7rem',
          padding: '3px 8px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>{typeStyle.icon}</span>
        <span>{quest.type?.replace('_', ' ') || 'Quest'}</span>
      </div>
      
      {/* Completion Status Badge */}
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: '#4caf50',
            color: 'white',
            fontSize: '0.7rem',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 'bold'
          }}
        >
          <span>✓</span>
          <span>Completed</span>
        </div>
      )}
      
      {/* Locked Status Badge */}
      {quest.isLocked && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: '#f44336',
            color: 'white',
            fontSize: '0.7rem',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 'bold'
          }}
        >
          <span>🔒</span>
          <span>Locked</span>
        </div>
      )}
      
      {/* Badge Icon */}
      <div style={{ marginBottom: '16px', fontSize: '2rem', textAlign: 'center' }}>
        {badgeIconDisplay}
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{quest.title}</h3>
      
      {/* Sponsor */}
      <p style={{ 
        margin: '0 0 12px 0', 
        fontSize: '0.8rem', 
        color: '#757575',
        fontStyle: 'italic'
      }}>
        By {quest.sponsor}
      </p>
      
      {/* Description */}
      <p style={{ 
        margin: '0 0 16px 0', 
        fontSize: '0.9rem',
        color: '#424242',
        lineHeight: '1.4'
      }}>
        {quest.description}
      </p>
      
      {/* Reward */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '1rem' }}>🎁</span>
        <span style={{ 
          fontSize: '0.9rem',
          fontWeight: 'bold',
          color: '#333'
        }}>
          {quest.rewardText || "Reward: " + badgeIconDisplay + " Badge + ADR"}
        </span>
      </div>
      
      {/* Keywords */}
      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '16px'
      }}>
        {quest.keywords?.slice(0, 4).map((keyword, index) => (
          <span key={index} style={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: '#616161'
          }}>
            {keyword}
          </span>
        ))}
        {quest.keywords?.length > 4 && (
          <span style={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: '#616161'
          }}>
            +{quest.keywords.length - 4} more
          </span>
        )}
      </div>
      
      {/* Action Button */}
      <button
        onClick={() => handleAcceptSponsoredQuest(quest)}
        disabled={isCompleted || quest.isLocked}
        style={{
          width: '100%',
          padding: '10px',
          background: isCompleted || quest.isLocked 
            ? '#bdbdbd' 
            : 'linear-gradient(135deg, #6050dc 0%, #8070fa 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isCompleted || quest.isLocked ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isCompleted || quest.isLocked 
            ? 'none' 
            : '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {isCompleted ? (
          <>
            <span>✓</span>
            <span>Already Completed</span>
          </>
        ) : quest.isLocked ? (
          <>
            <span>🔒</span>
            <span>Prerequisites Required</span>
          </>
        ) : (
          <>
            <span>▶️</span>
            <span>Start Quest</span>
          </>
        )}
      </button>
    </div>
  );
}