// pages/api/transcript.js
import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'node-fetch';

// Configure for Vercel serverless environment
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
    externalResolver: true,
  },
};

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
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  
  try {
    console.log('[METADATA] Fetching video metadata for:', videoId);
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[METADATA] Successfully fetched video page');
    
    let title = 'Untitled Video';
    let description = 'No description available';
    let author = 'Unknown Author';

    // Try different ways to extract metadata
    const dataMatches = [
      html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/),
      html.match(/ytInitialData\s*=\s*({.+?});/),
      html.match(/<script[^>]*>var ytInitialData = ({.+?});<\/script>/)
    ];

    for (const match of dataMatches) {
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          console.log('[METADATA] Successfully parsed YouTube data');
          
          // Try different paths to get video details
          const videoDetails = 
            data.videoDetails || 
            data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer ||
            data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoSecondaryInfoRenderer;

          if (videoDetails) {
            title = videoDetails.title || videoDetails.videoTitle || title;
            description = videoDetails.shortDescription || videoDetails.description || description;
            author = videoDetails.author || videoDetails.ownerChannelName || author;
            break;
          }
        } catch (e) {
          console.log('[METADATA] Failed to parse data format:', e.message);
          continue;
        }
      }
    }
    
    // If we still don't have metadata, try regex fallbacks
    if (title === 'Untitled Video') {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]+)"/);
      if (titleMatch) title = titleMatch[1].replace(' - YouTube', '');
    }

    if (description === 'No description available') {
      const descMatch = html.match(/"description":\{"simpleText":"([^"]+)"\}/) || 
                       html.match(/"description":"([^"]+)"/);
      if (descMatch) description = descMatch[1];
    }

    if (author === 'Unknown Author') {
      const authorMatch = html.match(/"author":"([^"]+)"/) || 
                        html.match(/"ownerChannelName":"([^"]+)"/);
      if (authorMatch) author = authorMatch[1];
    }
    
    console.log('[METADATA] Final metadata:', { 
      title, 
      description: description.substring(0, 100) + '...', 
      author 
    });
    
    return { title, description, author };
  } catch (error) {
    console.error('[METADATA] Error fetching metadata:', error);
    return {
      title: 'Untitled Video',
      description: 'No description available',
      author: 'Unknown Author'
    };
  }
}

// Modify your fetchTranscript function to add more debugging
const fetchTranscript = async (videoId) => {
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  console.log(`[TRANSCRIPT] Starting fetch for video ID: ${videoId}`);
  
  try {
    // First try the default method with retries
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`[TRANSCRIPT] Attempt ${i + 1} using primary method`);
        const transcriptList = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'en',
          country: 'US'
        });
        
        if (transcriptList && transcriptList.length > 0) {
          console.log(`[TRANSCRIPT] Successfully fetched transcript using primary method`);
          return transcriptList;
        }
      } catch (primaryError) {
        console.log(`[TRANSCRIPT] Primary method attempt ${i + 1} failed:`, primaryError.message);
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
      }
    }

    // Rest of the fetchTranscript function remains the same as in the original file
    // ... (content continues)
  } catch (error) {
    // Error handling remains the same
  }
};

// The fetchTranscriptFallback function remains the same
const fetchTranscriptFallback = async (videoId) => {
  // Content remains the same as in the original file
};

export default async function handler(req, res) {
  // Duplicate CORS headers removed - keep only one set

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
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed',
      detail: `Expected POST, got ${req.method}`
    });
  }

  console.log('API Request received:', { method: req.method, body: req.body });

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
    let videoId;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
      } else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
    }

    // Fallback to regex if URL parsing fails
    if (!videoId) {
      videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    }

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

    const metadataPromise = getVideoMetadata(videoId);
    const transcriptPromise = (async () => {
      try {
        return await fetchTranscript(videoId);
      } catch (error) {
        console.log(`[HANDLER] Primary transcript fetch failed, trying fallback...`);
        return await fetchTranscriptFallback(videoId);
      }
    })();

    const [metadata, transcriptData] = await Promise.all([metadataPromise, transcriptPromise]);

    console.log(`[HANDLER] Transcript fetch complete. Length: ${transcriptData ? transcriptData.length : 0}`);

    if (!transcriptData || transcriptData.length === 0) {
      console.log('No transcript found for video ID:', videoId);
      return res.status(404).json({ 
        message: 'No transcript found for this video',
        detail: 'The video might not have captions available'
      });
    }

    // Prepare video info
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
    const formattedTranscript = transcriptData.map(item => ({
      text: item.text.replace(/&amp;#39;/g, "'"),
      start: item.offset || 0,
      duration: item.duration || 0
    }));

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
    
    // Error handling remains the same as in the original file
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