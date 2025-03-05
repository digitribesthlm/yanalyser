// pages/api/transcript.js
import { YoutubeTranscript } from 'youtube-transcript';
import cheerio from 'cheerio';

// Add this at the top of your file for better error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const isAllowedDomain = (url) => {
  try {
    // Parse the URL to get the hostname
    const hostname = new URL(url).hostname;
    
    // Get allowed domains from environment variable
    const allowedDomains = process.env.DOMAIN_ALLOWED 
      ? process.env.DOMAIN_ALLOWED.split(',').map(d => d.trim())
      : [];
    
    // Check if the hostname matches or is a subdomain of any allowed domain
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch (error) {
    console.error('Error checking domain:', error);
    return false;
  }
};

async function getVideoMetadata(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Look for the ytInitialData in the script tags
    const ytInitialPlayerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    
    let title = 'Untitled Video';
    let description = 'No description available';
    let author = 'Unknown Author';

    if (ytInitialPlayerMatch) {
      try {
        const playerData = JSON.parse(ytInitialPlayerMatch[1]);
        const videoDetails = playerData.videoDetails;
        if (videoDetails) {
          title = videoDetails.title || title;
          // Try multiple possible description fields
          description = videoDetails.description || 
                       videoDetails.shortDescription || 
                       playerData.microformat?.playerMicroformatRenderer?.description?.simpleText ||
                       'No description available';
          author = videoDetails.author || videoDetails.channelId || author;
        }

        // Additional fallback for description
        if (!description || description === 'No description available') {
          const microformat = playerData.microformat?.playerMicroformatRenderer;
          if (microformat) {
            description = microformat.description?.simpleText || 
                         microformat.description?.runs?.map(run => run.text).join('') ||
                         'No description available';
          }
        }
      } catch (e) {
        console.error('Error parsing player data:', e);
      }
    }

    // Log the extracted data for debugging
    console.log('Extracted metadata:', { title, description: description.substring(0, 100) + '...', author });

    return {
      title,
      description,
      author
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return {
      title: 'Untitled Video',
      description: 'No description available',
      author: 'Unknown Author'
    };
  }
}

