// src/ppopup/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Wallet } from '@coinbase/onchainkit/wallet';
import { useAccount, useBalance, useReadContract, useWriteContract, useDisconnect } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { formatUnits } from 'viem';
import QuestBadgeABI from '../../artifacts/contracts/QuestBadge.sol/QuestBadge.json';
import ViewRouter from './components/ViewRouter';
import mockQuestsData from './data/mockQuests.json';
const MOCK_SPONSORED_QUESTS = mockQuestsData.MOCK_SPONSORED_QUESTS;
const rewardTokenAddress = '0x6FDEAC95fe672E19a8759db03d6c24b25d9B8D92';
const questBadgeContractAddress = '0x4475F90A71cb504539Ce1118cC7d343dC65153E7';
const PERSONA_STORAGE_KEY = 'personaKeywordsList';
const OWNED_BADGES_STORAGE_KEY = 'ownedBadgeDetails';
const GENERIC_SURVEY_BADGE_URI = "ipfs://bafkreihq5jcwvqnqocc6nd3mpxvghzzsa5qn3e5jxtwluturunvdafsucu";
const GENERIC_BADGE_NAME = "Survey Contributor";
const GENERIC_BADGE_DESC = "Provided valuable feedback via survey.";
const GENERIC_BADGE_ICON = "📝";
const GENERIC_BADGE_RARITY = "Common";
const COMPLETED_QUESTS_STORAGE_KEY = 'completedQuestIds';
const SURVEY_HISTORY_KEY = 'surveyResponseHistory';
const ACTIVE_QUEST_STORAGE_KEY = 'activeQuestState';
const PERSONA_HISTORY_KEY = 'personaAnalysisHistory';
const SIMULATED_REWARDS_KEY = 'simulatedRewards'; // Add this near your other constants

// Add this at the top of your App() component, before any useState/useEffect calls:
function sendMessageToBg(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, res => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      if (res && res.error) return reject(new Error(res.error));
      resolve(res);
    });
  });
}

function App() {
  const { address, isConnected } = useAccount();

  // Navigation view state: 'main', 'tier', 'persona', 'marketplace', 'badges', 'interests'
  const [currentView, setCurrentView] = useState('main');
  
  // 1. Interval Ref
  const timerIntervalRef = useRef(null);

  const { data: balanceData, isLoading: isBalanceLoading, refetch } = useBalance({
    address,
    token: rewardTokenAddress,
    chainId: baseSepolia.id,
  });

  // Place this inside the App component scope, before the return statement
  

  // Basic states.
  const [badgeCount, setBadgeCount] = useState(0);
  const [ownedBadges, setOwnedBadges] = useState([]);

  // Quest (poll) data and analysis.
  const [currentPoll, setCurrentPoll] = useState(null);
  const [interestKeywords, setInterestKeywords] = useState('');

  // 1. New State Variables for multi-question survey
  const [currentSurvey, setCurrentSurvey] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [isNextButtonEnabled, setIsNextButtonEnabled] = useState(false);

  // Persona keywords state.
  const [personaKeywords, setPersonaKeywords] = useState([]);
  // Temporary states for managing persona keywords.
  const [editedKeywords, setEditedKeywords] = useState([]);
  const [keywordsToDelete, setKeywordsToDelete] = useState(new Set());

  // Other states.
  const [isLoadingQuest, setIsLoadingQuest] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [questFeedback, setQuestFeedback] = useState('');

  // Setup write contract hook for minting.
  const { data: mintHash, writeContract } = useWriteContract();

  // Add a new state to track completed quests
  const [completedQuestIds, setCompletedQuestIds] = useState(new Set());
  const [showCompletedQuests, setShowCompletedQuests] = useState(false);

  // Add these useState hooks along with your other state declarations in App.jsx
const [activeQuestForVerification, setActiveQuestForVerification] = useState(null);
const [showVerificationUI, setShowVerificationUI] = useState(false);
const [currentVerificationMCQ, setCurrentVerificationMCQ] = useState(null);
const [userVerificationAnswer, setUserVerificationAnswer] = useState('');
const [verificationTimer, setVerificationTimer] = useState(0);
const [verificationResult, setVerificationResult] = useState('pending');

// Add this state definition with your other state declarations in App.jsx
const [personaHistory, setPersonaHistory] = useState([]);

// Add this with your other state variables at the top of the App component
const [simulatedRewards, setSimulatedRewards] = useState(0);

// Add this near other hooks inside your App component
const { disconnect } = useDisconnect();

// Add these state variables after your other survey-related state declarations
const [surveyChapters, setSurveyChapters] = useState([]);  
const [currentChapterIndex, setCurrentChapterIndex] = useState(0);  
const [chapterIntroShown, setChapterIntroShown] = useState(false);  

// Inside your App() component, alongside other useState hooks:
const [isSurveyLoading, setIsSurveyLoading] = useState(false);

// Load persona keywords from storage.
useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([PERSONA_STORAGE_KEY], (result) => {
        if (!chrome.runtime.lastError && result[PERSONA_STORAGE_KEY]) {
          setPersonaKeywords(result[PERSONA_STORAGE_KEY]);
          console.log("Loaded persona keywords:", result[PERSONA_STORAGE_KEY]);
        } else if (chrome.runtime.lastError) {
          console.error("Error reading persona keywords:", chrome.runtime.lastError);
          setPersonaKeywords([]);
        } else {
          console.log("No persona keywords found in storage.");
          setPersonaKeywords([]);
        }
      });
    }
  }, []);

  // Load owned badges from storage
  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([OWNED_BADGES_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading owned badges:", chrome.runtime.lastError);
          setOwnedBadges([]); // default to an empty array on error
        } else {
          const savedBadges = result[OWNED_BADGES_STORAGE_KEY] || [];
          if (Array.isArray(savedBadges) && savedBadges.length > 0) {
            console.log("Owned badges loaded successfully:", savedBadges);
            setOwnedBadges(savedBadges);
          } else {
            console.log("No owned badges found. Defaulting to empty array.");
            setOwnedBadges([]);
          }
        }
      });
    } else {
      console.warn("chrome.storage.local is not available.");
      setOwnedBadges([]);
    }
  }, []);

  // Add this useEffect to load completed quests from storage
  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([COMPLETED_QUESTS_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading completed quests:", chrome.runtime.lastError);
        } else {
          const savedCompletedQuestIds = result[COMPLETED_QUESTS_STORAGE_KEY] || [];
          if (Array.isArray(savedCompletedQuestIds) && savedCompletedQuestIds.length > 0) {
            console.log("Loaded completed quests:", savedCompletedQuestIds);
            setCompletedQuestIds(new Set(savedCompletedQuestIds));
          }
        }
      });
    }
  }, []);

  // Add this useEffect near your other useEffect hooks to load active quest data on mount

