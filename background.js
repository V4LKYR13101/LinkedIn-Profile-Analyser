// Store API key in Chrome's storage for persistence
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["gemmaApiKey"], (result) => {
    if (!result.gemmaApiKey) {
      chrome.storage.sync.set({ gemmaApiKey: "" });
    }
  });
  
  // Set up the side panel behavior
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      path: 'sidepanel.html',
      enabled: true
    });
  }
});

// Handle extension icon click to open the side panel
chrome.action.onClicked.addListener((tab) => {
  // On extension icon click, open the side panel
  if (chrome.sidePanel) {
    chrome.sidePanel.open({windowId: tab.windowId});
  } else {
    // Fall back to the legacy behavior in browsers that don't support side panel
    chrome.runtime.openOptionsPage ? 
      chrome.runtime.openOptionsPage() :
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeProfile") {
    analyzeProfileWithGemma(request.profileData, request.apiKey, request.model)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required to use sendResponse asynchronously
  }
  
  if (request.action === "askQuestion") {
    askQuestionWithGemma(request.profileData, request.question, request.apiKey, request.model)
      .then(response => sendResponse({ 
        success: true, 
        data: response,
        questionText: request.question // Include the original question text
      }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required to use sendResponse asynchronously
  }
  
  if (request.action === "openOptionsPage") {
    if (chrome.sidePanel) {
      // Open the side panel
      chrome.sidePanel.open({windowId: sender.tab.windowId});
    } else {
      // Fall back to the legacy options page
      chrome.runtime.openOptionsPage ? 
        chrome.runtime.openOptionsPage() :
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }
    return false; // No async response needed
  }
  
  if (request.action === "profilePageChanged") {
    // Notify the side panel about profile page changes
    chrome.runtime.sendMessage({
      action: "profilePageUpdated",
      url: request.url
    });
    return false;
  }
  
  if (request.action === "openSidePanel") {
    // Automatically open the side panel when visiting a LinkedIn profile
    if (chrome.sidePanel) {
      chrome.sidePanel.open({windowId: sender.tab.windowId});
    }
    return false;
  }
});

// Helper function to handle API errors
async function handleApiError(response) {
  const errorText = await response.text();
  let errorMessage = `API request failed: ${response.status}`;
  
  // Try to parse the error JSON if possible
  try {
    const errorData = JSON.parse(errorText);
    if (errorData.error && errorData.error.message) {
      errorMessage = errorData.error.message;
    }
  } catch (e) {
    // If we can't parse JSON, use the raw error text but truncate if too long
    errorMessage += ' ' + (errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText);
  }
  
  // Provide more helpful error messages for common errors
  if (response.status === 400) {
    errorMessage = 'Invalid request: There might be an issue with the profile data format or length.';
  } else if (response.status === 401 || response.status === 403) {
    errorMessage = 'Authentication error: Your API key might be invalid or may have exceeded its quota. Please check your API key.';
  } else if (response.status === 429) {
    errorMessage = 'Rate limit exceeded: Too many requests sent to the API. Please try again later.';
  } else if (response.status >= 500) {
    errorMessage = 'API server error: The service is currently experiencing issues. Please try again later.';
  }
  
  throw new Error(errorMessage);
}

// Function to analyze profile with Gemma/Gemini/Emma model
async function analyzeProfileWithGemma(profileData, apiKey, model = 'gemma-3-27b-it') {
  if (!apiKey) {
    throw new Error("Google AI API key is not set. Please set it in the extension settings.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  const prompt = `
    I have a complete LinkedIn profile description. Please analyze it and provide a thorough yet concise 
    summary of this person's key skills, experience, background, achievements, and unique qualities.
    Format the analysis in a professional way that highlights the most important aspects. 
    
    Include a section on their core competencies and another on their career progression.
    If there are noteworthy accomplishments, please highlight those.
    
    Complete LinkedIn Profile Data:
    ${profileData}
  `;
  
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  if (!response.ok) {
    return handleApiError(response);
  }
  
  const responseData = await response.json();
  return responseData.candidates[0].content.parts[0].text;
}

// Function to ask a specific question about a profile
async function askQuestionWithGemma(profileData, question, apiKey, model = 'gemma-3-27b-it') {
  if (!apiKey) {
    throw new Error("Google AI API key is not set. Please set it in the extension settings.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  const prompt = `
    I have a complete LinkedIn profile description and a specific question about the person.
    
    Complete LinkedIn Profile Data:
    ${profileData}
    
    Question: ${question}
    
    Please provide a detailed answer to the question based only on the information available in the profile.
    Be thorough and make use of all the relevant data provided in the profile to answer the question accurately.
    If the answer cannot be determined from the information available, please clearly state that.
    Present your answer in a well-structured, professional format.
  `;
  
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  if (!response.ok) {
    return handleApiError(response);
  }
  
  const responseData = await response.json();
  return responseData.candidates[0].content.parts[0].text;
}
