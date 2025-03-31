// Side Panel JavaScript for LinkedIn Profile Enhancer

document.addEventListener('DOMContentLoaded', function() {
  // Set up tabs
  setupTabs();
  
  // Load settings from storage
  loadSettings();
  
  // Check current tab for LinkedIn profile
  checkCurrentTab();
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for messages from content script
  setupMessageListeners();
});

// Set up tab switching functionality
function setupTabs() {
  // Add click handler to tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and tab contents
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding tab content
      const tabName = tab.dataset.tab;
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// Load settings from Chrome storage
function loadSettings() {
  chrome.storage.sync.get(['gemmaApiKey', 'selectedModel', 'customQuestions', 'profileHistory', 'questionHistory'], function(result) {
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model-selection');
    
    if (result.gemmaApiKey) {
      // Show masked API key for security
      apiKeyInput.value = '••••••••' + result.gemmaApiKey.substr(-4);
      apiKeyInput.dataset.masked = 'true';
    }
    
    if (result.selectedModel) {
      // Set the selected model
      modelSelect.value = result.selectedModel;
    }
    
    // Load custom questions if available
    if (result.customQuestions) {
      displayCustomQuestions(result.customQuestions);
    }
    
    // Load history if available
    if (result.profileHistory) {
      displayProfileHistory(result.profileHistory);
    }
    
    if (result.questionHistory) {
      displayQuestionHistory(result.questionHistory);
    }
  });
}

// Check if the current tab is a LinkedIn profile
function checkCurrentTab() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      const url = tabs[0].url;
      const isLinkedInProfile = url && url.match(/https:\/\/.*\.linkedin\.com\/in\/.*/);
      
      if (isLinkedInProfile) {
        // We're on a LinkedIn profile page
        document.getElementById('profile-content').style.display = 'block';
        document.getElementById('profile-status-container').style.display = 'none';
        
        // Ask the content script for profile data
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getProfileInfo'}, function(response) {
          if (response && response.name) {
            document.getElementById('profile-name').textContent = response.name;
            document.getElementById('profile-headline').textContent = response.headline || '';
            
            // Add profile to history
            addProfileToHistory({
              name: response.name,
              headline: response.headline || '',
              url: url
            });
          } else {
            // Fallback if we can't get the info yet
            document.getElementById('profile-name').textContent = 'LinkedIn Profile';
            document.getElementById('profile-headline').textContent = 'Navigate to a profile to see details';
          }
        });
      } else {
        // Not on a LinkedIn profile
        document.getElementById('profile-content').style.display = 'none';
        document.getElementById('profile-status-container').style.display = 'block';
        document.getElementById('profile-status-container').innerHTML = `
          <div class="not-on-profile">
            <strong>Not on a LinkedIn profile</strong>
            <p>Please navigate to a LinkedIn profile to use the analyzer.</p>
          </div>
        `;
      }
    }
  });
  
  // Set up a listener to detect tab URL changes
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      checkCurrentTab();
    }
  });
}

// Set up event listeners for button clicks and form submissions
function setupEventListeners() {
  // Save settings
  document.getElementById('save-settings-button').addEventListener('click', saveSettings);
  
  // Clear the API key input field when clicked if it's masked
  document.getElementById('api-key').addEventListener('focus', function() {
    if (this.dataset.masked === 'true') {
      this.value = '';
      this.dataset.masked = 'false';
    }
  });
  
  // Save custom question
  document.getElementById('save-question-button').addEventListener('click', saveCustomQuestion);
  
  // Process the profile analysis button
  document.getElementById('analyze-profile-btn').addEventListener('click', analyzeProfile);
  
  // Handle question form submission
  document.getElementById('question-form').addEventListener('submit', function(e) {
    e.preventDefault();
    askQuestion();
  });

  // Clear history button
  document.getElementById('clear-history-button').addEventListener('click', clearHistory);
}

// Set up listeners for messages from content script
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'profileDataExtracted') {
      // Profile data has been extracted by the content script
      handleProfileData(message.data);
    }
    
    if (message.action === 'profilePageUpdated') {
      // Profile page has changed, refresh the UI
      console.log('Profile page updated:', message.url);
      checkCurrentTab();
    }
  });
}

