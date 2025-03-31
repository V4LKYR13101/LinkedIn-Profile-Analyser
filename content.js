// LinkedIn profiles can load dynamically, so we need multiple init strategies
document.addEventListener('DOMContentLoaded', initializeExtension);
window.addEventListener('load', initializeExtension);

// Fallback timeout for initial page load
setTimeout(initializeExtension, 1500);

// LinkedIn uses client-side routing, so we need to detect URL changes
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('LinkedIn page navigation detected: ', url);
    
    // Check if we're now on a profile page
    if (url.includes('linkedin.com/in/')) {
      // Allow small delay for DOM to update
      setTimeout(initializeExtension, 1000);
      
      // Notify the side panel about URL change if it's open
      chrome.runtime.sendMessage({
        action: 'profilePageChanged',
        url: url
      });
    }
  }
}).observe(document, {subtree: true, childList: true});

// Initialize the extension
function initializeExtension() {
  // Check if we're on a LinkedIn profile page
  if (!window.location.href.includes('linkedin.com/in/')) {
    return;
  }
  
  // Automatically open the side panel when on a LinkedIn profile
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
}

// Extract profile data from LinkedIn page
function extractProfileData() {
  console.log('Extracting LinkedIn profile data...');
  let profileData = '';
  
  // Get the name (common across all LinkedIn profiles)
  const nameElement = document.querySelector('h1.text-heading-xlarge');
  if (nameElement) {
    const name = nameElement.textContent.trim();
    profileData += `Name: ${name}\n`;
    console.log('Found profile name:', name);
  }
  
  // Get the headline (common across all LinkedIn profiles)
  const headlineElement = document.querySelector('div.text-body-medium');
  if (headlineElement) {
    const headline = headlineElement.textContent.trim();
    profileData += `Headline: ${headline}\n\n`;
    console.log('Found profile headline:', headline);
  }
  
  // STEP 1: First try to expand all "see more" and "show more" buttons to reveal hidden content
  try {
    console.log('Attempting to expand all "see more" buttons...');
    const showMoreButtons = document.querySelectorAll('button.inline-show-more-text__button, button.show-more-less-button, button.ember-view.artdeco-button');
    let expandedCount = 0;
    
    showMoreButtons.forEach(button => {
      try {
        // Check if the button contains text about showing more
        if (button.textContent.toLowerCase().includes('show more') || 
            button.textContent.toLowerCase().includes('see more') || 
            button.innerText.toLowerCase().includes('more')) {
          button.click();
          expandedCount++;
        }
      } catch (err) {
        console.log('Failed to expand a section:', err);
      }
    });
    console.log(`Expanded ${expandedCount} "see more" buttons`);
    
    // Small delay to let the DOM update after expanding sections
    // Use a synchronous delay because we need to wait for DOM updates
    const startTime = new Date().getTime();
    while (new Date().getTime() - startTime < 500) {
      // This synchronous wait allows DOM to update before we extract content
    }
  } catch (err) {
    console.log('Error when expanding sections:', err);
  }
  
  // STEP 2: Extract About section - very important for profile analysis
  let aboutText = '';
  
  // Look in artdeco-card sections for About section
  const sections = document.querySelectorAll('section.artdeco-card');
  for (const section of sections) {
    // Look for heading with "About" text
    const headings = section.querySelectorAll('div[data-generated-type="headline"] span, .visually-hidden, h2, .pvs-header__title');
    
    for (const heading of headings) {
      if (heading && heading.textContent.trim() === 'About') {
        // Try different possible content selectors
        const aboutContent = 
          section.querySelector('.display-flex span') || 
          section.querySelector('.pvs-list__item--with-border .pvs-entity .pvs-entity__description span') ||
          section.querySelector('.inline-show-more-text span') ||
          section.querySelector('.inline-show-more-text') ||
          section.querySelector('.pv-shared-text-with-see-more');
          
        if (aboutContent) {
          aboutText = aboutContent.textContent.trim();
          console.log('Found about section text:', aboutText.substring(0, 50) + '...');
          break;
        } else {
          // If can't find with specific selectors, grab all text in the section
          aboutText = section.textContent.replace(heading.textContent, '').trim();
          if (aboutText) {
            console.log('Grabbed all About section text:', aboutText.substring(0, 50) + '...');
          }
        }
      }
    }
    if (aboutText) break;
  }
  
  // Add about section if found
  if (aboutText) {
    profileData += `About:\n${aboutText}\n\n`;
  }
  
  // STEP 3: Get ALL content from the entire profile
  profileData += 'Complete Profile Content:\n\n';
  
  // Get the main profile container
  const mainContent = document.querySelector('#main, .core-rail, .scaffold-layout__main');
  if (mainContent) {
    console.log('Found main profile content container');
    
    // Process all sections in the profile
    const allSections = mainContent.querySelectorAll('section.artdeco-card');
    console.log(`Found ${allSections.length} profile sections`);
    
    allSections.forEach(section => {
      // Try to find section header
      const sectionHeader = section.querySelector('div[data-generated-type="headline"] span, .visually-hidden, h2, .pvs-header__title, .artdeco-card__title');
      
      if (sectionHeader) {
        const headerText = sectionHeader.textContent.trim();
        profileData += `\n## ${headerText}\n`;
        
        // Get all content from this section - try to maintain some structure
        const listItems = section.querySelectorAll('li.artdeco-list__item, .pvs-list__item--line-separated, .pvs-entity, ul.pvs-list > li');
        
        if (listItems.length > 0) {
          // Process structured list items
          listItems.forEach(item => {
            // Get item content
            const itemText = item.textContent.trim().replace(/\s+/g, ' ');
            if (itemText) {
              profileData += `- ${itemText}\n`;
            }
          });
        } else {
          // For sections without list structure, get all text content minus the header
          let sectionText = '';
          // First try to get all paragraph or span elements
          const paragraphs = section.querySelectorAll('p, .pvs-entity__description-text, .display-flex span');
          
          if (paragraphs.length > 0) {
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text && !text.includes(headerText)) {
                sectionText += text + '\n';
              }
            });
          }
          
          // If no paragraphs found, just get all text
          if (!sectionText) {
            sectionText = section.textContent.trim().replace(headerText, '').replace(/\s+/g, ' ').trim();
          }
          
          if (sectionText) {
            profileData += sectionText + '\n';
          }
        }
      } else {
        // Section has no header, just get all content
        const sectionText = section.textContent.trim().replace(/\s+/g, ' ');
        if (sectionText) {
          profileData += `\n${sectionText}\n`;
        }
      }
    });
  } else {
    console.log('Could not find main profile container, using fallback extraction');
    
    // Fallback - get all profile sections
    const allSections = document.querySelectorAll('section');
    allSections.forEach(section => {
      const sectionText = section.textContent.trim().replace(/\s+/g, ' ');
      if (sectionText && sectionText.length > 30) { // Avoid tiny sections
        profileData += `\n${sectionText}\n`;
      }
    });
  }
  
  // STEP 4: Extract Skills specifically (important for analysis)
  profileData += '\n## Skills\n';
  
  // Find Skills section
  const skillsSection = Array.from(sections).find(section => {
    const heading = section.querySelector('div[data-generated-type="headline"] span, .visually-hidden, h2, .pvs-header__title');
    return heading && heading.textContent.trim().includes('Skills');
  });
  
  if (skillsSection) {
    // Extract skill names
    const skillItems = skillsSection.querySelectorAll('.pvs-entity__primary-title, .artdeco-entity-lockup__title, .pvs-list__item--line-separated');
    let foundSkills = false;
    
    skillItems.forEach(item => {
      const skillText = item.textContent.trim();
      if (skillText && !skillText.includes('Skills')) {
        profileData += `- ${skillText}\n`;
        foundSkills = true;
      }
    });
    
    if (!foundSkills) {
      // If can't find with specific selectors, just grab prominent text
      const allSkillText = skillsSection.textContent.trim()
        .replace(/^Skills/, '')
        .replace('See all', '')
        .replace('Show more', '')
        .replace('Show less', '')
        .trim();
        
      if (allSkillText) {
        profileData += allSkillText + '\n';
      }
    }
  } else {
    profileData += 'No specific skills section found\n';
  }
  
  // Get all recommendations
  const recommendationsSection = Array.from(sections).find(section => {
    const heading = section.querySelector('div[data-generated-type="headline"] span, .visually-hidden, h2, .pvs-header__title');
    return heading && heading.textContent.trim().includes('Recommendation');
  });
  
  if (recommendationsSection) {
    profileData += '\n## Recommendations\n';
    
    const recommendationItems = recommendationsSection.querySelectorAll('.pvs-entity__primary-title, .artdeco-entity-lockup__title, .pvs-list__item--line-separated');
    recommendationItems.forEach(item => {
      const text = item.textContent.trim();
      if (text && !text.includes('Recommendation')) {
        profileData += text + '\n';
      }
    });
  }
  
  // Return all gathered profile data
  console.log('Extracted profile data length:', profileData.length);
  return profileData;
}

