// utils/templates.js
export const videoAnalysisTemplate = {
    "title": "Optimized YouTube title, max 100 characters",
    "description": "Optimized YouTube description based on transcript and original description",
    "tags": ["array", "of", "relevant", "tags"],
    "analysis": {
      "mainTopics": ["key", "topics", "covered"],
      "keyPoints": ["important", "points", "from", "transcript"]
    }
  };
  
  export const companyVideoTemplate = {
    "videoOptimization": {
      "title": "Optimized YouTube title, max 100 characters",
      "description": {
        "intro": "Opening paragraph introducing the video content",
        "sections": [
          {
            "time": 0, // Time in seconds
            "label": "Section title",
            "description": "Brief description of section"
          }
        ],
        "callToAction": "Call to action text with website and subscription prompt",
        "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"]
      },
      "tags": ["array", "of", "relevant", "tags"]
    },
    "companyInfo": {
      "socialMediaLinks": {
        "facebook": "URL or null",
        "twitter": "URL or null",
        "linkedin": "URL or null",
        "instagram": "URL or null"
      },
      "companyDescription": "Short company description for YouTube footer",
      "contactInfo": "Website and other public contact information"
    }
  }; 