// Save settings to Chrome storage
function saveSettings() {
  const apiKey = document.getElementById('api-key').value.trim();
  const selectedModel = document.getElementById('model-selection').value;
  
  // Don't save API key if the field is empty or still masked
  const saveData = {};
  
  if (apiKey && document.getElementById('api-key').dataset.masked !== 'true') {
    saveData.gemmaApiKey = apiKey;
  }
  
  // Always save the selected model
  saveData.selectedModel = selectedModel;
  
  // Only proceed if we have data to save
  if (Object.keys(saveData).length === 0) {
    return;
  }
  
  // Save to Chrome storage
  chrome.storage.sync.set(saveData, function() {
    // Show success message
    const successMessage = document.getElementById('settings-success-message');
    successMessage.style.display = 'block';
    
    // Hide the message after 3 seconds
    setTimeout(function() {
      successMessage.style.display = 'none';
    }, 3000);
    
    // Mask the API key for security if it was updated
    if (saveData.gemmaApiKey) {
      document.getElementById('api-key').value = '••••••••' + apiKey.substr(-4);
      document.getElementById('api-key').dataset.masked = 'true';
    }
  });
}

// Save a custom question to Chrome storage
function saveCustomQuestion() {
  const questionName = document.getElementById('question-name').value.trim();
  const questionText = document.getElementById('question-text').value.trim();
  
  // Basic validation
  if (!questionName || !questionText) {
    alert('Please enter both a name and text for your custom question.');
    return;
  }
  
  // Get existing questions from storage
  chrome.storage.sync.get(['customQuestions'], function(result) {
    let customQuestions = result.customQuestions || [];
    
    // Add new question with unique ID
    const newQuestion = {
      id: Date.now().toString(), // Use timestamp as a simple unique ID
      name: questionName,
      text: questionText
    };
    
    customQuestions.push(newQuestion);
    
    // Save updated questions to storage
    chrome.storage.sync.set({ customQuestions: customQuestions }, function() {
      // Show success message
      const successMessage = document.getElementById('question-success-message');
      successMessage.style.display = 'block';
      
      // Hide the message after 3 seconds
      setTimeout(function() {
        successMessage.style.display = 'none';
      }, 3000);
      
      // Clear input fields
      document.getElementById('question-name').value = '';
      document.getElementById('question-text').value = '';
      
      // Update the displayed list
      displayCustomQuestions(customQuestions);
    });
  });
}

// Display the list of custom questions
function displayCustomQuestions(questions) {
  const questionsList = document.getElementById('questions-list');
  
  // Clear the current content
  questionsList.innerHTML = '';
  
  // If no questions, show placeholder text
  if (!questions || questions.length === 0) {
    questionsList.innerHTML = '<div class="no-questions">No custom questions saved yet.</div>';
    return;
  }
  
  // Add each question to the list
  questions.forEach(question => {
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.dataset.id = question.id;
    
    questionItem.innerHTML = `
      <div class="question-content">
        <div class="question-name">${escapeHtml(question.name)}</div>
        <div class="question-text">${escapeHtml(question.text)}</div>
      </div>
      <div class="question-actions">
        <button class="btn-icon btn-delete" title="Delete Question">×</button>
      </div>
    `;
    
    // Add event listener to delete button
    questionItem.querySelector('.btn-delete').addEventListener('click', function() {
      deleteCustomQuestion(question.id);
    });
    
    questionsList.appendChild(questionItem);
  });
  
  // Also update the custom questions in the profile tab
  updateCustomQuestionsUI(questions);
}

// Update the custom questions buttons in the Profile tab
function updateCustomQuestionsUI(questions) {
  const container = document.getElementById('custom-questions-container');
  
  // Clear the container
  container.innerHTML = '';
  
  // If no questions, show a message
  if (!questions || questions.length === 0) {
    container.innerHTML = `
      <div class="gemma-empty-state">
        <p>No custom questions yet.</p>
        <p class="gemma-hint">Create custom questions in the Custom Questions tab.</p>
      </div>
    `;
    return;
  }
  
  // Get API key to check if buttons should be enabled
  chrome.storage.sync.get(['gemmaApiKey'], function(result) {
    const apiKey = result.gemmaApiKey;
    
    // Create a button for each custom question
    questions.forEach(question => {
      const questionButton = document.createElement('button');
      questionButton.className = 'gemma-btn gemma-custom-question-btn';
      questionButton.title = question.text;
      questionButton.textContent = question.name;
      if (!apiKey) questionButton.disabled = true;
      
      // Add event listener to execute the custom question
      questionButton.addEventListener('click', () => {
        executeCustomQuestion(question);
      });
      
      container.appendChild(questionButton);
    });
  });
}