// Optional function to use advanced profile extraction via trafilatura
// Note: This requires server-side processing with trafilatura installed
async function extractProfileDataWithTrafilatura() {
  console.log('Attempting to extract profile with trafilatura...');
  
  try {
    // Get the current URL
    const profileUrl = window.location.href;
    
    // Check if this is a LinkedIn profile
    if (!profileUrl.includes('linkedin.com/in/')) {
      throw new Error('Not a LinkedIn profile page');
    }
    
    // Use the local trafilatura server
    const trafilaturaUrl = 'http://localhost:5000/api/extract';
    
    // Make a fetch request to the server
    const response = await fetch(trafilaturaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: profileUrl })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.content) {
      console.log('Successfully extracted profile with trafilatura');
      return data.content;
    } else {
      throw new Error('Failed to extract profile with trafilatura: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error extracting profile with trafilatura:', error);
    console.log('Falling back to standard extraction method');
    
    // Fall back to the standard extraction method
    return extractProfileData();
  }
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

// Add a listener for messages from side panel
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Check if the request is to extract profile data
  if (request.action === 'extractProfileData') {
    console.log('Received request to extract profile data from side panel');
    try {
      const profileData = extractProfileData();
      if (profileData) {
        sendResponse({ success: true, data: profileData });
      } else {
        sendResponse({ 
          success: false, 
          error: "Couldn't extract profile data. Please make sure you're on a LinkedIn profile page."
        });
      }
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message || "Error extracting profile data"
      });
    }
    return true; // Required to use sendResponse asynchronously
  }
  
  // Check if the request is to get profile info (name and headline only)
  if (request.action === 'getProfileInfo') {
    console.log('Received request for profile info from side panel');
    try {
      // Get profile name and headline for display in side panel
      const nameElement = document.querySelector('h1.text-heading-xlarge');
      const headlineElement = document.querySelector('div.text-body-medium');
      
      const profileInfo = {
        name: nameElement ? nameElement.textContent.trim() : 'LinkedIn Profile',
        headline: headlineElement ? headlineElement.textContent.trim() : ''
      };
      
      sendResponse(profileInfo);
    } catch (error) {
      sendResponse({ 
        name: 'LinkedIn Profile',
        headline: 'Could not extract profile info'
      });
    }
    return true;
  }
});