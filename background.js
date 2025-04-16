// background.js

// Define your Groq API key here – replace with your actual key.
const GROQ_API_KEY = "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";

// Listen for messages from your content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE_DATA') {
    const pageContext = message.context;
    if (pageContext && pageContext.url && pageContext.title) {
      // Refined system prompt that forces the AI to output ONLY the valid JSON object.
      const system_prompt = `You are an AI assistant analyzing web page context (URL, Title, Content) for personalization. Perform two tasks:
1. Extract the main keywords or topics (max 5, comma-separated, e.g., "React, JavaScript, Tutorial"). If none found, use "None".
2. Generate a single multiple-choice preference/intent poll question related to these topics/content with 3 distinct options (A, B, C). Do not include a correct answer. If a poll cannot be generated, set the poll value to null.
**Your response MUST be ONLY the valid JSON object specified below.** Do NOT include any conversational text, preamble, explanation, apologies, or markdown formatting like \`\`\`json or \`\`\` outside of the JSON object itself.
Output JSON structure:
{"keywords": "extracted, keywords, here", "poll": {"type": "preference_poll", "question": "...", "options": {"A": "...", "B": "...", "C": "..."}}}
If keyword or poll generation fails, output: {"keywords": "None", "poll": null}`;

      const user_prompt = `Generate the keywords and preference poll JSON based on the following page information:

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
        max_tokens: 300
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
          
          // Extract generated content from the Groq response structure.
          let generatedContent = parsedResponse.choices &&
                                 parsedResponse.choices[0] &&
                                 parsedResponse.choices[0].message &&
                                 parsedResponse.choices[0].message.content;

          if (generatedContent) {
            generatedContent = generatedContent.trim();
            let jsonString = null;
            // Use regex to extract the JSON object (from first '{' to last '}')
            const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
              jsonString = jsonMatch[0];
              console.log("Background: Extracted potential JSON string:", jsonString);
            } else {
              console.warn("Background: Could not find JSON structure '{...}' in Groq response.", generatedContent);
              jsonString = generatedContent;
            }
            // Attempt to parse the isolated JSON string.
            try {
              const finalJson = JSON.parse(jsonString);
              if (typeof finalJson.keywords === "string" && finalJson.poll !== undefined) {
                console.log("Background: Sending analysis result:", finalJson);
                sendResponse({ analysisResult: finalJson });
              } else {
                console.error("Background: Parsed JSON structure is invalid:", finalJson);
                sendResponse({ error: 'AI response has invalid structure', details: 'Missing keywords or poll field.' });
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
  } else {
    sendResponse({ error: 'Unknown message type' });
  }
});