// Delete a custom question
function deleteCustomQuestion(questionId) {
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this custom question?')) {
    return;
  }
  
  // Get existing questions from storage
  chrome.storage.sync.get(['customQuestions'], function(result) {
    let customQuestions = result.customQuestions || [];
    
    // Filter out the question to delete
    customQuestions = customQuestions.filter(q => q.id !== questionId);
    
    // Save updated questions to storage
    chrome.storage.sync.set({ customQuestions: customQuestions }, function() {
      // Update the displayed list
      displayCustomQuestions(customQuestions);
    });
  });
}

// Analyze profile using the AI model
function analyzeProfile() {
  // Show loading state
  const loadingElement = document.getElementById('analysis-loading');
  loadingElement.style.display = 'flex';
  loadingElement.querySelector('span').textContent = 'Extracting profile data...';
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      // Ask content script to extract profile data
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extractProfileData'}, function(response) {
        if (response && response.success) {
          loadingElement.querySelector('span').textContent = 'Analyzing profile...';
          processProfileAnalysis(response.data);
        } else {
          showError("Couldn't extract profile data. Please make sure you're on a LinkedIn profile page.");
          loadingElement.style.display = 'none';
        }
      });
    } else {
      showError("Couldn't communicate with the active tab. Please refresh the page and try again.");
      loadingElement.style.display = 'none';
    }
  });
}

// Process the profile analysis using the background script
function processProfileAnalysis(profileData) {
  // Get the API key and selected model
  chrome.storage.sync.get(['gemmaApiKey', 'selectedModel'], function(result) {
    if (!result.gemmaApiKey) {
      showError("API key not set. Please set your API key in the Settings tab.");
      document.getElementById('analysis-loading').style.display = 'none';
      return;
    }
    
    // Add profile to history
    addProfileToHistory(profileData);
    
    // Send message to background script to analyze profile
    chrome.runtime.sendMessage(
      { 
        action: 'analyzeProfile', 
        profileData: profileData, 
        apiKey: result.gemmaApiKey,
        model: result.selectedModel || 'gemma-3-27b-it'
      },
      function(response) {
        document.getElementById('analysis-loading').style.display = 'none';
        
        if (response && response.success) {
          const resultsContainer = document.getElementById('analysis-results');
          resultsContainer.innerHTML = `<div class="gemma-result-card">${formatResponse(response.data)}</div>`;
          
          // Add the profile analysis as a question to history
          addQuestionToHistory(profileData, "Profile Analysis", response.data);
        } else {
          showError(response?.error || "An error occurred during analysis.");
        }
      }
    );
  });
}

// Ask a custom question about the profile
function askQuestion() {
  const questionInput = document.getElementById('question-input');
  const question = questionInput.value.trim();
  
  if (!question) {
    showError("Please enter a question.");
    return;
  }
  
  // Show loading state
  const loadingElement = document.getElementById('question-loading');
  loadingElement.style.display = 'flex';
  loadingElement.querySelector('span').textContent = 'Extracting profile data...';
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      // Ask content script to extract profile data
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extractProfileData'}, function(response) {
        if (response && response.success) {
          loadingElement.querySelector('span').textContent = 'Getting answer...';
          processQuestion(response.data, question);
        } else {
          showError("Couldn't extract profile data. Please make sure you're on a LinkedIn profile page.");
          loadingElement.style.display = 'none';
        }
      });
    } else {
      showError("Couldn't communicate with the active tab. Please refresh the page and try again.");
      loadingElement.style.display = 'none';
    }
  });
}

// Process a custom question using the background script
function processQuestion(profileData, question) {
  // Get the API key and selected model
  chrome.storage.sync.get(['gemmaApiKey', 'selectedModel'], function(result) {
    if (!result.gemmaApiKey) {
      showError("API key not set. Please set your API key in the Settings tab.");
      document.getElementById('question-loading').style.display = 'none';
      return;
    }
    
    // Add profile to history
    addProfileToHistory(profileData);
    
    // Send message to background script to ask the question
    chrome.runtime.sendMessage(
      { 
        action: 'askQuestion', 
        profileData: profileData, 
        question: question,
        apiKey: result.gemmaApiKey,
        model: result.selectedModel || 'gemma-3-27b-it'
      },
      function(response) {
        document.getElementById('question-loading').style.display = 'none';
        
        if (response && response.success) {
          const resultsContainer = document.getElementById('question-results');
          
          // Create a new result card and prepend it to the results
          const resultCard = document.createElement('div');
          resultCard.className = 'gemma-result-card';
          resultCard.innerHTML = `
            <div class="gemma-question">Q: ${escapeHtml(question)}</div>
            <div class="gemma-answer">${formatResponse(response.data)}</div>
          `;
          
          // Clear input field
          document.getElementById('question-input').value = '';
          
          // Add the new result card
          resultsContainer.insertBefore(resultCard, resultsContainer.firstChild);
          
          // Add question to history
          addQuestionToHistory(profileData, question, response.data);
        } else {
          showError(response?.error || "An error occurred while processing your question.");
        }
      }
    );
  });
}

