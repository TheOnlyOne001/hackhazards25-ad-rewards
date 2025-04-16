// background.js

// Define your Groq API key here – replace with your actual key.
const GROQ_API_KEY = "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";

// Listen for messages from your content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE_DATA') {
    const pageContext = message.context;
    if (pageContext && pageContext.url && pageContext.title) {
      // Updated system prompt: Request keywords and a sequence of survey questions.
      const system_prompt = `You are an AI assistant analyzing web page context (URL, Title, Content) for personalization. Perform two tasks:
1. Extract the main keywords or topics (max 5, comma-separated). If none found, use "None".
2. Generate a sequence of 3 to 5 related multiple-choice questions designed to understand the user's preference, opinion, or knowledge gap regarding the main topic identified from the context and keywords. The questions should follow a logical progression if possible. Each question must have 3 distinct options (A, B, C) and should not have a single 'correct' answer verifiable from the text alone (they are for gauging user input).
Output ONLY a single valid JSON object with the structure:
{"keywords": "extracted, keywords, here", "surveyQuestions": [ {"q_id": 1, "type": "multiple_choice", "question": "...", "options": {"A": "...", "B": "...", "C": "..."}}, {"q_id": 2, "type": "multiple_choice", "question": "...", "options": {...}}, ... ]}
Ensure the entire output is valid JSON. Each question object in the array needs a unique 'q_id' starting from 1. If keyword or question generation fails, return {"keywords": "None", "surveyQuestions": []}. Do NOT include preamble or explanations outside the JSON.`;

      const user_prompt = `Generate the keywords and survey questions JSON based on the following page information:

URL: ${pageContext.url || 'N/A'}
Title: ${pageContext.title || 'N/A'}

Content Snippet:
${pageContext.content || '(No content extracted)'}`;

      const requestBody = JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: user_prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
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
              if (typeof finalJson.keywords === "string" && Array.isArray(finalJson.surveyQuestions)) {
                console.log("Background: Sending analysis result:", finalJson);
                sendResponse({ analysisResult: finalJson });
              } else {
                console.error("Background: Parsed JSON structure is invalid:", finalJson);
                sendResponse({ error: 'AI response has invalid structure', details: 'Expected \"keywords\" as a string and \"surveyQuestions\" as an array.' });
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

  } else if (message.type === 'PROCESS_SPONSORED_QUEST_COMPLETION') {
    const { questData, userAddress, currentMultiplier } = message;
    if (!questData || !questData.rewardText || !questData.sbtMetadataURI || !userAddress || typeof currentMultiplier !== 'number') {
      console.error("Background: Missing required fields for PROCESS_SPONSORED_QUEST_COMPLETION", message);
      return false;
    }

    console.log(`Background: Processing sponsored quest completion for "${questData.title}"`);

    const STORAGE_KEY = 'simulatedRewardsBalance';
    const OWNED_BADGES_STORAGE_KEY = 'ownedBadgeDetails';

    // Parse baseReward from rewardText (e.g. "XYZ SBT + 15 ADR")
    let baseReward = 5;
    const parts = questData.rewardText.split('+');
    if (parts.length > 1) {
      const adrPart = parts[1].trim().split(' ')[0];
      const parsedNum = parseInt(adrPart, 10);
      if (!isNaN(parsedNum)) {
        baseReward = parsedNum;
      }
    } else {
      const match = questData.rewardText.match(/(\d+)/);
      if (match && !isNaN(parseInt(match[1], 10))) {
        baseReward = parseInt(match[1], 10);
      }
    }
    const actualReward = baseReward * currentMultiplier;

    const metadataURI = questData.sbtMetadataURI || '';
    const backendUrl = 'http://localhost:3001/mint-badge';
    const secret = 'Hkz25!zXcVbNm1jL';

    // Call backend minting service
    (async () => {
      try {
        const apiResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Secret': secret
          },
          body: JSON.stringify({
            recipientAddress: userAddress,
            metadataURI: metadataURI
          })
        });

        const responseData = await apiResponse.json();

        if (apiResponse.ok && responseData.success && responseData.tokenId) {
          console.log(`Background: Badge minted successfully, tokenId: ${responseData.tokenId}`);

          // Retrieve current simulated balance and owned badges
          chrome.storage.local.get([STORAGE_KEY, OWNED_BADGES_STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
              console.error("Background: Error getting storage data:", chrome.runtime.lastError);
              return;
            }

            const previousBalance = result[STORAGE_KEY] || 0;
            const previousBadges = Array.isArray(result[OWNED_BADGES_STORAGE_KEY])
              ? result[OWNED_BADGES_STORAGE_KEY]
              : [];

            const newSimulatedAmount = previousBalance + actualReward;
            const newBadge = { id: responseData.tokenId, uri: metadataURI };

            // Ensure uniqueness by tokenId
            const badgeIds = new Set(previousBadges.map(b => b.id));
            if (!badgeIds.has(newBadge.id)) {
              previousBadges.push(newBadge);
            }
            const updatedBadges = previousBadges;

            // Save updated values back to storage
            chrome.storage.local.set({
              [STORAGE_KEY]: newSimulatedAmount,
              [OWNED_BADGES_STORAGE_KEY]: updatedBadges
            }, () => {
              if (chrome.runtime.lastError) {
                console.error("Background: Error saving storage data:", chrome.runtime.lastError);
              } else {
                console.log("Background: Updated storage with new reward and badge:", newSimulatedAmount, updatedBadges);
              }
            });
          });

        } else {
          console.error("Background: Backend minting failed:", responseData.error || 'Unknown error', responseData);
        }

      } catch (error) {
        console.error("Background: Network or unexpected error during minting:", error);
      }
    })();

    return true;

  } else {
    sendResponse({ error: 'Unknown message type' });
  }
});

// Log service worker startup
console.log("Background service worker started...");