useEffect(() => {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([ACTIVE_QUEST_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading active quest state:", chrome.runtime.lastError);
        return;
      }
      
      const savedQuestState = result[ACTIVE_QUEST_STORAGE_KEY];
      console.log("Checking for active quest state:", savedQuestState);
      
      if (savedQuestState) {
        // If there's an active quest, set it in state
        setActiveQuestForVerification(savedQuestState);
        console.log("Active quest loaded from storage:", savedQuestState.questTitle);
      }
    });
  }
}, []);

// Add this useEffect near your other storage-related useEffects
useEffect(() => {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([PERSONA_HISTORY_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error reading persona history:", chrome.runtime.lastError);
        setPersonaHistory([]);
      } else {
        const history = result[PERSONA_HISTORY_KEY] || [];
        if (Array.isArray(history)) {
          console.log("Loaded persona history with", history.length, "entries");
          setPersonaHistory(history);
        } else {
          console.warn("Invalid persona history format in storage");
          setPersonaHistory([]);
        }
      }
    });
  }
}, []);

  // 3. "Next/Finish" Button Timer Logic
  useEffect(() => {
    let timerId;
    if (userAnswer && currentSurvey) {
      // Disable the button initially and start a timer
      setIsNextButtonEnabled(false);
      timerId = setTimeout(() => {
        setIsNextButtonEnabled(true);
      }, 4000); // 4000ms delay; adjust between 3000-5000ms as needed
    } else {
      setIsNextButtonEnabled(false);
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [userAnswer, currentSurvey]);

  // Read the user's SBT badge count.
  const { data: fetchedBadgeCount, isLoading: isLoadingBadgeCount, error: badgeCountError, refetch: refetchBadgeCount } = useReadContract({
    address: questBadgeContractAddress,
    abi: QuestBadgeABI.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

  useEffect(() => {
    if (fetchedBadgeCount !== undefined && fetchedBadgeCount !== null) {
      try {
        const count = Number(fetchedBadgeCount);
        setBadgeCount(count);
        console.log("Fetched Badge Count:", count);
      } catch (e) {
        console.error("Error converting fetchedBadgeCount:", e);
        setBadgeCount(0);
      }
    }
    if (badgeCountError) {
      console.error("Error fetching badge count:", badgeCountError.message);
      setBadgeCount(0);
    }
  }, [fetchedBadgeCount, badgeCountError]);

  // Calculate tier based on badgeCount.
  const { tierName, rewardMultiplier } = useMemo(() => {
    let tier = 'Bronze';
    let multiplier = 1;
    if (badgeCount >= 10000) {
      tier = 'Grandmaster';
      multiplier = 3;
    } else if (badgeCount >= 5000) {
      tier = 'Master';
      multiplier = 2.5;
    } else if (badgeCount >= 1000) {
      tier = 'Gold';
      multiplier = 2;
    } else if (badgeCount >= 250) {
      tier = 'Silver';
      multiplier = 1.5;
    }
    return { tierName: tier, rewardMultiplier: multiplier };
  }, [badgeCount]);

  // Enhanced keyword matching with partial matching and ranking
const displayedQuests = useMemo(() => {
  if (!personaKeywords || personaKeywords.length === 0) return [];
  
  const userKeywordsLower = personaKeywords.map(k => k.toLowerCase());
  
  // Score each quest by relevance to user keywords
  const scoredQuests = MOCK_SPONSORED_QUESTS.map(quest => {
    let score = 0;
    let matchedKeywords = [];
    
    // Check each quest keyword against user keywords
    quest.keywords.forEach(questKeyword => {
      const qkLower = questKeyword.toLowerCase();
      
      // Exact matches get highest score
      if (userKeywordsLower.includes(qkLower)) {
        score += 10;
        matchedKeywords.push(questKeyword);
        return;
      }
      
      // Partial matches (user keyword contains quest keyword or vice versa)
      for (const userKeyword of userKeywordsLower) {
        if (userKeyword.includes(qkLower) || qkLower.includes(userKeyword)) {
          score += 5;
          matchedKeywords.push(questKeyword);
          return;
        }
      }
    });
    
    return {
      ...quest,
      relevanceScore: score,
      matchedKeywords: [...new Set(matchedKeywords)] // Deduplicate
    };
  });
  
  // Filter out quests with no matches, then sort by relevance
  return scoredQuests
    .filter(quest => quest.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}, [personaKeywords]);

  // Add this useMemo hook after your other useMemo hooks in the App component
  const badgeCountsByType = useMemo(() => {
    // Create a map from badge URI to quest type
    const uriToTypeMap = {};
    MOCK_SPONSORED_QUESTS.forEach(quest => {
      if (quest.sbtMetadataURI && quest.type) {
        uriToTypeMap[quest.sbtMetadataURI] = quest.type;
      }
    });
    
    // Initialize the counts object
    const counts = {};
    
    // Count badges by type
    ownedBadges.forEach(badge => {
      const badgeUri = badge.uri || badge.metadataURI;
      let type;
      
      if (badgeUri === GENERIC_SURVEY_BADGE_URI) {
        type = 'survey';
      } else {
        type = uriToTypeMap[badgeUri] || 'unknown';
      }
      
      // Increment the count for this type
      counts[type] = (counts[type] || 0) + 1;
    });
    
    return counts;
  }, [ownedBadges]);

  // Function to navigate to the Persona Portal view and initialize editor state.
  const goToPersonaPortal = () => {
    setEditedKeywords([...personaKeywords]); // Copy committed keywords for editing
    setKeywordsToDelete(new Set());
    
    // Refresh persona history when navigating to Persona Portal
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([PERSONA_HISTORY_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error reading persona history:", chrome.runtime.lastError);
        } else {
          const history = result[PERSONA_HISTORY_KEY] || [];
          if (Array.isArray(history)) {
            console.log("Refreshed persona history with", history.length, "entries");
            setPersonaHistory(history);
          }
        }
      });
    }
    
    setCurrentView('persona');
  };

  // Handler functions for managing persona keywords.
  const handleMarkForDeletion = (keyword) => {
    setKeywordsToDelete(prev => {
      const next = new Set(prev);
      next.add(keyword);
      return next;
    });
  };

  const handleUndoDeletion = (keyword) => {
    setKeywordsToDelete(prev => {
      const next = new Set(prev);
      next.delete(keyword);
      return next;
    });
  };

  const handleSaveChanges = () => {
    const finalKeywords = editedKeywords.filter(k => !keywordsToDelete.has(k));
    setPersonaKeywords(finalKeywords);
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [PERSONA_STORAGE_KEY]: finalKeywords }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving persona keywords:", chrome.runtime.lastError);
        } else {
          console.log("Saved updated persona keywords:", finalKeywords);
        }
      });
    }
    setCurrentView('main');
  };

  // Define handleStartVerification function using useCallback for proper memoization
  const handleStartVerification = useCallback(() => {
    console.log("HSV: handleStartVerification called.");
    
    if (!activeQuestForVerification) {
      console.error("HSV: No active quest available for verification");
      setQuestFeedback("Error: No active quest to verify.");
      return;
    }
    
    console.log("HSV: Active quest for verification:", activeQuestForVerification);

    // First check if the quest already has an MCQ defined
    if (activeQuestForVerification.verificationMCQ) {
      console.log("HSV: Using predefined verification MCQ from quest");
      // Set up verification UI and state with the predefined MCQ
      setCurrentVerificationMCQ(activeQuestForVerification.verificationMCQ);
      setVerificationTimer(activeQuestForVerification.verificationTimeLimit || 60);
      setUserVerificationAnswer('');
      setVerificationResult('pending');
      setShowVerificationUI(true);
      return;
    }
    
    // If no predefined MCQ, request one from the background
    const messagePayload = { 
      type: 'GET_VERIFICATION_MCQ', 
      topic: activeQuestForVerification.verificationTopic || activeQuestForVerification.questTitle,
      keywords: activeQuestForVerification.questKeywords 
    };
    
    console.log("HSV: Sending GET_VERIFICATION_MCQ message:", messagePayload);
    
    chrome.runtime.sendMessage(messagePayload, (response) => {
      console.log("HSV: Received response from background for MCQ:", response);
      
      if (chrome.runtime.lastError) {
        console.error("HSV: Error getting verification MCQ:", chrome.runtime.lastError.message);
        setQuestFeedback("Error: Could not generate verification question.");
        return;
      }
      
      if (response && response.error) {
        console.error("HSV: Background script returned error:", response.error);
        setQuestFeedback(`Error: ${response.error}`);
        return;
      }
      
      if (response && response.mcqData) {
        console.log("HSV: Setting currentVerificationMCQ and showing UI.");
        // Set up verification UI and state
        setCurrentVerificationMCQ(response.mcqData);
        setVerificationTimer(activeQuestForVerification.verificationTimeLimit || 60);
        setUserVerificationAnswer('');
        setVerificationResult('pending');
        setShowVerificationUI(true);
      } else {
        console.error("HSV: Invalid or missing MCQ data in response");
        setQuestFeedback("Error: Failed to generate verification question.");
      }
    });
  }, [
    activeQuestForVerification,
    setQuestFeedback,
    setCurrentVerificationMCQ,
    setVerificationTimer,
    setUserVerificationAnswer,
    setVerificationResult,
    setShowVerificationUI
  ]);

  // ...existing code...

  // 5. handleNextQuestion Function
  const handleNextQuestion = () => {
    if (currentSurvey && currentSurvey[currentQuestionIndex]) {
      // Save current answer keyed by question ID
      setSurveyAnswers(prevAnswers => ({
        ...prevAnswers,
        [currentSurvey[currentQuestionIndex].q_id]: userAnswer
      }));
      // Move to the next question
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      // Reset user answer and disable the next button until timer enables it again
      setUserAnswer('');
      setIsNextButtonEnabled(false);
    }
  };

  // 6. handleFinishSurvey Function
