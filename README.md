# LinkedIn Profile Enhancer with AI

A Chrome extension that enhances LinkedIn profile viewing by integrating with Google AI models for interactive profile analysis.

## Features

- Floating action button appearing on LinkedIn profile pages (bottom right)
- Extracts profile content from active LinkedIn profile
- Sends profile content to Google AI models for analysis
- Support for multiple models including "gemini-2.0-flash", "gemini-2.5-pro-exp-03-25", and "gemma-3-27b-it"
- Interactive Q&A interface to ask questions about the profile
- Visual indicator showing which model is currently selected

## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension will be installed and ready to use

### Required Files

```
├── icons
│   ├── icon128.svg
│   ├── icon16.svg
│   └── icon48.svg
├── background.js
├── content.js
├── manifest.json
├── popup.html
├── popup.js
└── styles.css
```

## Usage

1. Click on the extension icon in your Chrome toolbar
2. Enter your Google AI API key and select your preferred model
3. Click "Save Settings"
   - You can get a Google AI API key from [Google AI](https://ai.google.dev/)
4. Visit any LinkedIn profile page
5. Click the floating question mark button that appears in the bottom right
6. Use "Analyze Profile" for instant insights about the profile
7. Ask specific questions about the profile using the Q&A interface

## Model Selection

The extension supports the following models:
- **gemma-3-27b-it** - Gemma 3 27b instructional tuned model
- **gemini-2.0-flash** - Fastest Gemini model for quick responses
- **gemini-2.5-pro-exp-03-25** - Advanced experimental Gemini model

## Privacy

This extension:
- Only activates on LinkedIn profile pages
- Only extracts profile information when you click "Analyze" or ask a question
- All data is sent directly to the Google AI API and is not stored elsewhere
- Your API key and model preference are stored locally in your browser using Chrome's storage API
- No data is collected or shared with any third parties

## Development

This project uses vanilla JavaScript, HTML, and CSS, with no external dependencies.

## License

MIT License