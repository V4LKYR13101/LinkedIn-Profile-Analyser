# LinkedIn Profile Enhancer with AI

A Chrome extension that enhances LinkedIn profile viewing by integrating with Google AI models for interactive profile analysis.

## Features

- Sidebar interface
- Extracts profile content from active LinkedIn profile
- Sends profile content to Google AI models for analysis
- Support for multiple models including "gemini-2.0-flash", and "gemma-3-27b-it"
- Store questions and select from stored questionos to view outcomes
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
5. If for some reason the sidebar does not automatically extend, click ont the blue puzzle piece to expand it mamually
6. Click "Custom Questions", Add some questions, in some instance a LinkedIn profile refresh is needed for the newly added questions to display
7. While on a LinkedIn profile, and this component's side panel is expanded, one will be able to run custom save questions.

## Model Selection

The extension supports the following models:
- **gemma-3-27b-it** - Gemma 3 27b instructional tuned model
- **gemini-2.0-flash** - Fastest Gemini model for quick responses

## Privacy

This extension:
- Only activates on LinkedIn profile pages
- Only extracts profile information onve clicking on a custom question
- All data is sent directly to the Google AI API and is not stored elsewhere
- Your API key and model preference are stored locally in your browser using Chrome's storage API
- No data is collected or shared with any third parties

## Development

This project uses vanilla JavaScript, HTML, and CSS, with no external dependencies.

## License

MIT License