// Execute a custom question
function executeCustomQuestion(question) {
  // First update the UI to show we're processing the question
  document.getElementById('question-loading').style.display = 'flex';
  document.getElementById('question-loading').querySelector('span').textContent = 'Extracting profile data...';
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      // Ask content script to extract profile data
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extractProfileData'}, function(response) {
        if (response && response.success) {
          document.getElementById('question-loading').querySelector('span').textContent = 'Processing: ' + question.name;
          
          // Add profile to history
          addProfileToHistory(response.data);
          
          // Get the API key and selected model
          chrome.storage.sync.get(['gemmaApiKey', 'selectedModel'], function(result) {
            if (!result.gemmaApiKey) {
              showError("API key not set. Please set your API key in the Settings tab.");
              document.getElementById('question-loading').style.display = 'none';
              return;
            }
            
            // Send message to background script to ask the custom question
            chrome.runtime.sendMessage(
              { 
                action: 'askQuestion', 
                profileData: response.data, 
                question: question.text,
                apiKey: result.gemmaApiKey,
                model: result.selectedModel || 'gemma-3-27b-it'
              },
              function(apiResponse) {
                document.getElementById('question-loading').style.display = 'none';
                
                if (apiResponse && apiResponse.success) {
                  const resultsContainer = document.getElementById('question-results');
                  
                  // Create a new result card and prepend it to the results
                  const resultCard = document.createElement('div');
                  resultCard.className = 'gemma-result-card';
                  resultCard.innerHTML = `
                    <div class="gemma-question">Q: ${escapeHtml(question.name)}: ${escapeHtml(question.text)}</div>
                    <div class="gemma-answer">${formatResponse(apiResponse.data)}</div>
                  `;
                  
                  // Add the new result card
                  resultsContainer.insertBefore(resultCard, resultsContainer.firstChild);
                  
                  // Add custom question to history
                  const historyQuestion = `${question.name}: ${question.text}`;
                  addQuestionToHistory(response.data, historyQuestion, apiResponse.data);
                } else {
                  showError(apiResponse?.error || "An error occurred while processing your question.");
                }
              }
            );
          });
        } else {
          showError("Couldn't extract profile data. Please make sure you're on a LinkedIn profile page.");
          document.getElementById('question-loading').style.display = 'none';
        }
      });
    } else {
      showError("Couldn't communicate with the active tab. Please refresh the page and try again.");
      document.getElementById('question-loading').style.display = 'none';
    }
  });
}

// Format response text with simple Markdown-like formatting
function formatResponse(text) {
  if (!text) return '';
  
  // Convert line breaks to paragraphs
  text = text.split('\n\n').map(para => 
    para.trim() ? `<p>${para.trim()}</p>` : ''
  ).join('');
  
  // Convert single line breaks within paragraphs
  text = text.replace(/<p>(.*?)\n(.*?)<\/p>/g, '<p>$1<br>$2</p>');
  
  // Make lists
  text = text.replace(/<p>(\s*[-•]\s+.*?)<\/p>/g, '<ul><li>$1</li></ul>');
  text = text.replace(/<li>(.*?)<\/li><\/ul>\s*<ul><li>/g, '<li>$1</li><li>');
  
  // Bold text between ** or __
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic text between * or _
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');
  
  return text;
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'not-on-profile';
  errorDiv.style.backgroundColor = '#fef2f2';
  errorDiv.style.color = '#b91c1c';
  errorDiv.innerHTML = `<strong>Error:</strong> ${escapeHtml(message)}`;
  
  // If we have a profile tab, show it there
  const profileTab = document.getElementById('profile-tab');
  profileTab.insertBefore(errorDiv, profileTab.firstChild);
  
  // Remove error after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Display profile history in the History tab
function displayProfileHistory(profileHistory) {
  const profileHistoryList = document.getElementById('profile-history-list');
  
  // Clear current content
  profileHistoryList.innerHTML = '';
  
  // If no history, show placeholder
  if (!profileHistory || profileHistory.length === 0) {
    profileHistoryList.innerHTML = '<div class="no-history">No profile history yet.</div>';
    return;
  }
  
  // Sort history items by timestamp (newest first)
  profileHistory.sort((a, b) => b.timestamp - a.timestamp);
  
  // Show only the last 20 entries to keep the list manageable
  const recentHistory = profileHistory.slice(0, 20);
  
  // Add each history item to the list
  recentHistory.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleString();
    
    historyItem.innerHTML = `
      <div class="history-profile-name">${escapeHtml(item.name)}</div>
      <div class="history-headline">${escapeHtml(item.headline || '')}</div>
      <div class="history-timestamp">${formattedDate}</div>
    `;
    
    profileHistoryList.appendChild(historyItem);
  });
}

