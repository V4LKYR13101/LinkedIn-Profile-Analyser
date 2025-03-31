import trafilatura

def get_website_text_content(url: str) -> str:
    """
    This function takes a url and returns the main text content of the website.
    The text content is extracted using trafilatura and easier to understand.
    The results is not directly readable, better to be summarized by LLM before consume
    by the user.
    
    Some common website to crawl information from:
    LinkedIn profiles: https://www.linkedin.com/in/{username}
    """
    # Send a request to the website
    downloaded = trafilatura.fetch_url(url)
    text = trafilatura.extract(downloaded)
    return text

def extract_linkedin_profile(html_content: str) -> dict:
    """
    Extract structured data from a LinkedIn profile HTML content.
    
    Args:
        html_content: The HTML content of a LinkedIn profile page
        
    Returns:
        A dictionary containing the extracted profile information
    """
    # Extract text content using trafilatura
    text_content = trafilatura.extract(html_content)
    
    # Create a dictionary to store the structured data
    profile_data = {
        'raw_text': text_content,
        'sections': {}
    }
    
    # Use trafilatura's extraction to get metadata
    metadata = trafilatura.metadata.extract_metadata(html_content)
    if metadata:
        profile_data['title'] = metadata.title
        
    # Extract sections from the text
    if text_content:
        # Split the text into lines
        lines = text_content.split('\n')
        
        current_section = 'header'
        profile_data['sections'][current_section] = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if this line might be a section header
            if len(line) < 50 and line.endswith(':'):
                current_section = line.rstrip(':').lower()
                profile_data['sections'][current_section] = []
            else:
                profile_data['sections'][current_section].append(line)
    
    return profile_data

# Function to be used in the Chrome extension to clean and format extracted LinkedIn data
def clean_linkedin_data(profile_text: str) -> str:
    """
    Clean and format LinkedIn profile data that was extracted using content.js
    
    Args:
        profile_text: Raw text extracted from LinkedIn profile
        
    Returns:
        Cleaned and formatted profile text
    """
    # Split by sections (marked with ## in our extraction)
    lines = profile_text.split('\n')
    sections = {}
    
    current_section = 'Header'
    sections[current_section] = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if line starts a new section
        if line.startswith('##'):
            current_section = line.lstrip('#').strip()
            sections[current_section] = []
        else:
            sections[current_section].append(line)
    
    # Format the cleaned data
    formatted_text = ""
    for section, content in sections.items():
        if content:  # Only add sections with content
            formatted_text += f"# {section}\n"
            formatted_text += "\n".join(content) + "\n\n"
    
    return formatted_text

if __name__ == "__main__":
    # Example of how to use this module
    import sys
    
    if len(sys.argv) > 1:
        url = sys.argv[1]
        print(f"Extracting content from: {url}")
        content = get_website_text_content(url)
        print("\n--- Extracted Content ---\n")
        print(content)
    else:
        print("Please provide a URL as a command-line argument")
        print("Example: python web_scraper.py https://www.linkedin.com/in/username")