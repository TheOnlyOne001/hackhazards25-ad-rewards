// src/popup/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { formatUnits } from 'viem';
import QuestBadgeABI from '../../artifacts/contracts/QuestBadge.sol/QuestBadge.json';

const rewardTokenAddress = '0xeB165CaF13A24e5e00fB5779f64A81aD47Ce6d58';
const questBadgeContractAddress = '0x4475F90A71cb504539Ce1118cC7d343dC65153E7';
const STORAGE_KEY = 'simulatedRewardsBalance';
const PERSONA_STORAGE_KEY = 'personaKeywordsList';

// Define mock sponsored quests.
const MOCK_SPONSORED_QUESTS = [
  { id: 1, title: "Intro to Base L2", sponsor: "Base Team (Mock)", description: "Learn the basics of Base.", reward: "Base Basics SBT + 5 ADR", keywords: ["base", "layer 2", "ethereum", "l2"], type: "educational" },
  { id: 2, title: "Solidity Security Puzzle", sponsor: "OpenZeppelin (Mock)", description: "Solve a quick security challenge.", reward: "Security SBT + 15 ADR", keywords: ["solidity", "security", "smart contract"], type: "challenge" },
  { id: 3, title: "Try Groq API", sponsor: "Groq (Mock)", description: "Run your first inference.", reward: "AI Explorer SBT + 10 ADR", keywords: ["groq", "ai", "llm", "api"], type: "challenge" },
  { id: 4, title: "Web3 Wallet UX Feedback", sponsor: "Coinbase (Mock)", description: "Share your thoughts on a new design.", reward: "UX Contributor SBT + 8 ADR", keywords: ["wallet", "ux", "ui", "coinbase"], type: "beta" },
  { id: 5, title: "Learn about Soulbound Tokens", sponsor: "Web3 University (Mock)", description: "Read an article on SBTs.", reward: "SBT Knowledge Badge + 5 ADR", keywords: ["sbt", "nft", "soulbound", "web3", "identity"], type: "educational" },
];

