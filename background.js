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
  } else if (message.type === 'INIT_SURVEY_QUEST') {
    console.log("Background: Received INIT_SURVEY_QUEST message:", message);
    const { questId, topic, length } = message;
    
    if (!questId || !topic || !length) {
      console.error("Background: Missing required fields for INIT_SURVEY_QUEST", message);
      sendResponse({ error: 'Missing required survey parameters' });
      return false;
    }
    
    const chapterSize = 5;
    const chapters = Math.ceil(length / chapterSize);
    
    const system_prompt = `
You are QuestChat-Bot, an AI generating engaging mini-surveys. Create a ${length}-question conversational survey about "${topic}" with the following structure:

1. Divide the survey into ${chapters} chapters of approximately ${chapterSize} questions each.
2. Each chapter should have:
   - A brief "intro" hook to engage the user (1-2 sentences)
   - A set of multiple-choice questions with 3 options each
3. After chapters 2 and 4 (if applicable), include special branching questions that ask "Would you like to dive deeper into [specific aspect] or skip ahead?" with options "Dive deeper" / "Skip ahead".
4. End each chapter with a brief 2-sentence "micro-story" transition to maintain engagement.

Your response must be ONLY a valid JSON object with this exact structure:
{
  "chapters": [
    {
      "chapter_id": 1,
      "intro": "Welcome to our coffee survey! Let's discover your unique coffee preferences.",
      "questions": [
        { 
          "q_id": 1, 
          "text": "How do you usually prepare your coffee?", 
          "options": { 
            "A": "Drip machine", 
            "B": "French press", 
            "C": "Espresso machine" 
          } 
        },
        ...more questions...
      ],
      "outro": "As you sip your morning brew, imagine the journey those beans took from distant mountains to your cup. Tomorrow, we'll explore how brewing methods affect your perfect cup."
    },
    ...more chapters...
  ]
}

Make sure all questions are subjective preference questions without objectively correct answers. Return ONLY the JSON with no additional text.`;

    console.log("Background: Calling Groq API for survey generation...");
    
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system_prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
        console.error("Background: Failed to parse Groq survey response:", e, "Raw response:", responseText);
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
          console.warn("Background: Could not find JSON structure in survey response:", generatedContent);
          jsonString = generatedContent;
        }
        try {
          const surveyData = JSON.parse(jsonString);
          if (surveyData.chapters && Array.isArray(surveyData.chapters)) {
            console.log("Background: Successfully generated survey chapters:", surveyData.chapters.length);
            // Flatten the questions for easier handling in frontend
            const questions = [];
            let questionCounter = 1;
            
            surveyData.chapters.forEach((chapter, chapterIndex) => {
              // Add chapter intro as a special question type
              questions.push({
                q_id: `ch${chapter.chapter_id}_intro`,
                type: "chapter_intro",
                chapter: chapter.chapter_id,
                text: chapter.intro
              });
              
              // Add regular questions
              if (Array.isArray(chapter.questions)) {
                chapter.questions.forEach(question => {
                  questions.push({
                    ...question,
                    chapter: chapter.chapter_id,
                    q_id: question.q_id || questionCounter++
                  });
                });
              }
              
              // Add branching questions after chapters 2 and 4
              if (chapter.chapter_id === 2 || chapter.chapter_id === 4) {
                questions.push({
                  q_id: `ch${chapter.chapter_id}_branch`,
                  type: "branching",
                  chapter: chapter.chapter_id,
                  text: `Would you like to dive deeper into ${topic} or skip ahead?`,
                  options: {
                    "A": "Dive deeper",
                    "B": "Skip ahead"
                  }
                });
              }
              
              // Add chapter outro as a special question type
              if (chapter.outro) {
                questions.push({
                  q_id: `ch${chapter.chapter_id}_outro`,
                  type: "chapter_outro",
                  chapter: chapter.chapter_id,
                  text: chapter.outro
                });
              }
            });
            
            sendResponse({ 
              success: true, 
              questions: questions,
              rawChapters: surveyData.chapters
            });
          } else {
            console.error("Background: Invalid survey structure:", surveyData);
            sendResponse({ 
              error: 'Survey data structure is invalid', 
              details: 'Expected array of chapters'
            });
          }
        } catch (e) {
          console.error("Background: Failed to parse survey JSON:", e, "Extracted string:", jsonString);
          sendResponse({ error: 'Failed to parse survey JSON', details: e.message });
        }
      } else {
        console.error("Background: Could not extract content from Groq survey response");
        sendResponse({ error: 'Failed to extract survey content from AI response' });
      }
    })
    .catch(error => {
      console.error("Background: Error during survey generation:", error);
      sendResponse({ error: 'Failed to generate survey', details: error.message });
    });
    
    return true; // Keep the messaging channel open for asynchronous response.
  } else if (message.type === 'INIT_SURVEY_BATCH') {
  const { topic, batchSize, offset } = message;
  const startId = offset + 1;
  console.log(`BG: INIT_SURVEY_BATCH for "${topic}", batchSize=${batchSize}, offset=${offset}`);

  const system_prompt = `
You are QuestChat‑Bot. Generate exactly ${batchSize} detailed, user‑centric multiple‑choice questions about "${topic}".
Each question must:
- Have a unique q_id starting at ${startId} (increment by 1).
- Ask for the user's perspective, challenges, motivations or preferences in depth—avoid generic, surface‑level wording.
- Include exactly 4 distinct answer options labeled "A" through "D", each representing a plausible user point of view.
- NOT repeat any question text that you generated in earlier batches.

Return ONLY a JSON array like:
[
  {
    "q_id": ${startId},
    "text": "In-depth question that probes the user's POV…",
    "options": {
      "A": "Option reflecting one perspective",
      "B": "Option reflecting a different perspective",
      "C": "Another distinct perspective",
      "D": "Yet another valid perspective"
    }
  },
  …more questions…
]
No extra text before or after the JSON.
`.trim();

  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: system_prompt }],
      temperature: 0.6,
      max_tokens: 400
    })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(errorData => {
        throw new Error(errorData.error?.message || `HTTP error! status: ${res.status}`);
      });
    }
    return res.json();
  })
  .then(data => {
    // Extract content from the response
    const content = data.choices?.[0]?.message?.content || "";
    console.log("BG: Raw parsed response content:", content);
    
    try {
      // Parse the content which should be a JSON array
      const questions = JSON.parse(content);
      
      // Validate that we got an array with the expected structure
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }
      
      if (questions.length === 0) {
        throw new Error("No questions were generated");
      }
      
      console.log(`BG: Parsed ${questions.length} questions`);
      sendResponse({ questions });
    } catch (e) {
      console.error("INIT_SURVEY_BATCH: failed to parse content as JSON:", e);
      sendResponse({ questions: [] }); // Return empty array instead of error to allow continuation
    }
  })
  .catch(err => {
    console.error("BG: INIT_SURVEY_BATCH error:", err);
    // Return empty array on errors to allow continuation instead of breaking
    sendResponse({ questions: [] });
  });

  return true;  // async
}
  else {
    sendResponse({ error: 'Unknown message type' });
  }
  return false;
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