// Display question history in the History tab
function displayQuestionHistory(questionHistory) {
  const questionHistoryList = document.getElementById('question-history-list');
  
  // Clear current content
  questionHistoryList.innerHTML = '';
  
  // If no history, show placeholder
  if (!questionHistory || questionHistory.length === 0) {
    questionHistoryList.innerHTML = '<div class="no-history">No question history yet.</div>';
    return;
  }
  
  // Sort history items by timestamp (newest first)
  questionHistory.sort((a, b) => b.timestamp - a.timestamp);
  
  // Show only the last 20 entries to keep the list manageable
  const recentHistory = questionHistory.slice(0, 20);
  
  // Add each history item to the list
  recentHistory.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleString();
    
    historyItem.innerHTML = `
      <div class="history-question">${escapeHtml(item.question)}</div>
      <div class="history-answer">${escapeHtml(item.answer.substring(0, 150))}${item.answer.length > 150 ? '...' : ''}</div>
      <div class="history-profile-name">${escapeHtml(item.profileName)}</div>
      <div class="history-timestamp">${formattedDate}</div>
    `;
    
    questionHistoryList.appendChild(historyItem);
  });
}

// Add a profile to history
function addProfileToHistory(profileData) {
  if (!profileData || !profileData.name) return;
  
  chrome.storage.sync.get(['profileHistory'], function(result) {
    let profileHistory = result.profileHistory || [];
    
    // Check if this profile is already in history
    const existingIndex = profileHistory.findIndex(p => p.name === profileData.name);
    
    // Create history item
    const historyItem = {
      name: profileData.name,
      headline: profileData.headline || '',
      url: profileData.url || '',
      timestamp: Date.now()
    };
    
    // If profile exists, update it, otherwise add it
    if (existingIndex >= 0) {
      profileHistory[existingIndex] = historyItem;
    } else {
      profileHistory.push(historyItem);
    }
    
    // Keep only the most recent 50 profiles
    if (profileHistory.length > 50) {
      profileHistory = profileHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    }
    
    // Save updated history
    chrome.storage.sync.set({ profileHistory: profileHistory }, function() {
      // Update the displayed history if we're on the history tab
      if (document.querySelector('.tab[data-tab="history"]').classList.contains('active')) {
        displayProfileHistory(profileHistory);
      }
    });
  });
}

// Add a question to history
function addQuestionToHistory(profileData, question, answer) {
  if (!profileData || !question || !answer) return;
  
  chrome.storage.sync.get(['questionHistory'], function(result) {
    let questionHistory = result.questionHistory || [];
    
    // Create history item
    const historyItem = {
      profileName: profileData.name,
      profileUrl: profileData.url || '',
      question: question,
      answer: answer,
      timestamp: Date.now()
    };
    
    // Add the new question to history
    questionHistory.push(historyItem);
    
    // Keep only the most recent 50 questions
    if (questionHistory.length > 50) {
      questionHistory = questionHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    }
    
    // Save updated history
    chrome.storage.sync.set({ questionHistory: questionHistory }, function() {
      // Update the displayed history if we're on the history tab
      if (document.querySelector('.tab[data-tab="history"]').classList.contains('active')) {
        displayQuestionHistory(questionHistory);
      }
    });
  });
}

// Clear all history
function clearHistory() {
  if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    return;
  }
  
  chrome.storage.sync.set({ profileHistory: [], questionHistory: [] }, function() {
    // Update the displayed history
    displayProfileHistory([]);
    displayQuestionHistory([]);
    
    // Show confirmation
    showError('History cleared successfully.');
  });
}