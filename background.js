// background.js

// Define your Groq API key here – replace with your actual key.
const GROQ_API_KEY = "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";
const API_SECRET = "Hkz25!zXcVbNm1jL"; // Secret for backend API calls
const ACTIVE_QUEST_STORAGE_KEY = 'activeQuestState';
const OWNED_BADGES_STORAGE_KEY = 'ownedBadgeDetails';

// Listen for messages from your content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE_DATA') {
    const pageContext = message.context;
    if (pageContext && pageContext.url && pageContext.title) {
      // 1. Updated system prompt to request separate display and detailed keywords
      const system_prompt = `
You are an AI assistant analyzing web page context (URL, Title, Content) for personalization.
Perform three tasks:
1. Extract up to 5 high‑level topics for quick display: return as an array of strings under "displayKeywords".
2. Extract a more comprehensive list of up to 15 detailed terms, entities, or concepts: return as an array of strings under "detailedKeywords".
3. Generate 3-5 multiple-choice questions designed to understand the user's needs, challenges, preferences, or potential purchase/engagement intent regarding the page's main topic. The insights should be useful for matching relevant sponsored quests or advertisements.

IMPORTANT INSTRUCTIONS FOR SURVEY QUESTIONS:
- Questions must remain subjective, asking for the user's perspective, and should not have a single objectively correct answer.
- Avoid overly broad questions like "Did you like this page?". Focus on actionable insights.
- Generate questions related to:
  * The user's current challenges or goals related to the topic (e.g., "What's your biggest hurdle with [topic]?").
  * Their interest level in specific solutions or features (e.g., "Which feature of [product type] is most important to you?").
  * Their current stage (e.g., "Are you currently researching solutions for [problem]?").
  * Their preferences between different approaches or types of solutions related to the topic.
- Ensure options represent a range of plausible user preferences or needs, not factual correctness.
- Do NOT generate questions that ask for definitions, facts, historical details, technical specifications, or any information with a single correct answer.

Output ONLY a single valid JSON object with this exact structure:
{
  "displayKeywords": ["topic1", "topic2", "..."],
  "detailedKeywords": ["term1", "EntityName", "..."],
  "surveyQuestions": [
    {
      "q_id": 1,
      "type": "multiple_choice",
      "question": "...",
      "options": { "A": "...", "B": "...", "C": "..." }
    },
    ...
  ]
}
`.trim();

      const user_prompt = `
Generate the JSON based on this page:
URL: ${pageContext.url}
Title: ${pageContext.title}
Content Snippet:
${pageContext.content || "(no content)"}
`.trim();

      const requestBody = JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt }
        ],
        temperature: 0.7,
        max_tokens: 600
      });

      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: requestBody
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(responseText => {
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (e) {
          console.error("Background: Failed to parse Groq response text:", e, "Raw response:", responseText);
          sendResponse({ error: 'Failed to parse Groq response', details: e.message });
          return;
        }
        
        let generatedContent = parsedResponse.choices &&
                               parsedResponse.choices[0] &&
                               parsedResponse.choices[0].message &&
                               parsedResponse.choices[0].message.content;

        if (generatedContent) {
          generatedContent = generatedContent.trim();
          let jsonString = null;
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch && jsonMatch[0]) {
            jsonString = jsonMatch[0];
          } else {
            console.warn("Background: Could not find JSON structure '{...}' in Groq response.", generatedContent);
            jsonString = generatedContent;
          }
          try {
            const finalJson = JSON.parse(jsonString);
            if (
              Array.isArray(finalJson.displayKeywords) &&
              Array.isArray(finalJson.detailedKeywords) &&
              Array.isArray(finalJson.surveyQuestions)
            ) {
              console.log("Background: Sending analysis result:", finalJson);
              sendResponse({ analysisResult: finalJson });
            } else {
              console.error("Background: Parsed JSON structure is invalid:", finalJson);
              sendResponse({ 
                error: 'AI response has invalid structure', 
                details: 'Expected "displayKeywords[]", "detailedKeywords[]", and "surveyQuestions[]".' 
              });
            }
          } catch (e) {
            console.error("Background: Failed to parse extracted JSON content:", e, "--- Extracted String was:", jsonString);
            sendResponse({ error: 'Failed to parse AI content', details: e.message });
          }
        } else {
          console.error("Background: Could not extract content from Groq response structure.");
          sendResponse({ error: 'Failed to extract content from AI response' });
        }
      })
      .catch(error => {
        console.error("Background: Error during Groq API call:", error);
        sendResponse({ error: 'Failed to generate analysis', details: error.message });
      });

      return true; // Keep the messaging channel open for asynchronous response.
    } else {
      sendResponse({ error: 'Invalid page context' });
      return false;
    }

  } else if (message.type === 'GET_LEARNING_PATH') {
    // Placeholder handling for GET_LEARNING_PATH
    sendResponse({ path: [] });
    return true;

  } else if (message.type === 'START_QUEST_TIMER') {
    const { questState } = message;
    if (!questState || !questState.questId || typeof questState.completionDelaySeconds !== 'number') {
      console.error("Background: Invalid quest state for START_QUEST_TIMER", message);
      sendResponse({ success: false, error: 'Invalid quest state' });
      return false;
    }
    const alarmName = `questCompletionAlarm_${questState.questId}`;
    const delayInMinutes = Math.max(1, Math.ceil(questState.completionDelaySeconds / 60));
    // clear any existing alarm with the same name
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { delayInMinutes });
    console.log(`Background: Alarm '${alarmName}' created for ${delayInMinutes} minutes.`);
    sendResponse({ success: true, alarmName });
    return true;

  } else if (message.type === 'PROCESS_SPONSORED_QUEST_COMPLETION') {
    const { questData, userAddress, currentMultiplier } = message;
    if (!questData || !questData.rewardText || !questData.sbtMetadataURI || !userAddress || typeof currentMultiplier !== 'number') {
      console.error("Background: Missing required fields for PROCESS_SPONSORED_QUEST_COMPLETION", message);
      sendResponse({ success: false, error: 'Missing required quest data' });
      return true;
    }

    console.log(`Background: Processing sponsored quest completion for "${questData.title}"`);
    console.log(`Background: Badge metadata URI: ${questData.sbtMetadataURI}`);

    const metadataURI = questData.sbtMetadataURI || '';
    const backendUrl = 'http://localhost:3001/mint-badge';

    // Call backend minting service
    (async () => {
      try {
        console.log(`Background: Calling backend to mint badge for address ${userAddress}`);
        
        const apiResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Secret': API_SECRET
          },
          body: JSON.stringify({
            recipientAddress: userAddress,
            metadataURI: metadataURI
          })
        });

        if (!apiResponse.ok) {
          throw new Error(`Backend responded with status: ${apiResponse.status}`);
        }

        const responseData = await apiResponse.json();

        if (responseData.success && responseData.tokenId) {
          console.log(`Background: Badge minted successfully, tokenId: ${responseData.tokenId}`);
          
          // Only update owned badges storage (no longer updating simulated rewards)
          chrome.storage.local.get([OWNED_BADGES_STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
              console.error("Background: Error getting badges storage:", chrome.runtime.lastError);
              sendResponse({ success: false, error: 'Error retrieving badge data from storage' });
              return;
            }

            const previousBadges = Array.isArray(result[OWNED_BADGES_STORAGE_KEY])
              ? result[OWNED_BADGES_STORAGE_KEY]
              : [];

            const newBadge = { 
              id: responseData.tokenId, 
              uri: metadataURI,
              title: questData.title || "Quest Badge",
              description: `Earned by completing quest: ${questData.title}`,
              txHash: responseData.transactionHash,
              timestamp: new Date().toISOString()
            };

            // Ensure uniqueness by tokenId
            const badgeIds = new Set(previousBadges.map(b => b.id));
            if (!badgeIds.has(newBadge.id)) {
              previousBadges.push(newBadge);
            }
            const updatedBadges = previousBadges;

            // Save updated badges back to storage
            chrome.storage.local.set({
              [OWNED_BADGES_STORAGE_KEY]: updatedBadges
            }, () => {
              if (chrome.runtime.lastError) {
                console.error("Background: Error saving badge data:", chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Error saving badge data to storage' });
              } else {
                console.log("Background: Updated storage with new badge, count:", updatedBadges.length);
                sendResponse({ 
                  success: true, 
                  tokenId: responseData.tokenId,
                  transactionHash: responseData.transactionHash
                });
              }
            });
          });
        } else {
          console.error("Background: Backend minting failed:", responseData.error || 'Unknown error', responseData);
          sendResponse({ success: false, error: responseData.error || 'Badge minting failed' });
        }
      } catch (error) {
        console.error("Background: Network or unexpected error during minting:", error);
        sendResponse({ success: false, error: error.message || 'Network error during minting' });
      }
    })();

    return true; // Async response pattern

  } else if (message.type === 'DISTRIBUTE_PERS_REWARD') {
    const { recipientAddress, amountString } = message;
    
    // Input validation
    if (!recipientAddress || !amountString) {
      console.error("Background: Missing required fields for DISTRIBUTE_PERS_REWARD", message);
      sendResponse({ success: false, error: 'Missing recipient address or amount' });
      return false;
    }
    
    // Validate amount is a positive number
    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) {
      console.error("Background: Invalid amount for DISTRIBUTE_PERS_REWARD", amountString);
      sendResponse({ success: false, error: 'Amount must be a positive number' });
      return false;
    }
    
    console.log(`Background: Processing PERS token distribution of ${amountString} to ${recipientAddress}`);
    
    const backendUrl = 'http://localhost:3001/distribute-pers';
    
    // Call backend distribution service
    (async () => {
      try {
        console.log(`Background: Calling ${backendUrl} to distribute PERS tokens...`);
        
        const apiResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Secret': API_SECRET
          },
          body: JSON.stringify({
            recipientAddress: recipientAddress,
            amountString: amountString
          })
        });
        
        if (!apiResponse.ok) {
          throw new Error(`Backend responded with status: ${apiResponse.status}`);
        }
        
        const responseData = await apiResponse.json();
        console.log("Background: PERS distribution response:", responseData);
        
        if (responseData.success) {
          console.log(`Background: PERS distribution successful! Tx Hash: ${responseData.transactionHash}`);
          sendResponse({ 
            success: true, 
            message: responseData.message || `Successfully transferred ${amountString} PERS tokens`,
            transactionHash: responseData.transactionHash
          });
        } else {
          console.error("Background: Backend PERS distribution failed:", responseData.error || 'Unknown error');
          sendResponse({ 
            success: false, 
            error: responseData.error || 'Backend distribution failed' 
          });
        }
      } catch (error) {
        console.error("Background: Network or unexpected error during PERS distribution:", error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Network error distributing reward' 
        });
      }
    })();
    
    return true; // Keep messaging channel open for async response

  } else if (message.type === 'GET_VERIFICATION_MCQ') {
    console.log("BG: Received GET_VERIFICATION_MCQ message:", message);
    
    // Extract topic or keywords from message
    const topicOrKeywords = message.topic || message.keywords || "general knowledge";
    
    const system_prompt = `You are an AI assistant creating a verification question. 
  Generate exactly ONE multiple-choice question related to the topic or keywords provided.
  Your response must be ONLY a valid JSON object with this exact structure:
  {
    "question": "The clear, specific question text here",
    "options": {
      "A": "First option text",
      "B": "Second option text",
      "C": "Third option text"
    },
    "correctAnswer": "A"
  }
  
  The correctAnswer field must be one of the option keys (A, B, or C).
  Make sure the question is specific enough that only one answer is clearly correct.
  Return ONLY the JSON object with no additional text before or after.`;
  
    const user_prompt = `Create a verification multiple-choice question about the following topic or keywords: ${topicOrKeywords}`;
  
    console.log("BG: Calling Groq for verification MCQ...");
    
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(responseText => {
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (e) {
          console.error("BG: Failed to parse Groq response text:", e, "Raw response:", responseText);
          sendResponse({ error: 'Failed to parse Groq response', details: e.message });
          return;
        }
        
        let generatedContent = parsedResponse.choices &&
                               parsedResponse.choices[0] &&
                               parsedResponse.choices[0].message &&
                               parsedResponse.choices[0].message.content;
  
        if (generatedContent) {
          generatedContent = generatedContent.trim();
          let jsonString = null;
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch && jsonMatch[0]) {
            jsonString = jsonMatch[0];
          } else {
            console.warn("BG: Could not find JSON structure '{...}' in Groq response.", generatedContent);
            jsonString = generatedContent;
          }
          try {
            const finalJson = JSON.parse(jsonString);
            if (finalJson.question && finalJson.options && finalJson.correctAnswer) {
              console.log("BG: Successfully generated MCQ, sending back:", finalJson);
              sendResponse({ mcqData: finalJson });
            } else {
              console.error("BG: Parsed JSON structure is invalid:", finalJson);
              sendResponse({ error: 'AI response has invalid MCQ structure', details: 'Expected "question", "options", and "correctAnswer" properties.' });
            }
          } catch (e) {
            console.error("BG: Failed to parse extracted JSON content:", e, "--- Extracted String was:", jsonString);
            sendResponse({ error: 'Failed to parse MCQ JSON content', details: e.message });
          }
        } else {
          console.error("BG: Could not extract content from Groq response structure.");
          sendResponse({ error: 'Failed to extract content from AI response' });
        }
      })
      .catch(error => {
        console.error("BG: Error during Groq API call for MCQ:", error);
        sendResponse({ error: 'Failed to generate verification question', details: error.message });
      });
  
    return true; // Keep the messaging channel open for asynchronous response.
  } else {
    sendResponse({ error: 'Unknown message type' });
  }
});

// Listen for alarms to update quest state
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('questCompletionAlarm_')) {
    const questId = alarm.name.split('_')[1];
    console.log(`Background: Alarm fired for quest ${questId}`);
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get([ACTIVE_QUEST_STORAGE_KEY], res => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        });
      });
      const storedState = result[ACTIVE_QUEST_STORAGE_KEY];
      if (
        storedState &&
        storedState.questId === parseInt(questId, 10) &&
        storedState.status === 'pending_timer'
      ) {
        console.log("Background: Updating quest state to 'ready_to_verify'", storedState);
        storedState.status = 'ready_to_verify';
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [ACTIVE_QUEST_STORAGE_KEY]: storedState }, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
          });
        });
        console.log("Background: Quest state updated in storage");
      } else {
        console.warn("Background: No matching active quest state to update for alarm", storedState);
      }
    } catch (error) {
      console.error("Background: Error handling quest timer alarm:", error);
    }
  }
});

// Log service worker startup
console.log("Background service worker started...");
