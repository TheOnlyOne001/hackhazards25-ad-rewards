// src/popup/components/ViewRouter.jsx
import React, { useState } from 'react';
import QuestCard from './QuestCard'; // Make sure this import exists

export default function ViewRouter({
  currentView,
  setCurrentView,
  tierName,
  rewardMultiplier,
  badgeCount,
  personaKeywords,
  handleMarkForDeletion,
  handleUndoDeletion,
  handleSaveChanges,
  editedKeywords,
  keywordsToDelete,
  displayedQuests,
  handleAcceptSponsoredQuest,
  handleAcceptSurveyQuest,  // Add this missing prop
  currentSurvey,
  currentQuestionIndex,
  userAnswer,
  setUserAnswer,
  handleNextQuestion,
  handleFinishSurvey,
  isNextButtonEnabled,
  showVerificationUI,
  verificationTimer,
  currentVerificationMCQ,
  handleSubmitVerification,
  isLoadingQuest,
  handleStartQuest,
  goToPersonaPortal,
  questFeedback,
  handleRewardClick,
  refetch,
  activeQuestForVerification,
  handleStartVerification,
  userVerificationAnswer,
  setUserVerificationAnswer,
  verificationResult,
  currentPoll,
  handleSubmitAnswer,
  ownedBadges,
  badgeCountsByType,
  showCompletedQuests,
  setShowCompletedQuests,
  completedQuestIds,
  questBadgeContractAddress,
  MOCK_SPONSORED_QUESTS,
  GENERIC_BADGE_ICON,
  GENERIC_BADGE_NAME,
  GENERIC_BADGE_DESC,
  GENERIC_SURVEY_BADGE_URI,
  handleTestStellarSync,
  userStellarPublicKey,
  stellarPkInput,
  setStellarPkInput,
  handleSaveStellarKey,
  handleSyncToStellar,
  isSyncingStellar,
  latestStellarTxHash,
  stellarHhBadgeBalance,
  personaHistory = [],
  refreshPersonaHistory,
  surveyChapters,
  currentChapterIndex,
  chapterIntroShown,
  handleChapterNavigation
}) {
  // Add missing state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [questTypeFilter, setQuestTypeFilter] = useState('all');
  const [isLoadingQuests, setIsLoadingQuests] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  
  // Calculate filtered quests based on search query and type filter
  const filteredQuests = React.useMemo(() => {
    if (showCompletedQuests) {
      // Return completed quests
      return Array.from(completedQuestIds).map(item => {
        // Find the quest object matching this ID
        const questId = typeof item === 'object' ? item.id : item;
        return MOCK_SPONSORED_QUESTS.find(q => q.id === questId);
      }).filter(Boolean); // Filter out any undefined values
    } else {
      // Return available quests filtered by search and type
      return displayedQuests.filter(quest => {
        // Apply type filter
        if (questTypeFilter !== 'all' && quest.type !== questTypeFilter) {
          return false;
        }
        
        // Apply search filter if search query exists
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return (
            quest.title?.toLowerCase().includes(searchLower) ||
            quest.sponsor?.toLowerCase().includes(searchLower) ||
            quest.keywords?.some(k => k.toLowerCase().includes(searchLower))
          );
        }
        
        return true;
      });
    }
  }, [displayedQuests, searchQuery, questTypeFilter, showCompletedQuests, completedQuestIds, MOCK_SPONSORED_QUESTS]);
  
  return (
    <>
      {currentView === 'main' ? (
        <>
          {/* Conditionally render either verification button or standard buttons */}
          {activeQuestForVerification && activeQuestForVerification.status === 'ready_to_verify' ? (
            // Quest is ready to verify - show verification UI
            <div
              style={{
                border: '1px solid #ff9800',
                padding: '15px',
                marginTop: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '4px'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                Quest Ready to Verify
              </h3>
              <p>
                You've completed: <strong>{activeQuestForVerification.questTitle}</strong>
              </p>
              <p style={{ fontSize: '0.9em' }}>
                Click below to verify your completion and receive your rewards.
              </p>
              <button
                onClick={handleStartVerification}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginTop: '10px'
                }}
              >
                Mark as Done & Verify
              </button>
            </div>
          ) : (
            // Standard action buttons
            <>
              <button
                onClick={handleStartQuest}
                disabled={isLoadingQuest}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}
              >
                Start Crypto Quest!
              </button>
              <button
                onClick={() => setCurrentView('tier')}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}
              >
                View Tier Progress
              </button>
              <button
                onClick={goToPersonaPortal}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}
              >
                Manage Persona
              </button>
              <button
                onClick={() => setCurrentView('marketplace')}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}
              >
                Quest Marketplace
              </button>
              <button
                onClick={() => setCurrentView('badges')}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}
              >
                My Badges
              </button>
              {/* Add this button after your other main view buttons */}
              <button
                onClick={handleTestStellarSync}
                style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px', backgroundColor: '#6050dc', color: 'white' }}
              >
                Test Stellar Sync
              </button>
            </>
          )}

          {/* Stellar account linking section */}
          <div style={{ 
            border: '1px solid #6050dc', 
            borderRadius: '4px',
            padding: '15px',
            marginTop: '15px',
            backgroundColor: '#f8f5ff'
          }}>
            <h3 style={{ marginTop: 0, color: '#6050dc' }}>Link Stellar Account (Testnet)</h3>
            
            {userStellarPublicKey ? (
              <>
                <p>
                  <strong>Linked Account:</strong> 
                  <span style={{ 
                    fontFamily: 'monospace',
                    backgroundColor: '#e6e6ff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginLeft: '8px'
                  }}>
                    {userStellarPublicKey.substr(0, 4)}...{userStellarPublicKey.substr(-4)}
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(userStellarPublicKey);
                      setQuestFeedback('Key copied to clipboard!');
                      setTimeout(() => setQuestFeedback(''), 1500);
                    }}
                    style={{ 
                      marginLeft: '8px', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      color: '#6050dc'
                    }}
                    title="Copy full key to clipboard"
                  >
                    📋
                  </button>
                </p>
                
                {/* --------- STELLAR SYNC STATUS --------- */}
                {stellarHhBadgeBalance !== 'Loading...' &&
                 stellarHhBadgeBalance !== 'Error' &&
                 !isNaN(Number(stellarHhBadgeBalance)) && (
                  <>
                    {/* ONLY show the YELLOW bar when balances differ */}
                    {Number(stellarHhBadgeBalance) !== badgeCount && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#fff3e0',
                          color: '#e65100',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          marginTop: '10px',
                          marginBottom: '10px',
                          fontSize: '0.9em'
                        }}
                      >
                        <span>ℹ️</span>
                        <span>
                          {Number(stellarHhBadgeBalance) < badgeCount ? 
                            `You need to sync your ${badgeCount - Number(stellarHhBadgeBalance)} new badges to Stellar.` :
                            `Your Stellar account has ${stellarHhBadgeBalance} badges, but your Base account has ${badgeCount} badges.`
                          }
                        </span>
                      </div>
                    )}

                    {/* ONLY show the GREEN bar when balances match */}
                    {Number(stellarHhBadgeBalance) === badgeCount && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: '#e8f5e9',
                          color: '#2e7d32',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          marginTop: '10px',
                          marginBottom: '10px',
                          fontSize: '0.9em'
                        }}
                      >
                        <span>✓</span>
                        <span>
                          Your Stellar account is in sync with your Base achievements ({badgeCount} badges).
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Display prominent feedback when syncing completes with transaction link */}
                {questFeedback && questFeedback.includes('Success! Synced') && (
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    marginTop: '10px',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✅</span> {questFeedback}
                    </div>
                    {/* Use the full transaction hash passed as a prop */}
                    {latestStellarTxHash && (
                      <a
                        href={`https://testnet.lumenscan.io/txns/${latestStellarTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#1565c0',
                          textDecoration: 'none',
                          fontSize: '0.9em',
                          display: 'flex',
                          alignItems: 'center',
                          width: 'fit-content',
                          marginTop: '4px'
                        }}
                      >
                        <span style={{ marginRight: '4px' }}>🔍</span> View Transaction on Lumenscan
                      </a>
                    )}
                  </div>
                )}
                
                {/* Show "Already up-to-date" feedback */}
                {questFeedback && questFeedback.includes('already up-to-date') && (
                  <div style={{
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    marginTop: '10px',
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✅</span> {questFeedback}
                  </div>
                )}
                
                <button
                  onClick={handleSyncToStellar}
                  disabled={isSyncingStellar || Number(stellarHhBadgeBalance) === badgeCount}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: Number(stellarHhBadgeBalance) === badgeCount ? '#a5d6a7' : '#6050dc', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSyncingStellar || Number(stellarHhBadgeBalance) === badgeCount ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isSyncingStellar || Number(stellarHhBadgeBalance) === badgeCount ? 0.7 : 1
                  }}
                >
                  <span>{isSyncingStellar ? '🔄' : Number(stellarHhBadgeBalance) === badgeCount ? '✓' : '🌟'}</span> 
                  {isSyncingStellar ? 'Syncing...' : Number(stellarHhBadgeBalance) === badgeCount ? 'Already In Sync' : 'Sync Achievements to Stellar'}
                </button>
              </>
            ) : (
              <>
                <p>Connect your Stellar account to sync your achievements as assets on the Stellar blockchain.</p>
                <div style={{ display: 'flex', marginTop: '10px' }}>
                  <input
                    type="text"
                    value={stellarPkInput}
                    onChange={(e) => setStellarPkInput(e.target.value)}
                    placeholder="Your Stellar Public Key (Testnet)"
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <button
                    onClick={handleSaveStellarKey}
                    style={{ 
                      marginLeft: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#6050dc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Save Key
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Keep existing quest-in-progress UI separate */}
          {activeQuestForVerification && !showVerificationUI && activeQuestForVerification.status !== 'ready_to_verify' && (
            <div
              style={{
                border: '1px solid #ff9800',
                padding: '15px',
                marginTop: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '4px'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                Quest in Progress
              </h3>
              <p>
                Waiting for verification for:{' '}
                <strong>{activeQuestForVerification.questTitle}</strong>
              </p>
              <p style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
                Complete the quest in the opened tab, then return here to verify your
                completion.
              </p>
              <button
                onClick={handleStartVerification}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginTop: '10px'
                }}
              >
                Ready to Verify Completion
              </button>
            </div>
          )}

          {/* Keep all the existing survey/poll/verification UI components unchanged */}
          {currentSurvey && currentQuestionIndex < currentSurvey.length && (
            <div style={{ border: '1px solid green', padding: '10px', marginTop: '15px' }}>
              {/* Enhanced progress bar with proper sequential numbering */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '5px' 
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Question {currentQuestionIndex + 1} of {currentSurvey.length}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4caf50' }}>
                    {Math.round((currentQuestionIndex / Math.max(1, currentSurvey.length - 1)) * 100)}% Complete
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${(currentQuestionIndex / Math.max(1, currentSurvey.length - 1)) * 100}%`, 
                    height: '100%', 
                    backgroundColor: '#4caf50',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
              
              {/* Display Question number sequentially rather than using API q_id */}
              <h3>Survey Question {currentQuestionIndex + 1}</h3>
              <p>{currentSurvey[currentQuestionIndex].question}</p>
              <div>
                {Object.entries(
                  currentSurvey[currentQuestionIndex].options || {}
                ).map(([key, val]) => (
                  <label key={key} style={{ display: 'block', margin: '4px 0' }}>
                    <input
                      type="radio"
                      name="survey"
                      value={key}
                      checked={userAnswer === key}
                      onChange={e => setUserAnswer(e.target.value)}
                    />{' '}
                    {val}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '10px' }}>
                {currentQuestionIndex < currentSurvey.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    disabled={!isNextButtonEnabled || !userAnswer}
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleFinishSurvey}
                    disabled={!isNextButtonEnabled || !userAnswer}
                  >
                    Finish Survey
                  </button>
                )}
              </div>
              {questFeedback && (
                <p style={{ marginTop: '5px', color: questFeedback.startsWith('Thanks') ? 'green' : 'red' }}>
                  {questFeedback}
                </p>
              )}
            </div>
          )}

          {currentPoll && !currentSurvey && (
            <div style={{ border: '1px solid blue', padding: '10px', marginTop: '15px' }}>
              <h3>Crypto Quest!</h3>
              <p>{currentPoll.question}</p>
              {currentPoll.options ? (
                <div>
                  {Object.entries(currentPoll.options).map(([key, val]) => (
                    <div key={key}>
                      <input
                        type="radio"
                        id={`poll_option_${key}`}
                        name="pollAnswer"
                        value={key}
                        checked={userAnswer === key}
                        onChange={e => setUserAnswer(e.target.value)}
                      />
                      <label htmlFor={`poll_option_${key}`}>
                        {key}: {val}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No options available.</p>
              )}
              <button onClick={handleSubmitAnswer} style={{ marginTop: '10px' }}>
                Submit Answer
              </button>
              {questFeedback && (
                <p style={{ marginTop: '5px', color: questFeedback.startsWith('Thanks') ? 'green' : 'red' }}>
                  {questFeedback}
                </p>
              )}
            </div>
          )}

          {showVerificationUI && currentVerificationMCQ && (
            <div
              style={{
                border: '1px solid #1976d2',
                padding: '15px',
                marginTop: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px'
              }}
            >
              {console.log("ViewRouter: Rendering Verification UI. MCQ Data:", currentVerificationMCQ)}
              
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <h3 style={{ margin: 0 }}>Quest Verification</h3>
                <div
                  style={{
                    backgroundColor: verificationTimer <= 10 ? '#f44336' : '#1976d2',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Time: {verificationTimer}s
                </div>
              </div>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                {currentVerificationMCQ.question}
              </p>
              <div style={{ marginBottom: '15px' }}>
                {Object.entries(currentVerificationMCQ.options).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: '8px' }}>
                    <input
                      type="radio"
                      id={`verification_option_${key}`}
                      name="verificationAnswer"
                      value={key}
                      checked={userVerificationAnswer === key}
                      onChange={e => setUserVerificationAnswer(e.target.value)}
                      disabled={verificationResult !== 'pending'}
                    />
                    <label
                      htmlFor={`verification_option_${key}`}
                      style={{
                        marginLeft: '8px',
                        color:
                          verificationResult === 'passed' && key === currentVerificationMCQ.correctAnswer
                            ? '#4caf50'
                            : verificationResult === 'failed_answer' && key === userVerificationAnswer
                            ? '#f44336'
                            : 'inherit'
                      }}
                    >
                      {key}: {val}
                    </label>
                  </div>
                ))}
              </div>
              {verificationResult === 'pending' ? (
                <button
                  onClick={handleSubmitVerification}
                  disabled={!userVerificationAnswer || verificationTimer <= 0}
                  style={{
                    backgroundColor: !userVerificationAnswer ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: userVerificationAnswer ? 'pointer' : 'not-allowed'
                  }}
                >
                  Submit Answer
                </button>
              ) : (
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: verificationResult === 'passed' ? '#e8f5e9' : '#ffebee',
                    borderRadius: '4px',
                    borderLeft: `4px solid ${
                      verificationResult === 'passed' ? '#4caf50' : '#f44336'
                    }`
                  }}
                >
                  {verificationResult === 'passed' && (
                    <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold' }}>
                      ✅ Verification passed! Reward granted.
                    </p>
                  )}
                  {verificationResult === 'failed_answer' && (
                    <p style={{ margin: 0, color: '#c62828', fontWeight: 'bold' }}>
                      ❌ Incorrect answer. The correct answer was:{' '}
                      {currentVerificationMCQ.correctAnswer}
                    </p>
                  )}
                  {verificationResult === 'failed_timeout' && (
                    <p style={{ margin: 0, color: '#c62828', fontWeight: 'bold' }}>
                      ⏱️ Time's up! You didn't answer in time.
                    </p>
                  )}
                </div>
              )}
              {questFeedback && (
                <p style={{ marginTop: '10px', color: questFeedback.includes('passed') ? 'green' : 'red' }}>
                  {questFeedback}
                </p>
              )}
            </div>
          )}

          {currentView === 'main' && currentSurvey && surveyChapters.length > 0 && (
            <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '16px', marginTop: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              {!chapterIntroShown ? (
                // Show the chapter intro/hook
                <div>
                  <h3 style={{ color: '#333', marginTop: 0 }}>
                    Chapter {surveyChapters[currentChapterIndex]?.chapter_id}
                  </h3>
                  <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {surveyChapters[currentChapterIndex]?.intro}
                  </p>
                  <button 
                    onClick={() => handleChapterNavigation('START_CHAPTER')}
                    style={{
                      backgroundColor: '#6050dc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Start Chapter
                  </button>
                </div>
              ) : (
                (() => {
                  const chapter = surveyChapters[currentChapterIndex];
                  if (!chapter || !chapter.questions || !chapter.questions[currentQuestionIndex]) {
                    return <p>Loading question...</p>;
                  }
                  
                  const question = chapter.questions[currentQuestionIndex];
                  // Detect if this is a branching question by looking for "Dive deeper" in options
                  const isBranch = Object.values(question.options || {})
                    .some(text => text?.includes('Dive deeper'));

                  // Add progress indicators
                  const totalChapters = surveyChapters.length;
                  const totalQuestionsInCurrentChapter = chapter.questions.length;
                  const currentChapterProgress = (currentQuestionIndex / (totalQuestionsInCurrentChapter - 1)) * 100;
                  
                  // Calculate overall progress
                  const questionsPerChapter = surveyChapters.map(ch => ch.questions.length);
                  const totalQuestions = questionsPerChapter.reduce((sum, count) => sum + count, 0);
                  const questionsDoneInPreviousChapters = questionsPerChapter
                    .slice(0, currentChapterIndex)
                    .reduce((sum, count) => sum + count, 0);
                  const overallProgress = ((questionsDoneInPreviousChapters + currentQuestionIndex) / (totalQuestions - 1)) * 100;

                  return (
                    <div>
                      {/* Chapter progress indicator */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '5px' 
                        }}>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            Chapter {chapter.chapter_id}/{totalChapters}, Question {currentQuestionIndex + 1}/{totalQuestionsInCurrentChapter}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6050dc' }}>
                            {Math.round(overallProgress)}% Complete
                          </span>
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '6px', 
                          backgroundColor: '#f0f0f0', 
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${overallProgress}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #6050dc 0%, #8070fa 100%)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                      
                      <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 8px 0' }}>
                        Chapter {chapter.chapter_id}, Question {currentQuestionIndex + 1} of {chapter.questions.length}
                      </p>
                      <p style={{ fontWeight: 'bold', fontSize: '1rem', margin: '0 0 16px 0' }}>
                        {question.text}
                      </p>
                      
                      <div style={{ marginBottom: '20px' }}>
                        {Object.entries(question.options || {}).map(([key, text]) => (
                          <label 
                            key={key} 
                            style={{ 
                              display: 'block', 
                              margin: '8px 0',
                              padding: '10px',
                              border: userAnswer === key ? '1px solid #6050dc' : '1px solid #e0e0e0',
                              borderRadius: '6px',
                              backgroundColor: userAnswer === key ? '#f0f0ff' : '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="radio"
                              name="surveyQuestion"
                              value={key}
                              checked={userAnswer === key}
                              onChange={e => setUserAnswer(e.target.value)}
                              style={{ marginRight: '8px' }}
                            />
                            {text}
                          </label>
                        ))}
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        {isBranch ? (
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              disabled={!userAnswer}
                              onClick={() => handleChapterNavigation('BRANCH', 'dive')}
                              style={{
                                backgroundColor: !userAnswer ? '#e0e0e0' : '#6050dc',
                                color: !userAnswer ? '#999' : 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '8px 16px',
                                cursor: !userAnswer ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              Dive Deeper
                            </button>
                            <button
                              onClick={() => handleChapterNavigation('BRANCH', 'skip')}
                              style={{
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '8px 16px',
                                cursor: 'pointer'
                              }}
                            >
                              Skip Ahead
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!userAnswer}
                            onClick={() => handleChapterNavigation('NEXT_QUESTION')}
                            style={{
                              backgroundColor: !userAnswer ? '#e0e0e0' : '#6050dc',
                              color: !userAnswer ? '#999' : 'white', 
                              border: 'none',
                              borderRadius: '4px',
                              padding: '8px 16px',
                              cursor: !userAnswer ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            {currentQuestionIndex < chapter.questions.length - 1 ? 'Next Question' : 
                             currentChapterIndex < surveyChapters.length - 1 ? 'Next Chapter' : 'Finish Survey'}
                          </button>
                        )}
                      </div>
                      
                      {chapter.outro && currentQuestionIndex === chapter.questions.length - 1 && (
                        <div style={{ 
                          marginTop: '20px', 
                          padding: '12px', 
                          backgroundColor: '#f9f9f9', 
                          borderLeft: '3px solid #6050dc',
                          fontStyle: 'italic',
                          color: '#555'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{chapter.outro}</p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </>
      ) : currentView === 'tier' ? (
        <>
          <h2>Tier Progress</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isLoadingBadgeCount ? '...' : badgeCount}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#2e7d32' }}>
              {tierName} ({rewardMultiplier}x)
            </span>
          </div>
          <p>All Tiers:</p>
          <ul>
            <li>Bronze: 0 Badges (1x)</li>
            <li>Silver: 1-2 Badges (1.5x)</li>
            <li>Gold: 3-4 Badges (2x)</li>
            <li>Master: 5-9 Badges (2.5x)</li>
            <li>Grandmaster: 10+ Badges (3x)</li>
          </ul>
          <button onClick={() => setCurrentView('main')} style={{ marginTop: '15px', padding: '5px 10px' }}>
            &lt; Back to Main
          </button>
        </>
      ) : currentView === 'persona' ? (
        <>
          <h2>Persona Portal</h2>
          
          {/* Fix the refresh button handler */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p>Your browsing analysis history:</p>
            <button 
              onClick={() => {
                chrome.storage.local.get(['personaAnalysisHistory'], (result) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error reading persona history:", chrome.runtime.lastError);
                  } else {
                    const history = result['personaAnalysisHistory'] || [];
                    if (Array.isArray(history)) {
                      // Use the refreshPersonaHistory prop function
                      refreshPersonaHistory(history);
                    }
                  }
                });
              }}
              style={{ 
                padding: '4px 8px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <span>🔄</span> Refresh
            </button>
          </div>
          
          {/* Persona History Section */}
          <p>Your browsing analysis history:</p>

          {/* Use the state directly from component scope */}
          {personaHistory.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Recent Page Analyses:</h3>
              {personaHistory.map((session, index) => {
                // Format the date from timestamp
                const sessionDate = new Date(session.timestamp);
                const dateFormatted = `${sessionDate.toLocaleDateString()} ${sessionDate.toLocaleTimeString()}`;
                
                // Get display keywords as a string
                const displayKeywords = Array.isArray(session.display) && session.display.length > 0
                  ? session.display.join(', ')
                  : 'No keywords';
                
                const isExpanded = expandedSessionId === index;
                
                return (
                  <div key={index}>
                    <div 
                      onClick={() => setExpandedSessionId(isExpanded ? null : index)}
                      style={{
                        padding: '8px 12px',
                        margin: '5px 0',
                        backgroundColor: isExpanded ? '#e0f2f1' : '#f5f5f5',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderLeft: isExpanded ? '3px solid #26a69a' : '3px solid transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {session.title ? (
                            session.title.length > 40 ? 
                              `${session.title.substring(0, 40)}...` : 
                              session.title
                          ) : 'Untitled Page'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#757575', marginTop: '4px' }}>
                          <span>{dateFormatted}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>{displayKeywords}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#757575' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                    
                    {/* Expanded view for session details */}
                    {isExpanded && (
                      <div style={{ 
                        padding: '12px 16px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '0 0 4px 4px',
                        marginBottom: '10px',
                        borderLeft: '3px solid #26a69a'
                      }}>
                        {/* URL Section */}
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '13px', color: '#757575', margin: '0 0 4px 0' }}>URL:</p>
                          <a 
                            href={session.url} 
                            target="_blank"
                            rel="noopener noreferrer" 
                            style={{ 
                              fontSize: '13px', 
                              color: '#0277bd', 
                              textDecoration: 'none',
                              wordBreak: 'break-all' 
                            }}
                          >
                            {session.url}
                          </a>
                        </div>
                        
                        {/* Display Keywords Section */}
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '13px', color: '#757575', margin: '0 0 4px 0' }}>Main Topics:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Array.isArray(session.display) && session.display.length > 0 ? (
                              session.display.map((keyword, idx) => (
                                <div 
                                  key={idx}
                                  style={{
                                    background: '#26a69a',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {keyword}
                                </div>
                              ))
                            ) : (
                              <span style={{ color: '#9e9e9e', fontStyle: 'italic' }}>None found</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Detailed Keywords Section */}
                        <div>
                          <p style={{ fontSize: '13px', color: '#757575', margin: '0 0 4px 0' }}>Detailed Keywords:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Array.isArray(session.detailed) && session.detailed.length > 0 ? (
                              session.detailed.map((keyword, idx) => {
                                const detailedKeyword = keyword.toLowerCase().trim();
                                const isMarked = keywordsToDelete.has(detailedKeyword);
                                const isInEditedList = editedKeywords.includes(detailedKeyword);
                                
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      background: isMarked ? '#ffebee' : '#eee',
                                      padding: '3px 8px',
                                      borderRadius: '3px',
                                      textDecoration: isMarked ? 'line-through' : 'none',
                                      color: isMarked ? '#b71c1c' : isInEditedList ? 'black' : '#757575',
                                      border: isInEditedList ? '1px solid #bdbdbd' : '1px solid transparent'
                                    }}
                                  >
                                    <span style={{ marginRight: '5px' }}>{detailedKeyword}</span>
                                    
                                    {isMarked ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUndoDeletion(detailedKeyword);
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#1976d2',
                                          cursor: 'pointer',
                                          padding: '0 0 0 5px',
                                          fontSize: '14px'
                                        }}
                                        title={`Restore "${detailedKeyword}"`}
                                      >
                                        ↩
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkForDeletion(detailedKeyword);
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#757575',
                                          cursor: 'pointer',
                                          padding: '0 0 0 5px',
                                          fontSize: '14px'
                                        }}
                                        title={`Remove "${detailedKeyword}"`}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ color: '#9e9e9e', fontStyle: 'italic' }}>None found</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#757575'
            }}>
              No analysis history yet. Analyze pages to build your profile!
            </div>
          )}
          
          <div style={{ 
            marginTop: '20px',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '15px' 
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Keyword Management:</h3>
            
            {editedKeywords.length > 0 ? (
              <>
                <p style={{ fontSize: '14px', color: '#757575', marginBottom: '10px' }}>
                  Use the controls above to mark keywords for deletion, then save your changes:
                </p>
                <p style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <b>{keywordsToDelete.size}</b> keywords marked for deletion
                </p>
              </>
            ) : (
              <p style={{ color: '#9e9e9e', fontStyle: 'italic' }}>No keywords available for management.</p>
            )}
            
            <button 
              onClick={handleSaveChanges} 
              style={{ 
                padding: '8px 16px', 
                marginRight: '10px',
                backgroundColor: keywordsToDelete.size > 0 ? '#f44336' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {keywordsToDelete.size > 0 ? `Delete ${keywordsToDelete.size} Keywords` : 'Save Changes'}
            </button>
            
            <button 
              onClick={() => setCurrentView('main')} 
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : currentView === 'marketplace' ? (
        <>
          <h2>Quest Marketplace</h2>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>
                <strong>{showCompletedQuests ? completedQuestIds.size : displayedQuests.length}</strong>{' '}
                {showCompletedQuests ? 'completed quests' : 'quests available'}
              </span>
              <label>
                <input
                  type="checkbox"
                  checked={showCompletedQuests}
                  onChange={() => setShowCompletedQuests(prev => !prev)}
                />
                Show completed quests
              </label>
            </div>
            
            {/* Add filtering options */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {['all', 'educational', 'challenge', 'survey', 'content_creation'].map(type => (
                <button
                  key={type}
                  onClick={() => setQuestTypeFilter(type)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: questTypeFilter === type ? '#1976d2' : '#f5f5f5',
                    color: questTypeFilter === type ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Add a search input at the top */}
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search quests by title, sponsor or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {console.log("ViewRouter: Rendering marketplace, displayedQuests:", displayedQuests)}
          {console.log("ViewRouter: completedQuestIds:", Array.from(completedQuestIds))}
          {console.log("ViewRouter: showCompletedQuests:", showCompletedQuests)}

          {isLoadingQuests ? (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '15px' }}>⏳</div>
              <p>Loading available quests...</p>
            </div>
          ) : filteredQuests.length === 0 ? (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '15px' }}>🔍</div>
              <p>
                {searchQuery ? "No quests match your search" : 
                 showCompletedQuests ? "You haven't completed any quests yet!" : 
                 "No quests available that match your profile."}
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    marginTop: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Map through and render quest cards here */}
              {filteredQuests.map(quest => {
                // Create the handler directly inline to avoid any possible name conflicts
                const handleQuestStart = () => {
                  if (quest.type === 'survey') {
                    handleAcceptSurveyQuest(quest);
                  } else {
                    handleAcceptSponsoredQuest(quest);
                  }
                };

                return (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onAccept={handleQuestStart}
                    completedQuestIds={completedQuestIds}
                  />
                );
              })}
            </div>
          )}

          <button onClick={() => setCurrentView('main')} style={{ marginTop: '15px', padding: '5px 10px' }}>
            &lt; Back
          </button>
        </>
      ) : currentView === 'badges' ? (
        <div style={{ padding: '20px' }}>
          <h2>My Earned Badges</h2>
          <button onClick={() => setCurrentView('main')} style={{ padding: '5px 10px', marginBottom: '15px' }}>
            &lt; Back
          </button>

          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #e9ecef'
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Badge Stats by Category:</h4>
            {Object.keys(badgeCountsByType).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.entries(badgeCountsByType).map(([type, count]) =>
                  count > 0 ? (
                    <div
                      key={type}
                      style={{
                        backgroundColor: {
                          educational: '#4285F4',
                          challenge: '#EA4335',
                          feedback: '#34A853',
                          career: '#FBBC05',
                          wellness: '#8E44AD',
                          survey: '#2CA0C9',
                          unknown: '#95A5A6'
                        }[type] || '#95A5A6',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                      <span
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <p style={{ color: '#6c757d', fontStyle: 'italic', margin: 0 }}>No badges earned yet</p>
            )}
          </div>

          {ownedBadges.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {/* Survey badges */}
              {ownedBadges.filter(b => b.uri === GENERIC_SURVEY_BADGE_URI).length > 0 && (
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '10px 0',
                    border: '1px solid #ddd',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    padding: '10px'
                  }}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{GENERIC_BADGE_ICON}</span>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{GENERIC_BADGE_NAME}</div>
                    <div style={{ fontSize: '0.9em', color: '#555' }}>{GENERIC_BADGE_DESC}</div>
                    <div
                      style={{
                        fontSize: '0.9em',
                        color: '#555',
                        backgroundColor: '#e0e0e0',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        display: 'inline-block',
                        marginTop: '4px'
                      }}
                    >
                      Count: {ownedBadges.filter(b => b.uri === GENERIC_SURVEY_BADGE_URI).length}
                    </div>
                  </div>
                </li>
              )}

              {/* Quest badges */}
              {ownedBadges
                .filter(b => b.uri !== GENERIC_SURVEY_BADGE_URI)
                .map(badge => {
                  const questDef = MOCK_SPONSORED_QUESTS.find(q => q.sbtMetadataURI === badge.uri) || {};
                  const icon = questDef.badgeIcon || '🏆';
                  const title = questDef.badgeName || 'Quest Badge';
                  const desc = questDef.badgeDescription || 'A badge earned by completing a quest';
                  const rarity = questDef.badgeRarity || 'Common';
                  const styleMap = {
                    Common: { border: '1px solid #b0bec5', background: 'linear-gradient(135deg,#eceff1 0%,#cfd8dc100%)' },
                    Uncommon: { border: '1px solid #81c784', background: 'linear-gradient(135deg,#e8f5e9 0%,#a5d6a7100%)' },
                    Rare: { border: '1px solid #64b5f6', background: 'linear-gradient(135deg,#e3f2fd 0%,#90caf9100%)' },
                    Epic: { border: '1px solid #ba68c8', background: 'linear-gradient(135deg,#f3e5f5 0%,#ce93d8100%)' },
                    Legendary: { border: '1px solid #ffd54f', background: 'linear-gradient(135deg,#fff8e1 0%,#ffecb3100%)', boxShadow: '0 0 10px rgba(255,213,79,0.5)' }
                  };
                  const cardStyle = styleMap[rarity] || styleMap.Common;
                  return (
                    <li
                      key={badge.id}
                      style={{
                        display: 'flex',
                        margin: '15px 0',
                        borderRadius: '8px',
                        padding: '12px',
                        ...cardStyle
                      }}
                    >
                      <div
                        style={{
                          fontSize: '2rem',
                          marginRight: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '50px',
                          height: '50px',
                          background: 'rgba(255,255,255,0.5)',
                          borderRadius: '50%',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px' }}>
                          {title}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#444', marginBottom: '8px' }}>
                          {desc}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8em', color: '#777' }}>ID: {badge.id}</span>
                          <span
                            style={{
                              fontSize: '0.75em',
                              fontWeight: 'bold',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              color: '#555'
                            }}
                          >
                            {rarity}
                          </span>
                        </div>
                        {questDef.sponsor && (
                          <div style={{ fontSize: '0.8em', color: '#777', marginTop: '5px', fontStyle: 'italic' }}>
                            Issued by: {questDef.sponsor}
                          </div>
                        )}
                        <div style={{ marginTop: '10px', textAlign: 'right' }}>
                          <a
                            href={`https://sepolia.basescan.org/nft/${questBadgeContractAddress}/${badge.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-block',
                              fontSize: '0.8em',
                              padding: '3px 8px',
                              backgroundColor: 'rgba(0,123,255,0.1)',
                              color: '#007bff',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              border: '1px solid rgba(0,123,255,0.2)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(0,123,255,0.2)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(0,123,255,0.1)';
                            }}
                          >
                            🔍 View on BaseScan
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <p>You haven't earned any badges yet! Complete quests to start your collection.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