const handleFinishSurvey = async () => {
  if (currentSurvey && currentSurvey[currentQuestionIndex]) {
    // Save the final answer for the current question
    const finalAnswers = {
      ...surveyAnswers,
      [currentSurvey[currentQuestionIndex].q_id]: userAnswer
    };
    
    setSurveyAnswers(finalAnswers);
    console.log("Completed Survey Answers:", finalAnswers);
    
    // Create the history entry with timestamp and answers
    const newHistoryEntry = { 
      timestamp: Date.now(), 
      keywords: interestKeywords,
      answers: finalAnswers,
      questions: currentSurvey.map(q => ({ 
        id: q.q_id, 
        question: q.question,
        options: q.options 
      }))
    };
    
    // Add this log to confirm we're attempting to save
    console.log("Attempting to save survey history entry:", newHistoryEntry);
    
    // Save survey answers to storage
    if (chrome.storage && chrome.storage.local) {
      try {
        // Create a standalone function for better error tracking
        const saveHistoryToStorage = async () => {
          return new Promise((resolve, reject) => {
            chrome.storage.local.get([SURVEY_HISTORY_KEY], (result) => {
              if (chrome.runtime.lastError) {
                console.error("Error reading survey history:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
              }
              
              console.log("Successfully retrieved existing history:", result);
              
              // Get existing history or default to empty array
              const existingHistory = Array.isArray(result[SURVEY_HISTORY_KEY]) ? result[SURVEY_HISTORY_KEY] : [];
              
              // Add new entry to the beginning of the array
              const updatedHistory = [newHistoryEntry, ...existingHistory];
              
              // Limit history to the latest 10 entries
              const limitedHistory = updatedHistory.slice(0, 10);
              
              // Log what we're about to save
              console.log("About to save survey history with length:", limitedHistory.length);
              
              // Save the updated history
              chrome.storage.local.set({ [SURVEY_HISTORY_KEY]: limitedHistory }, () => {
                if (chrome.runtime.lastError) {
                  console.error("Error saving survey history:", chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                } else {
                  console.log("Survey history saved successfully. Total entries:", limitedHistory.length);
                  resolve(limitedHistory);
                }
              });
            });
          });
        };
        
        // Execute the storage function and handle any errors
        saveHistoryToStorage()
          .then(history => console.log("Storage operation completed successfully"))
          .catch(err => console.error("Failed to save survey history:", err));
      } catch (storageError) {
        console.error("Exception during storage operation:", storageError);
      }
    } else {
      console.error("Chrome storage API not available");
    }
    
    // Calculate real PERS reward amount
    const baseReward = 1; // Changed from 5 to 1
    const actualReward = baseReward * rewardMultiplier;
    
    // Update feedback message to show minting in progress
    setQuestFeedback(`Survey completed! Minting ${actualReward} PERS tokens...`);
    
    // Request PERS distribution through background script
    chrome.runtime.sendMessage({ 
      type: 'DISTRIBUTE_PERS_REWARD', 
      recipientAddress: address, 
      amountString: actualReward.toString() 
    }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error requesting PERS distribution:", chrome.runtime.lastError);
        setQuestFeedback(`Survey completed, but PERS distribution failed: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      if (response && response.success) {
        console.log("PERS distribution request successful:", response);
        setQuestFeedback(`Success! ${actualReward} PERS tokens minted and added to your wallet. Tx: ${response.transactionHash?.substring(0, 8)}...`);
        
        // Add this line to refresh the balance automatically
        refetch();
      } else {
        console.error("PERS distribution failed:", response?.error || "Unknown error");
        setQuestFeedback(`Survey completed, but PERS distribution failed: ${response?.error || "Unknown error"}`);
      }
    });
    
    // Reset survey state after processing
    setCurrentSurvey(null);
    setCurrentQuestionIndex(0);
    setSurveyAnswers({});
    setUserAnswer('');
    
    // Clear feedback after a delay
    setTimeout(() => {
      setQuestFeedback('');
    }, 7000);
  }
};

  // Function to start the Crypto Quest.
  async function handleStartQuest() {
    setIsLoadingQuest(true);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab) {
        const pageUrl = activeTab.url;
        const pageTitle = activeTab.title;
        console.log("Active tab found:", activeTab);

        const target = { tabId: activeTab.id };
        const injectableFunction = () => {
          const mainEl = document.querySelector('main');
          if (mainEl && mainEl.innerText.length > 100) return mainEl.innerText.slice(0, 3000);
          const articleEl = document.querySelector('article');
          if (articleEl && articleEl.innerText.length > 100) return articleEl.innerText.slice(0, 3000);
          const contentDiv = document.querySelector('#content, #main, #main-content, .post-body, .entry-content');
          if (contentDiv && contentDiv.innerText.length > 100) return contentDiv.innerText.slice(0, 3000);
          const bodyText = document.body.innerText;
          const filteredText = bodyText.split('\n').filter(line => line.length > 50).join('\n');
          return filteredText.slice(0, 3000) || bodyText.slice(0, 1000);
        };

        let mainContent = '';
        if (chrome.scripting && chrome.scripting.executeScript) {
          try {
            const scriptResults = await chrome.scripting.executeScript({
              target: target,
              func: injectableFunction,
            });
            if (scriptResults && scriptResults.length > 0 && scriptResults[0].result) {
              mainContent = scriptResults[0].result;
              console.log("Extracted Page Content (Snippet):", mainContent.substring(0, 200) + "...");
            } else {
              console.log("Could not extract main content using heuristics, using title/URL only.");
            }
          } catch (scriptError) {
            console.error("Error executing script:", scriptError);
          }
        } else {
          console.error("chrome.scripting.executeScript is not available. Check 'scripting' permission in your manifest.");
        }

        const pageContext = {
          url: pageUrl,
          title: pageTitle,
          content: mainContent,
        };
        console.log("Page Context gathered:", pageContext);

        // 2. Updated sendMessage Callback Logic inside handleStartQuest
        chrome.runtime.sendMessage(
          { type: 'ANALYZE_PAGE_DATA', context: pageContext },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Messaging error:", chrome.runtime.lastError.message);
              setQuestFeedback('Error: Failed to get analysis');
              setCurrentSurvey(null);
              return;
            }
            
            if (response && response.error) {
              console.error("Error from background:", response.error, response.details);
              setQuestFeedback(`Error: ${response.error}`);
              setCurrentSurvey(null);
            } else if (response && response.analysisResult) {
              const { displayKeywords, detailedKeywords, surveyQuestions } = response.analysisResult;

              // 1. Update display keywords
              setInterestKeywords(
                Array.isArray(displayKeywords) && displayKeywords.length > 0
                  ? displayKeywords.join(', ')
                  : 'None'
              );

              // 2. Merge detailed keywords into personaKeywords and save to storage
              if (Array.isArray(detailedKeywords) && detailedKeywords.length > 0) {
                setPersonaKeywords(prevKeywords => {
                  const currentKeywords = Array.isArray(prevKeywords) ? prevKeywords : [];
                  
                  // Process new detailed keywords
                  const processedDetailedKeywords = detailedKeywords
                    .map(k => k.toLowerCase().trim())
                    .filter(Boolean);
                  
                  // Combine and deduplicate with existing keywords
                  const combinedDetailed = [...new Set([...currentKeywords, ...processedDetailedKeywords])];
                  
                  // Save aggregated keywords to storage
                  if (chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ [PERSONA_STORAGE_KEY]: combinedDetailed }, () => {
                      if (chrome.runtime.lastError) {
                        console.error("Error saving persona keywords:", chrome.runtime.lastError);
                      } else {
                        console.log("Saved updated persona keywords:", combinedDetailed);
                      }
                    });
                  }
                  
                  return combinedDetailed;
                });
              }

              // 3. Save analysis history session
              if ((Array.isArray(displayKeywords) && displayKeywords.length > 0) || 
                  (Array.isArray(detailedKeywords) && detailedKeywords.length > 0)) {
                  
                const newHistoryEntry = { 
                  timestamp: Date.now(), 
                  display: displayKeywords || [],
                  detailed: detailedKeywords || [],
                  url: pageContext.url,
                  title: pageContext.title?.substring(0, 100) || 'Untitled'
                };
                
                if (chrome.storage && chrome.storage.local) {
                  chrome.storage.local.get([PERSONA_HISTORY_KEY], (result) => {
                    if (chrome.runtime.lastError) {
                      console.error("Error reading persona history:", chrome.runtime.lastError);
                      return;
                    }
                    
                    // Get existing history or default to empty array
                    const currentHistory = Array.isArray(result[PERSONA_HISTORY_KEY]) 
                      ? result[PERSONA_HISTORY_KEY] 
                      : [];
                    
                    // Add new entry to the beginning of history
                    const updatedHistory = [newHistoryEntry, ...currentHistory];
                    
                    // Limit history to the latest 20 entries
                    const limitedHistory = updatedHistory.slice(0, 20);
                    
                    // Save the updated history
                    chrome.storage.local.set({ [PERSONA_HISTORY_KEY]: limitedHistory }, () => {
                      if (chrome.runtime.lastError) {
                        console.error("Error saving persona history:", chrome.runtime.lastError);
                      } else {
                        console.log("Persona analysis history saved. Total entries:", limitedHistory.length);
                      }
                    });
                  });
                }
              }

              // 4. Update survey questions (keeping existing logic)
              if (Array.isArray(surveyQuestions) && surveyQuestions.length > 0) {
                setCurrentSurvey(surveyQuestions);
                setCurrentQuestionIndex(0);
                setSurveyAnswers({});
                setQuestFeedback('');
                setUserAnswer('');
                setIsNextButtonEnabled(false);
              } else {
                console.log("No valid survey questions generated.");
                setCurrentSurvey(null);
              }
            } else {
              console.error("Invalid analysis response structure", response);
              setQuestFeedback('Error: Invalid analysis data');
              setCurrentSurvey(null);
            }
          }
        );
      } else {
        console.error("No active tab found.");
      }
    } catch (error) {
      console.error("Error in handleStartQuest:", error);
    } finally {
      setIsLoadingQuest(false);
    }
  }

  // Function to handle poll answer submission.
  async function handleSubmitAnswer() {
    if (!currentPoll || userAnswer === '') return;
    
    const baseQuestReward = 1; // Changed from 5 to 1
    const actualReward = baseQuestReward * rewardMultiplier;
    
    // Update feedback message to show minting in progress
    setQuestFeedback(`Thanks for your input! Minting ${actualReward} PERS tokens...`);
    console.log("User selected answer:", userAnswer, "for poll:", currentPoll?.question);
    
    // Request PERS distribution through background script
    chrome.runtime.sendMessage({ 
      type: 'DISTRIBUTE_PERS_REWARD', 
      recipientAddress: address, 
      amountString: actualReward.toString() 
    }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error requesting PERS distribution:", chrome.runtime.lastError);
        setQuestFeedback(`Quiz completed, but PERS distribution failed: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      if (response && response.success) {
        console.log("PERS distribution request successful:", response);
        setQuestFeedback(`Success! ${actualReward} PERS tokens minted and added to your wallet. Tx: ${response.transactionHash?.substring(0, 8)}...`);
        
        // Add this line to refresh the balance automatically
        refetch();
        
        // Continue with badge minting as before...
      } else {
        console.error("PERS distribution failed:", response?.error || "Unknown error");
        setQuestFeedback(`Quiz completed, but PERS distribution failed: ${response?.error || "Unknown error"}`);
      }
    });
    
    // Reset poll state after a delay (keeping feedback visible longer)
    setTimeout(() => {
      setCurrentPoll(null);
      setUserAnswer('');
    }, 1000);
    
    // Keep the success message for a bit longer
    setTimeout(() => setQuestFeedback(''), 7000);
    
    // Remove this line as it's causing an error - simulatedRewards no longer used
    // chrome.storage.local.set({ [SIMULATED_REWARDS_KEY]: newSimulatedAmount });
  }

  // Function to handle accepting a sponsored quest from the marketplace
async function handleAcceptSponsoredQuest(quest) {
  console.log("AQ: === Function Start ===", quest.title);

  // Define the state to save
  const activeQuestState = {
    questId: quest.id,
    startTime: Date.now(),
    status: 'pending_timer',
    completionDelaySeconds: quest.completionDelaySeconds || 60,
    questTitle: quest.title,
    questKeywords: quest.keywords,
    rewardText: quest.reward,
    sbtMetadataURI: quest.sbtMetadataURI || null,
    verificationMCQ: quest.verificationMCQ || null,
    verificationTimeLimit: quest.verificationTimeLimit || 30
  };
  console.log("AQ: Defined activeQuestState:", JSON.stringify(activeQuestState));
  
  // Update feedback & UI immediately (may flash briefly)
  setQuestFeedback(`Starting '${quest.title}'... Complete task and check back later.`);
  setCurrentView('main');

  try {
    // 1. Save quest state to storage (promisified)
    console.log("AQ: Attempting storage.set...");
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [ACTIVE_QUEST_STORAGE_KEY]: activeQuestState }, () => {
        if (chrome.runtime.lastError) {
          console.error("AQ: Error SAVING active quest state:", chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else {
          console.log("AQ: SUCCESS - storage.set completed.");
          resolve();
        }
      });
    });

    // 2. Tell background script to start timer (promisified)
    console.log("AQ: Attempting runtime.sendMessage START_QUEST_TIMER...");
    const timerResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'START_QUEST_TIMER', questState: activeQuestState },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("AQ: Error SENDING message:", chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            console.log("AQ: Response from background for timer start:", response);
            resolve(response);
          }
        }
      );
    });
    
    // 3. Now that storage and messaging are complete, open the quest URL tab
    console.log("AQ: Attempting tabs.create:", quest.questURL);
    if (quest.questURL && 
        typeof quest.questURL === 'string' && 
        (quest.questURL.startsWith('http://') || quest.questURL.startsWith('https://'))) {
      chrome.tabs.create({ url: quest.questURL, active: true });
      console.log("AQ: tabs.create executed.");
    } else {
      console.warn("AQ: Invalid or missing questURL, tab not opened:", quest);
    }
    
  } catch (error) {
    console.error("AQ: Error in quest acceptance process:", error);
    setQuestFeedback(`Error starting quest: ${error.message || "Unknown error"}`);
    // Reset UI after brief delay if there was an error
    setTimeout(() => setQuestFeedback(''), 3000);
  }
  
  console.log("AQ: Function completed.");
}

