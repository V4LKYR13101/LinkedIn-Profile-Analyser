document.addEventListener('DOMContentLoaded', function() {
  // Set up tabs
  setupTabs();
  
  // Load settings from storage when popup opens
  chrome.storage.sync.get(['gemmaApiKey', 'selectedModel', 'customQuestions'], function(result) {
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
  });
  
  // Clear the input field when clicked if it's showing a masked key
  document.getElementById('api-key').addEventListener('focus', function() {
    if (this.dataset.masked === 'true') {
      this.value = '';
      this.dataset.masked = 'false';
    }
  });
  
  // Save settings when save button is clicked
  document.getElementById('save-button').addEventListener('click', saveSettings);
  
  // Also save when Enter key is pressed in the input field
  document.getElementById('api-key').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });
  
  // Save custom question when button is clicked
  document.getElementById('save-question-button').addEventListener('click', saveCustomQuestion);
  
  // Also save custom question when Enter key is pressed in the textarea
  document.getElementById('question-text').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveCustomQuestion();
    }
  });
  
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
      const successMessage = document.getElementById('success-message');
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
  }
  
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
  
  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