function App() {
  const { address, isConnected } = useAccount();

  // Navigation view state: 'main', 'tier', 'persona', 'marketplace'
  const [currentView, setCurrentView] = useState('main');

  const { data: balanceData, isLoading: isBalanceLoading, refetch } = useBalance({
    address,
    token: rewardTokenAddress,
    chainId: baseSepolia.id,
  });

  // Basic states.
  const [simulatedRewards, setSimulatedRewards] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);

  // Quest (poll) data and analysis.
  const [currentPoll, setCurrentPoll] = useState(null);
  const [interestKeywords, setInterestKeywords] = useState('');

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

  // Load simulated rewards from storage.
  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error reading simulated rewards:", chrome.runtime.lastError);
          setSimulatedRewards(0);
        } else {
          const storedValue = result[STORAGE_KEY] || 0;
          setSimulatedRewards(storedValue);
        }
      });
    }
  }, []);

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

  // Derived list of quests to display (filtering by matching persona keywords).
  const displayedQuests = useMemo(() => {
    if (!personaKeywords || personaKeywords.length === 0) return [];
    const userKeywordsLower = new Set(personaKeywords.map(k => k.toLowerCase()));
    return MOCK_SPONSORED_QUESTS.filter(quest =>
      quest.keywords.some(qKeyword => userKeywordsLower.has(qKeyword.toLowerCase()))
    );
  }, [personaKeywords]);

  // Function to navigate to the Persona Portal view and initialize editor state.
  const goToPersonaPortal = () => {
    setEditedKeywords([...personaKeywords]); // Copy committed keywords for editing
    setKeywordsToDelete(new Set());
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

        chrome.runtime.sendMessage(
          { type: 'ANALYZE_PAGE_DATA', context: pageContext },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Messaging error:", chrome.runtime.lastError.message);
              setQuestFeedback('Error: Failed to get analysis');
              setCurrentPoll(null);
              setInterestKeywords('');
              return;
            }
            if (response && response.error) {
              console.error("Error from background:", response.error, response.details);
              setQuestFeedback(`Error: ${response.error}`);
              setCurrentPoll(null);
              setInterestKeywords('');
            } else if (response && response.analysisResult) {
              const { keywords, poll } = response.analysisResult;
              console.log("Keywords received:", keywords);
              console.log("Poll received:", poll);
              
              // Process the keywords and update storage
              const receivedKeywordsString = keywords || 'None';
              setInterestKeywords(receivedKeywordsString); // Update display of latest keywords

              if (receivedKeywordsString.toLowerCase() !== 'none') {
                const newKeywords = receivedKeywordsString.toLowerCase().split(',')
                                   .map(k => k.trim()).filter(k => k);
                if (newKeywords.length > 0) {
                  // Update the MAIN personaKeywords state AND save to storage
                  setPersonaKeywords(prevKeywords => {
                    // Ensure prevKeywords is an array
                    const currentKeywords = Array.isArray(prevKeywords) ? prevKeywords : [];
                    // Combine and ensure uniqueness
                    const combined = [...new Set([...currentKeywords, ...newKeywords])];

                    // Save to chrome.storage.local
                    if (chrome.storage && chrome.storage.local) {
                      chrome.storage.local.set({ [PERSONA_STORAGE_KEY]: combined }, () => {
                        if(chrome.runtime.lastError) {
                          console.error("Error saving NEW persona keywords:", chrome.runtime.lastError);
                        } else {
                          console.log("Saved NEW persona keywords:", combined);
                        }
                      });
                    }
                    return combined; // Return new state for personaKeywords
                  });
                }
              }

              if (poll && poll.question && poll.options) {
                setCurrentPoll(poll);
                setQuestFeedback('');
              } else {
                console.log("No valid poll generated.");
                setCurrentPoll(null);
                setQuestFeedback('Page analysis complete (no poll generated).');
              }
              setUserAnswer('');
            } else {
              console.error("Invalid analysis response.");
              setQuestFeedback('Error: Invalid analysis data');
              setCurrentPoll(null);
              setInterestKeywords('');
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
    
    const baseQuestReward = 5;
    const actualReward = baseQuestReward * rewardMultiplier;
    const newSimulatedAmount = simulatedRewards + actualReward;
    
    setSimulatedRewards(newSimulatedAmount);
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newSimulatedAmount });
    }
    setQuestFeedback(`Thanks for your input! +${actualReward} ADR Simulated. Requesting Badge Mint...`);
    console.log("User selected answer:", userAnswer, "for poll:", currentPoll?.question);
    
    const metadataURI = "ipfs://bafkreihq5jcwvqnqocc6nd3mpxvghzzsa5qn3e5jxtwluturunvdafsucu";
    const backendUrl = 'http://localhost:3001/mint-badge';
    const secret = import.meta.env.VITE_MINTER_API_SECRET;
    
    if (!secret) {
      console.error("Minter API Secret not found!");
      setQuestFeedback('Error: Missing API configuration.');
      setTimeout(() => {
        setCurrentPoll(null);
        setQuestFeedback('');
      }, 2000);
      setUserAnswer('');
      return;
    }
    
    try {
      const apiResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': secret
        },
        body: JSON.stringify({
          recipientAddress: address,
          metadataURI: metadataURI
        })
      });
      
      const responseData = await apiResponse.json();
      
      if (apiResponse.ok && responseData.success) {
        console.log("Backend mint initiated:", responseData);
        setQuestFeedback(`Badge mint initiated! Tx: ${responseData.transactionHash.substring(0,10)}...`);
        setTimeout(() => {
          refetchBadgeCount?.();
          console.log("Refetched badge count after mint.");
        }, 5000);
      } else {
        console.error("Backend mint request failed:", responseData.error);
        setQuestFeedback(`Mint request failed: ${responseData.error || 'Unknown backend error'}`);
      }
    } catch (networkError) {
      console.error("Network error calling backend mint API:", networkError);
      setQuestFeedback('Error: Could not reach minting service.');
    } finally {
      setTimeout(() => {
        setCurrentPoll(null);
        setQuestFeedback('');
      }, 3000);
      setUserAnswer('');
    }
  }

  // New function: handle accepting a sponsored quest from the marketplace.
  const handleAcceptSponsoredQuest = (quest) => {
    console.log("Accepted sponsored quest:", quest);
    // Extract base reward from quest reward string (format "XYZ SBT + X ADR")
    let baseReward = 5;
    const rewardParts = quest.reward.split('+');
    if (rewardParts.length > 1) {
      const adrPart = rewardParts[1].split(' ')[1];
      const parsed = parseInt(adrPart);
      if (!isNaN(parsed)) {
        baseReward = parsed;
      }
    }
    const actualReward = baseReward * rewardMultiplier;
    setQuestFeedback(`Completed '${quest.title}'! +${actualReward} ADR Simulated. Requesting Badge Mint...`);
    const newSimulatedAmount = simulatedRewards + actualReward;
    setSimulatedRewards(newSimulatedAmount);
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newSimulatedAmount });
    }
    
    // Generate a dynamic metadata URI based on quest type and sponsor
    const metadataURI = `ipfs://placeholder/${quest.type}_${quest.sponsor.split(' ')[0]}_badge.json`;
    const backendUrl = 'http://localhost:3001/mint-badge';
    const secret = import.meta.env.VITE_MINTER_API_SECRET;
    
    if (!secret) {
      console.error("Minter API Secret not found!");
      setQuestFeedback('Error: Missing API configuration.');
      setTimeout(() => setQuestFeedback(''), 5000);
      setCurrentView('main');
      return;
    }
    
    // Use the backend API to mint the badge, similar to handleSubmitAnswer
    fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': secret
      },
      body: JSON.stringify({
        recipientAddress: address,
        metadataURI: metadataURI
      })
    })
    .then(response => response.json())
    .then(responseData => {
      if (responseData.success) {
        console.log("Backend mint initiated:", responseData);
        setQuestFeedback(`Badge mint initiated! Tx: ${responseData.transactionHash.substring(0,10)}...`);
        setTimeout(() => {
          refetchBadgeCount?.();
          console.log("Refetched badge count after mint.");
        }, 5000);
      } else {
        console.error("Backend mint request failed:", responseData.error);
        setQuestFeedback(`Mint request failed: ${responseData.error || 'Unknown backend error'}`);
      }
    })
    .catch(networkError => {
      console.error("Network error calling backend mint API:", networkError);
      setQuestFeedback('Error: Could not reach minting service.');
    })
    .finally(() => {
      setCurrentView('main');
      setTimeout(() => setQuestFeedback(''), 5000);
    });
  };

  // Existing simulated reward handler.
  function handleRewardClick() {
    const newSimulatedAmount = simulatedRewards + 1;
    setSimulatedRewards(newSimulatedAmount);
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newSimulatedAmount }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving simulated reward:", chrome.runtime.lastError);
        }
      });
    }
    alert(
      `Simulated reward added!
      
To receive the actual 1 ADR token, the contract owner needs to:
1. Go to the Distributor contract on Base Sepolia Etherscan.
2. Call the 'distributeRewards' function.
3. Use recipient address: ${address}
4. Use amount: 1000000000000000000 (for 1 ADR, assuming 18 decimals)
5. After the transaction confirms, click 'Refresh Balance' in this popup.
      
Contract Address: 0x780AA5Ae2222C82F79c482D6f309936FA80D6277`
    );
    console.log("Simulated reward received!");
  }

  const realBalanceFormatted = balanceData ? parseFloat(balanceData.formatted) : 0;
  const displayBalance = realBalanceFormatted + simulatedRewards;

  return (
    <div>
      <h1>Ad Rewards</h1>
      <ConnectWallet />
      {isConnected && address && (
        <div>
          <p style={{ marginBottom: '5px' }}>Connected: {address}</p>
          <p style={{ marginBottom: '10px' }}>
            {isBalanceLoading
              ? 'Fetching balance...'
              : balanceData
              ? `Balance: ${displayBalance.toFixed(4)} ${balanceData.symbol}`
              : 'Balance not available'}
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
              (Includes simulated)
            </span>
          </p>
          {/* SBT Badge Count */}
          <p>
            Badges Owned: {isLoadingBadgeCount ? 'Loading...' : badgeCount}
            {badgeCountError ? ` (Error: ${badgeCountError.shortMessage || badgeCountError.message})` : ''}
          </p>
          {/* Gamification Tier Info */}
          <p style={{ fontWeight: 'bold' }}>
            Current Tier: {tierName} ({rewardMultiplier}x Rewards)
          </p>
          {/* Detected Keywords */}
          <p>Detected Keywords: {isLoadingQuest ? 'Loading...' : (interestKeywords || 'None')}</p>
          
          {currentView === 'main' ? (
            <>
              <button onClick={handleRewardClick} style={{ marginRight: '10px', padding: '5px 10px', marginTop: '15px' }}>
                View Ad & Get 1 ADR (Simulated)
              </button>
              <button onClick={() => refetch()} style={{ padding: '5px 10px', marginTop: '15px' }}>
                Refresh Balance
              </button>
              <button onClick={handleStartQuest} disabled={isLoadingQuest} style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}>
                Start Crypto Quest!
              </button>
              <button onClick={() => setCurrentView('tier')} style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}>
                View Tier Progress
              </button>
              <button onClick={goToPersonaPortal} style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}>
                Manage Persona
              </button>
              <button onClick={() => setCurrentView('marketplace')} style={{ padding: '5px 10px', marginTop: '15px', marginLeft: '10px' }}>
                Quest Marketplace
              </button>
              {currentPoll && (
                <div style={{ border: '1px solid blue', padding: '10px', marginTop: '15px' }}>
                  <h3>Crypto Quest!</h3>
                  <p>{currentPoll.question}</p>
                  {((currentPoll.type === 'multiple_choice') || (currentPoll.type === 'preference_poll')) && currentPoll.options ? (
                    <div>
                      {Object.entries(currentPoll.options).map(([key, value]) => (
                        <div key={key}>
                          <input
                            type="radio"
                            id={`poll_option_${key}`}
                            name="pollAnswer"
                            value={key}
                            checked={userAnswer === key}
                            onChange={(e) => setUserAnswer(e.target.value)}
                          />
                          <label htmlFor={`poll_option_${key}`}>
                            {key}: {value}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No options available. The generated poll might be invalid.</p>
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
            </>
          ) : currentView === 'tier' ? (
            <>
              <h2>Tier Progress</h2>
              <p>Your Current Tier: {tierName} ({rewardMultiplier}x Rewards)</p>
              <p>Badges Owned: {badgeCount}</p>
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
              <p>Keywords influencing your personalization:</p>
              {editedKeywords.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {editedKeywords.map((keyword, index) => {
                    const isMarked = keywordsToDelete.has(keyword);
                    return (
                      <li key={index} style={{ display: 'inline-block', background: '#eee', padding: '2px 6px', margin: '3px', borderRadius: '3px', textDecoration: isMarked ? 'line-through' : 'none', color: isMarked ? 'grey' : 'black' }}>
                        {keyword}
                        {isMarked ? (
                          <button
                            onClick={() => handleUndoDeletion(keyword)}
                            style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', fontWeight: 'bold' }}
                            title={`Undo removal of "${keyword}"`}
                          >
                            ↩
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkForDeletion(keyword)}
                            style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}
                            title={`Remove keyword: ${keyword}`}
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>No keywords saved yet. Analyze pages to build your profile!</p>
              )}
              <div style={{ marginTop: '15px' }}>
                <button onClick={handleSaveChanges} style={{ padding: '5px 10px', marginRight: '10px' }}>
                  Save Changes
                </button>
                <button onClick={() => setCurrentView('main')} style={{ padding: '5px 10px' }}>
                  Cancel
                </button>
              </div>
            </>
          ) : currentView === 'marketplace' ? (
            <>
              <h2>Quest Marketplace</h2>
              {displayedQuests.length > 0 ? (
                displayedQuests.map(quest => (
                  <div key={quest.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
                    <h3>{quest.title}</h3>
                    <p><strong>Sponsor:</strong> {quest.sponsor}</p>
                    <p>{quest.description}</p>
                    <p><strong>Reward:</strong> {quest.reward}</p>
                    <button onClick={() => handleAcceptSponsoredQuest(quest)} style={{ padding: '5px 10px', marginTop: '5px' }}>
                      Accept Quest
                    </button>
                  </div>
                ))
              ) : (
                <p>No specific quests match your current profile. Keep exploring and analyzing pages!</p>
              )}
              <button onClick={() => setCurrentView('main')} style={{ marginTop: '15px', padding: '5px 10px' }}>
                &lt; Back
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default App;