// Inside your App() component, alongside handleAcceptSponsoredQuest:

async function handleAcceptSurveyQuest(quest) {
  console.log("🚀 handleAcceptSurveyQuest()", quest);
  setCurrentView('main');
  setQuestFeedback(`Loading "${quest.title}"…`);

  try {
    const questions = await loadSurveyInBatches(
      quest.surveyTopic || quest.title,
      quest.surveyLength || 25,
      2
    );
    console.log("✅ batches done, questions:", questions);
    // Overwrite state one final time to be sure
    setCurrentSurvey(questions);
    setQuestFeedback('Survey loaded! Let’s begin…');
    setCurrentQuestionIndex(0);
    setSurveyAnswers({});
  } catch (err) {
    console.error("❌ handleAcceptSurveyQuest error:", err);
    setQuestFeedback('❌ Failed to start survey.');
  } finally {
    setTimeout(() => setQuestFeedback(''), 3000);
  }
}

async function loadSurveyInBatches(topic, totalQuestions = 25, batchSize = 2) {
  setIsSurveyLoading(true);
  let offset = 0;
  const allQuestions = [];
  let consecutiveEmptyResponses = 0;
  const maxConsecutiveEmptyResponses = 3;

  try {
    while (offset < totalQuestions) {
      // Add delay between requests to avoid rate limiting
      if (offset > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await sendMessageToBg({
        type: 'INIT_SURVEY_BATCH',
        topic,
        batchSize,
        offset
      });
      
      const questions = response.questions || [];
      
      if (questions.length === 0) {
        console.log(`No questions returned for batch at offset ${offset}. Possibly rate limited.`);
        consecutiveEmptyResponses++;
        
        // If we get too many empty responses in a row, stop the process
        if (consecutiveEmptyResponses >= maxConsecutiveEmptyResponses) {
          console.warn("Too many consecutive empty responses. Stopping batch loading.");
          break;
        }
        
        // Slow down even more on empty responses (possible rate limiting)
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue; // Try again with the same offset
      }
      
      // Reset counter when we successfully get questions
      consecutiveEmptyResponses = 0;
      
      // Map API questions to normalized questions with sequential IDs regardless of API response
      const normalized = questions.map((q, index) => ({
        // Use current array length + index + 1 to ensure sequential IDs
        q_id: allQuestions.length + index + 1,
        // Store original API ID if needed for reference
        api_q_id: q.q_id,
        question: q.text,
        options: q.options || {}
      }));
      
      allQuestions.push(...normalized);
      setCurrentSurvey([...allQuestions]); 
      offset += questions.length; // Only increase offset by the number of questions actually received
    }
    
    // If we have at least some questions, consider it a success
    if (allQuestions.length > 0) {
      return allQuestions;
    } else {
      throw new Error("Failed to load any survey questions");
    }
    
  } catch (err) {
    console.error("Batch load failed:", err);
    throw err;
  } finally {
    setIsSurveyLoading(false);
  }
}

// Add this new function to handle chapter navigation
const handleChapterNavigation = (action, branchChoice) => {
  // Save current answer first
  if (userAnswer) {
    const currentQuestion = surveyChapters[currentChapterIndex]?.questions[currentQuestionIndex];
    if (currentQuestion) {
      setSurveyAnswers(prev => ({
        ...prev,
        [currentQuestion.q_id]: userAnswer
      }));
    }
  }

  // Reset user answer for next question
  setUserAnswer('');
  
  // Handle different navigation actions
  switch(action) {
    case 'START_CHAPTER':
      setChapterIntroShown(true);
      break;
      
    case 'NEXT_QUESTION':
      const currentChapter = surveyChapters[currentChapterIndex];
      if (currentQuestionIndex < currentChapter.questions.length - 1) {
        // Move to next question in current chapter
        setCurrentQuestionIndex(idx => idx + 1);
      } else if (currentChapterIndex < surveyChapters.length - 1) {
        // Move to next chapter
        setCurrentChapterIndex(ch => ch + 1);
        setCurrentQuestionIndex(0);
        setChapterIntroShown(false);
      } else {
        // End of survey
        handleFinishSurvey();
      }
      break;
      
    case 'BRANCH':
      if (branchChoice === 'dive') {
        // Stay in current chapter, go to next question
        setCurrentQuestionIndex(idx => idx + 1);
      } else {
        // Skip ahead to next chapter
        setCurrentChapterIndex(ch => ch + 1);
        setCurrentQuestionIndex(0);
        setChapterIntroShown(false);
      }
      break;
  }
};

  const realBalanceFormatted = balanceData ? parseFloat(balanceData.formatted) : 0;
  const displayBalance = realBalanceFormatted;

  // Add this useEffect hook to handle the countdown timer
useEffect(() => {
  let timerId;
  
  if (showVerificationUI && verificationTimer > 0) {
    // start countdown
    timerIntervalRef.current = setInterval(() => {
      setVerificationTimer(prev => prev - 1);
    }, 1000);
  } else if (showVerificationUI && verificationTimer <= 0) {
    // timeout handling
    console.log("Verification timed out");
    clearInterval(timerIntervalRef.current);
    setVerificationResult('failed_timeout');
    setShowVerificationUI(false);
    setActiveQuestForVerification(null);
    setQuestFeedback("Time's up! Verification failed.");
    // clear feedback after a short delay
    setTimeout(() => setQuestFeedback(''), 3000);
  }

  return () => {
    // cleanup on dependency change or unmount
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };
}, [showVerificationUI, verificationTimer]);

  // Replace the existing handleSubmitVerification function with this fixed version
  async function handleSubmitVerification() {
  // stop the countdown
  clearInterval(timerIntervalRef.current);

  if (!currentVerificationMCQ || !activeQuestForVerification) {
    console.error("No verification question or active quest available");
    return;
  }

  const isCorrect = userVerificationAnswer === currentVerificationMCQ.correctAnswer;
  const questId = activeQuestForVerification.questId;

  // Mark quest as completed with verification result
  if (questId) {
    console.log(`SV: Marking quest ${questId} as completed with result: ${isCorrect ? 'success' : 'failed'}`);
    
    // Create completion object with status
    const completionData = {
      id: questId,
      timestamp: Date.now(),
      // Make sure this exactly matches what the UI is looking for
      status: isCorrect ? 'verified_success' : 'verified_failed',
      title: activeQuestForVerification.questTitle
    };
    
    // Add more logging to help debug
    console.log(`SV: Setting completion status to: ${isCorrect ? 'verified_success' : 'verified_failed'}`);
    
    // Update local state - now storing objects instead of just IDs
    setCompletedQuestIds(prev => {
      // Convert existing Set to array of objects if needed
      const existingCompletions = Array.from(prev).map(id => {
        if (typeof id === 'object') return id;
        return { id, status: 'completed' }; // Default for old format
      });
      
      // Remove any existing entries for this quest
      const filteredCompletions = existingCompletions.filter(item => 
        typeof item === 'object' ? item.id !== questId : item !== questId
      );
      
      // Add the new completion data
      const updatedCompletions = [...filteredCompletions, completionData];
      
      // Save to storage
      chrome.storage.local.set({ [COMPLETED_QUESTS_STORAGE_KEY]: updatedCompletions }, () => {
        if (chrome.runtime.lastError) {
          console.error("SV: Error saving completed quest data:", chrome.runtime.lastError);
        } else {
          console.log("SV: Successfully saved completed quest data:", updatedCompletions);
        }
      });
      
      // Return new Set with objects
      return new Set(updatedCompletions);
    });
  }

  if (isCorrect) {
    // Extract reward amount from text (e.g., "XYZ SBT + 10 ADR")
    let baseQuestReward = 1; // Default if we can't parse
    const rewardText = activeQuestForVerification.rewardText || '';
    const rewardMatch = rewardText.match(/(\d+)\s*ADR/i);
    if (rewardMatch && rewardMatch[1]) {
      baseQuestReward = parseInt(rewardMatch[1], 10);
    }
    
    // Calculate reward with multiplier
    const actualReward = baseQuestReward * rewardMultiplier;
    
    // Update feedback to show PERS token request is in progress
    setVerificationResult('passed');
    setQuestFeedback('Verification passed! Minting PERS reward & Badge...');
    
    // Request PERS token distribution
    chrome.runtime.sendMessage({ 
      type: 'DISTRIBUTE_PERS_REWARD', 
      recipientAddress: address, 
      amountString: actualReward.toString() 
    }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error requesting PERS distribution:", chrome.runtime.lastError);
        setQuestFeedback(`Verification passed, but PERS distribution failed: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      if (response && response.success) {
        console.log("PERS distribution request successful:", response);
        setQuestFeedback(`Verification passed! ${actualReward} PERS tokens minted. Processing badge...`);
        refetch();
      } else {
        console.error("PERS distribution failed:", response?.error || "Unknown error");
        setQuestFeedback(`Verification passed, but PERS distribution failed: ${response?.error || "Unknown error"}`);
      }
    });
    
    // Process badge reward if verification was successful
    try {
      const questData = {
        title: activeQuestForVerification.questTitle || "Unknown Quest",
        rewardText: activeQuestForVerification.rewardText || `SBT + ${baseQuestReward} ADR`,
        sbtMetadataURI: activeQuestForVerification.sbtMetadataURI
      };
      
      // Only attempt to mint if we have a metadataURI
      if (questData.sbtMetadataURI) {
        console.log("Processing sponsored quest completion for badge:", questData);
        
        // Let the background script handle the badge minting
        chrome.runtime.sendMessage({ 
          type: 'PROCESS_SPONSORED_QUEST_COMPLETION', 
          questData, 
          userAddress: address, 
          currentMultiplier: rewardMultiplier 
        }, response => {
          if (chrome.runtime.lastError) {
            console.error("Error requesting badge mint:", chrome.runtime.lastError);
            setQuestFeedback(`PERS reward processed, but badge minting failed: ${chrome.runtime.lastError.message}`);
            return;
          }
          
          if (response && response.success) {
            console.log("Badge minting request successful:", response);
            setQuestFeedback(`Quest complete! PERS reward and badge mint successful.`);
            
            if (response.tokenId) {
              const newBadge = {
                id: response.tokenId,
                uri: questData.sbtMetadataURI,
                title: activeQuestForVerification.questTitle || "Quest Badge",
                description: `Earned by completing quest: ${activeQuestForVerification.questTitle}`,
                txHash: response.transactionHash,
                timestamp: new Date().toISOString()
              };
              
              // Update owned badges
              setOwnedBadges(prevBadges => {
                const badges = Array.isArray(prevBadges) ? prevBadges : [];
                const updatedBadges = [...badges, newBadge];
                
                // Save to storage
                if (chrome.storage && chrome.storage.local) {
                  chrome.storage.local.set({ [OWNED_BADGES_STORAGE_KEY]: updatedBadges });
                }
                
                return updatedBadges;
              });
            }
            
            // Refresh badge count after a short delay
            setTimeout(() => {
              refetchBadgeCount?.();
            }, 5000);
          } else {
            console.error("Badge minting failed:", response?.error || "Unknown error");
            setQuestFeedback(`PERS reward processed, but badge minting failed: ${response?.error || 'Unknown error'}`);
          }
        });
      } else {
        setQuestFeedback(`Quest complete! PERS reward processed (no badge metadata available)`);
      }
    } catch (error) {
      console.error("Error processing badge rewards:", error);
      setQuestFeedback(`PERS reward processed, but badge processing had an error: ${error.message || "Unknown error"}`);
    }
  } else {
    setVerificationResult('failed_answer');
    setQuestFeedback(
      `Verification failed. Correct answer was ${currentVerificationMCQ.correctAnswer}. Quest marked as completed.`
    );
  }

  // clear active quest state
  setActiveQuestForVerification(null);
  chrome.storage.local.remove(ACTIVE_QUEST_STORAGE_KEY);

  // hide verification UI shortly
  setTimeout(() => setShowVerificationUI(false), 3000);

  // reset inputs and timer
  setUserVerificationAnswer('');
  setVerificationTimer(0);

  // clear feedback after a bit longer
  setTimeout(() => setQuestFeedback(''), 10000);
  }

  // Add this function to the App component

const refreshPersonaHistory = (historyData) => {
  if (Array.isArray(historyData)) {
    console.log("Refreshing persona history with", historyData.length, "entries");
    setPersonaHistory(historyData);
  }
};

// Inside your App() component, below the helper and state declarations:
async function loadSurveyInBatches(topic, totalQuestions = 25, batchSize = 2) {
  setIsSurveyLoading(true);
  let offset = 0;
  const allQuestions = [];

  try {
    while (offset < totalQuestions) {
      const { questions } = await sendMessageToBg({
        type: 'INIT_SURVEY_BATCH',
        topic,
        batchSize,
        offset
      });

      // <-- normalize `text` → `question` so your UI sees it
      const normalized = questions.map(q => ({
        q_id:    q.q_id,
        question: q.text,       // <- use the AI’s text as `question`
        options:  q.options || {}
      }));

      allQuestions.push(...normalized);
      setCurrentSurvey([...allQuestions]);
      offset += batchSize;
    }

    return allQuestions;

  } catch (err) {
    console.error("Batch load failed:", err);
  } finally {
    setIsSurveyLoading(false);
  }
}

  return (
    <div style={{ 
      maxWidth: '520px', 
      margin: '0 auto',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: 'none'  // Remove the box shadow
    }}>
      <div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  marginBottom: '16px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  padding: '8px 12px'
}}>
  <h1 style={{ 
    margin: 0, 
    fontSize: '1.3rem', 
    color: '#333',
    fontWeight: 500 
  }}>
    Ad Rewards
  </h1>
  
  {isConnected ? (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        padding: '6px 10px',
        borderRadius: '16px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ fontSize: '0.75rem' }}>●</span>
        {address.slice(0,6)}…{address.slice(-4)}
      </span>
      
      <div className="wallet-actions" style={{ display: 'flex' }}>
    <button 
      onClick={() => {
        // Open Coinbase Wallet instead of BaseScan
        window.open('https://wallet.coinbase.com/assets', '_blank');
      }}
      style={{
        backgroundColor: '#f0f0f0',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.8rem',
        color: '#1976d2',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        margin: '0 2px'
      }}
      title="Open Wallet"
    >
      <span style={{ fontSize: '0.7rem' }}>👛</span>
      Wallet
    </button>
    
    <button 
      onClick={() => {
        disconnect();
        // Also clear wagmi localStorage items and reload for good measure
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.connectors');
        window.location.reload();
      }}
      style={{
        backgroundColor: '#fff0f0',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.8rem',
        color: '#d32f2f',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        margin: '0 2px'
      }}
      title="Disconnect wallet"
    >
      <span style={{ fontSize: '0.7rem' }}>🔒</span>
      Logout
    </button>
  </div>
</div>
  ) : (
    <Wallet
      render={({ open }) => (
        <button
          onClick={open}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            backgroundColor: '#6050dc',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          Connect Wallet
        </button>
      )}
    />
  )}
</div>

      
      {isConnected && address && (
        <>
          {/* shared header info */}
          <div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginBottom: '16px'
}}>
  <div style={{
    backgroundColor: '#f0f7ff',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <span style={{ fontSize: '0.8rem', color: '#666' }}>PERS Balance</span>
    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
      {isBalanceLoading
        ? '...'
        : balanceData
        ? `${parseFloat(balanceData.formatted).toFixed(2)}`
        : '0.00'}
    </span>
  </div>
  
  <div style={{
    backgroundColor: '#f0fff9',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <span style={{ fontSize: '0.8rem', color: '#666' }}>Badges</span>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
    {isLoadingBadgeCount ? '...' : badgeCount}
  </span>
  <span style={{ fontSize: '0.8rem', color: '#2e7d32' }}>
    {tierName} ({rewardMultiplier}x)
  </span>
</div>

  </div>
</div>
          <p>Detected Keywords: {isLoadingQuest ? 'Loading...' : (interestKeywords || 'None')}</p>

          {/* pass all state & handlers down to ViewRouter */}
          <ViewRouter
            currentView={currentView}
            setCurrentView={setCurrentView}
            tierName={tierName}
            rewardMultiplier={rewardMultiplier}
            badgeCount={badgeCount}
            personaKeywords={personaKeywords}
            handleMarkForDeletion={handleMarkForDeletion}
            handleUndoDeletion={handleUndoDeletion}
            handleSaveChanges={handleSaveChanges}
            editedKeywords={editedKeywords}
            keywordsToDelete={keywordsToDelete}
            displayedQuests={displayedQuests}

            // you already had this:
            handleAcceptSponsoredQuest={handleAcceptSponsoredQuest}
            // add this line:
            handleAcceptSurveyQuest={handleAcceptSurveyQuest}

            // …the rest of your props
            currentSurvey={currentSurvey}
            currentQuestionIndex={currentQuestionIndex}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            handleNextQuestion={handleNextQuestion}
            handleFinishSurvey={handleFinishSurvey}
            isNextButtonEnabled={isNextButtonEnabled}
            showVerificationUI={showVerificationUI}
            verificationTimer={verificationTimer}
            currentVerificationMCQ={currentVerificationMCQ}
            handleSubmitVerification={handleSubmitVerification}
            isLoadingQuest={isLoadingQuest}
            handleStartQuest={handleStartQuest}
            goToPersonaPortal={goToPersonaPortal}
            questFeedback={questFeedback}
            setQuestFeedback={setQuestFeedback}
            refetch={refetch}
            activeQuestForVerification={activeQuestForVerification}
            handleStartVerification={handleStartVerification || (() => {
              console.warn('handleStartVerification fallback called');
              setQuestFeedback('Verification function temporarily unavailable');
            })}
            userVerificationAnswer={userVerificationAnswer}
            setUserVerificationAnswer={setUserVerificationAnswer}
            verificationResult={verificationResult}
            currentPoll={currentPoll}
            handleSubmitAnswer={handleSubmitAnswer}
            ownedBadges={ownedBadges}
            badgeCountsByType={badgeCountsByType}
            showCompletedQuests={showCompletedQuests}
            setShowCompletedQuests={setShowCompletedQuests}
            completedQuestIds={completedQuestIds}
            questBadgeContractAddress={questBadgeContractAddress}
            MOCK_SPONSORED_QUESTS={MOCK_SPONSORED_QUESTS}
            GENERIC_BADGE_ICON={GENERIC_BADGE_ICON}
            GENERIC_BADGE_NAME={GENERIC_BADGE_NAME}
            GENERIC_BADGE_DESC={GENERIC_BADGE_DESC}
            GENERIC_SURVEY_BADGE_URI={GENERIC_SURVEY_BADGE_URI}
            personaHistory={personaHistory || []}
            refreshPersonaHistory={refreshPersonaHistory}
            surveyChapters={surveyChapters}
            currentChapterIndex={currentChapterIndex}
            chapterIntroShown={chapterIntroShown}
            handleChapterNavigation={handleChapterNavigation}
          />
        </>
      )}
    </div>
  );
}

export default App;