// Modify your fetchTranscript function to add more debugging
const fetchTranscript = async (videoId) => {
  console.log(`[TRANSCRIPT] Starting transcript fetch for video ID: ${videoId}`);
  
  try {
    // Try with a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transcript fetch timeout')), 15000)
    );
    
    console.log(`[TRANSCRIPT] Calling YoutubeTranscript.fetchTranscript for ${videoId}`);
    const fetchPromise = YoutubeTranscript.fetchTranscript(videoId);
    
    // Race between fetch and timeout
    const transcriptList = await Promise.race([fetchPromise, timeoutPromise]);
    
    console.log(`[TRANSCRIPT] Response received: ${transcriptList ? 'Success' : 'Empty response'}`);
    console.log(`[TRANSCRIPT] Transcript entries: ${transcriptList ? transcriptList.length : 0}`);
    
    if (transcriptList && transcriptList.length > 0) {
      console.log(`[TRANSCRIPT] First entry sample:`, JSON.stringify(transcriptList[0]));
    } else {
      console.log(`[TRANSCRIPT] No transcript entries found`);
    }
    
    return transcriptList;
  } catch (error) {
    console.error(`[TRANSCRIPT] Error fetching transcript:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Try to provide more specific error information
    if (error.message.includes('Could not get transcripts')) {
      console.error('[TRANSCRIPT] No captions available for this video');
    } else if (error.message.includes('timeout')) {
      console.error('[TRANSCRIPT] Request timed out - YouTube API might be rate limiting');
    } else if (error.message.includes('network')) {
      console.error('[TRANSCRIPT] Network error - check internet connection');
    }
    
    throw error;
  }
};

// Add this fallback function
const fetchTranscriptFallback = async (videoId) => {
  console.log(`[FALLBACK] Attempting fallback transcript fetch for ${videoId}`);
  
  try {
    // Direct fetch to YouTube's transcript API
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`);
    
    if (!response.ok) {
      console.error(`[FALLBACK] YouTube API returned ${response.status}`);
      throw new Error(`YouTube API returned ${response.status}`);
    }
    
    const data = await response.text();
    console.log(`[FALLBACK] Response received, length: ${data.length}`);
    
    // If we got XML back, try to parse it
    if (data.includes('<?xml')) {
      console.log(`[FALLBACK] Parsing XML response`);
      // Simple XML parsing (you might want to use a proper XML parser)
      const textSegments = data.match(/<text.+?>(.*?)<\/text>/g) || [];
      
      return textSegments.map((segment, index) => {
        const startMatch = segment.match(/start="([\d\.]+)"/);
        const durMatch = segment.match(/dur="([\d\.]+)"/);
        const textMatch = segment.match(/<text.+?>(.*?)<\/text>/);
        
        return {
          offset: startMatch ? parseFloat(startMatch[1]) * 1000 : index * 5000,
          duration: durMatch ? parseFloat(durMatch[1]) * 1000 : 5000,
          text: textMatch ? textMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error(`[FALLBACK] Error in fallback:`, error);
    throw error;
  }
};

export default async function handler(req, res) {
  console.log('API Request received:', { method: req.method, body: req.body });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ 
      message: 'Method not allowed',
      detail: `Expected POST, got ${req.method}`
    });
  }

  try {
    console.log('Processing request body...');
    const { url } = req.body;

    if (!url) {
      console.log('No URL provided');
      return res.status(400).json({ 
        message: 'YouTube URL is required',
        detail: 'The request body must include a "url" field'
      });
    }

    // Check if the URL is from an allowed domain
    if (!isAllowedDomain(url) && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(403).json({ 
        message: 'Access denied: Only allowed domains and YouTube URLs are permitted' 
      });
    }

    console.log('URL received:', url);
    console.log('Extracting video ID from URL:', url);
    // Extract video ID from URL
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    if (!videoId) {
      console.log('Invalid video ID from URL:', url);
      return res.status(400).json({ 
        message: 'Invalid YouTube URL',
        detail: 'Could not extract video ID from the provided URL'
      });
    }

    console.log('Extracted video ID:', videoId);

    // Fetch both metadata and transcript in parallel
    console.log(`[HANDLER] Starting parallel fetch for metadata and transcript`);

    // First get the metadata
    const metadata = await getVideoMetadata(videoId);

    // Then try to get the transcript with fallback
    let transcriptData;
    try {
      console.log(`[HANDLER] Attempting primary transcript fetch method`);
      transcriptData = await fetchTranscript(videoId);
    } catch (error) {
      console.log(`[HANDLER] Primary transcript fetch failed, trying fallback...`);
      // If it fails, try the fallback
      transcriptData = await fetchTranscriptFallback(videoId);
    }

    console.log(`[HANDLER] Transcript fetch complete. Length: ${transcriptData ? transcriptData.length : 0}`);

    if (!transcriptData || transcriptData.length === 0) {
      console.log('No transcript found for video ID:', videoId);
      return res.status(404).json({ 
        message: 'No transcript found for this video',
        detail: 'The video might not have captions available'
      });
    }

    // Log the first few transcript entries to debug
    console.log('First few transcript entries:', transcriptData.slice(0, 3));

    // After fetching the transcript
    console.log('Raw transcript data (first 5 entries):', 
      transcriptData.slice(0, 5).map(item => ({
        offset: item.offset,
        text: item.text.substring(0, 50),
        duration: item.duration
      }))
    );

    let videoInfo = {
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      transcriptLanguage: transcriptData[0]?.language || 'unknown'
    };

    console.log('Successfully fetched transcript, length:', transcriptData.length);
    
    // Update the transcript formatting
    const formattedTranscript = transcriptData.map(item => {
      // Get the start time from offset (it's already in seconds)
      const startTime = item.offset || 0;

      return {
        text: item.text.replace(/&amp;#39;/g, "'"),
        start: startTime,
        duration: item.duration || 0
      };
    });

    // Add debug logging to verify
    console.log('First formatted entry with offset:', {
      raw: transcriptData[0],
      formatted: formattedTranscript[0]
    });

    // And check what we're sending
    console.log('Formatted transcript (first 5 entries):', 
      formattedTranscript.slice(0, 5).map(item => ({
        start: item.start,
        text: item.text.substring(0, 50)
      }))
    );

    return res.status(200).json({
      video: videoInfo,
      transcript: formattedTranscript
    });
  } catch (error) {
    console.error(`[HANDLER] Error in Promise.all:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Add more specific error handling
    if (error.message.includes('Could not get transcripts')) {
      return res.status(404).json({ 
        message: 'Transcript not available',
        detail: 'This video might not have captions or might be private/unavailable'
      });
    }

    if (error.message.includes('Not found') || error.message.includes('404')) {
      return res.status(404).json({ 
        message: 'Video not found',
        detail: 'The video might be private, removed, or unavailable'
      });
    }

    return res.status(500).json({ 
      message: 'Error fetching transcript',
      error: error.message,
      detail: 'An unexpected error occurred while fetching the transcript. Please check the video URL and try again.'
    });
  }
}
