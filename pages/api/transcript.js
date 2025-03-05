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
            // Handle title that might be in runs format
            if (typeof videoDetails.title === 'string') {
              title = videoDetails.title;
            } else if (videoDetails.title?.runs?.[0]?.text) {
              title = videoDetails.title.runs[0].text;
            } else if (videoDetails.videoTitle) {
              title = videoDetails.videoTitle;
            }

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
      const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]+)"/);;
      if (titleMatch) title = titleMatch[1].replace(' - YouTube', '');
    }

    if (description === 'No description available') {
      const descMatch = html.match(/"description":\{"simpleText":"([^"]+)"\}/) || 
                       html.match(/"description":"([^"]+)"/);;
      if (descMatch) description = descMatch[1];
    }

    if (author === 'Unknown Author') {
      const authorMatch = html.match(/"author":"([^"]+)"/) || 
                        html.match(/"ownerChannelName":"([^"]+)"/);;
      if (authorMatch) author = authorMatch[1];
    }
    console.log('[METADATA] Final metadata:', { title, description: description.substring(0, 100) + '...', author });
    
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

    console.log(`[TRANSCRIPT] All primary attempts failed, trying fallback method`);
    // If the first method fails, try with fetch
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Try to extract captions data from the page
    console.log('[TRANSCRIPT] Searching for captions in HTML...');
    
    // First try manual captions
    let captionsMatch = html.match(/"captionTracks":\[(.+?)\]/);
    
    // If no manual captions, try auto-generated captions
    if (!captionsMatch) {
      console.log('[TRANSCRIPT] No manual captions found, checking for auto-generated...');
      captionsMatch = html.match(/"playerCaptionsTracklistRenderer":\{(.+?)\}\]/);
      
      if (!captionsMatch) {
        console.log('[TRANSCRIPT] Trying alternative caption format...');
        // Try another format that sometimes appears
        captionsMatch = html.match(/"playerCaptionsRenderer":\{(.+?)\}\]/);
      }
      
      if (!captionsMatch) {
        throw new Error('No caption tracks found');
      }
    }

    const captionsData = JSON.parse(`[${captionsMatch[1]}]`);
    console.log('[TRANSCRIPT] Caption data found:', JSON.stringify(captionsData, null, 2));
    
    // Try to find English captions with more flexible matching
    const englishCaptions = captionsData.find(c => {
      const hasEnglishCode = c.languageCode === 'en' || c.languageCode?.startsWith('en-');
      const hasEnglishName = c.name?.simpleText?.toLowerCase().includes('english') ||
                           c.name?.toLowerCase().includes('english');
      return hasEnglishCode || hasEnglishName;
    });
    
    if (!englishCaptions) {
      console.log('[TRANSCRIPT] No English captions found in:', captionsData);
      throw new Error('No English captions available');
    }
    
    const captionUrl = englishCaptions.baseUrl || englishCaptions.url;
    if (!captionUrl) {
      console.log('[TRANSCRIPT] No caption URL found in:', englishCaptions);
      throw new Error('No caption URL available');
    }
    
    console.log('[TRANSCRIPT] Found caption URL:', captionUrl);

    const transcriptResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const transcriptXml = await transcriptResponse.text();
    
    const matches = transcriptXml.match(/<text.+?>([^<]+)<\/text>/g);
    if (!matches) {
      throw new Error('Failed to parse transcript XML');
    }

    const transcriptList = matches.map((item, index) => {
      const startMatch = item.match(/start="([\d\.]+)"/);
      const durMatch = item.match(/dur="([\d\.]+)"/);
      const textMatch = item.match(/>([^<]+)</);
      
      return {
        offset: startMatch ? Math.floor(parseFloat(startMatch[1]) * 1000) : index * 5000,
        duration: durMatch ? Math.floor(parseFloat(durMatch[1]) * 1000) : 5000,
        text: textMatch ? textMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : ''
      };
    });
    
    if (transcriptList.length > 0) {
      console.log(`[TRANSCRIPT] Successfully fetched transcript using fallback method`);
      return transcriptList;
    }
    
    throw new Error('No transcript entries found in the response');
  } catch (error) {
    console.error(`[TRANSCRIPT] Error fetching transcript:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Try to provide more specific error information
    if (error.message.includes('Could not get transcripts') || error.message.includes('No caption tracks found')) {
      throw new Error('No captions available for this video');
    } else if (error.message.includes('No English captions')) {
      throw new Error('No English captions available for this video');
    } else if (error.message.includes('network')) {
      throw new Error('Network error - please check your internet connection');
    } else {
      throw new Error('Failed to fetch transcript: ' + error.message);
    }
  }
};

// Add this fallback function
const fetchTranscriptFallback = async (videoId) => {
  console.log(`[FALLBACK] Attempting fallback transcript fetch for ${videoId}`);
  
  try {
    // First, try to get available languages
    const langResponse = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
    if (!langResponse.ok) {
      throw new Error(`Failed to fetch available languages: ${langResponse.status}`);
    }
    
    const langData = await langResponse.text();
    console.log(`[FALLBACK] Available languages response received`);
    
    // Try to find English or auto-generated captions
    const langCodes = ['en', 'en-US', 'en-GB', 'a.en'];
    let selectedLang = 'en';
    
    for (const lang of langCodes) {
      if (langData.includes(`lang_code="${lang}"`)) {
        selectedLang = lang;
        break;
      }
    }
    
    // Fetch the transcript with the selected language
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${selectedLang}`);
    
    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }
    
    const data = await response.text();
    console.log(`[FALLBACK] Transcript response received, length: ${data.length}`);
    
    if (data.includes('<?xml')) {
      console.log(`[FALLBACK] Parsing XML response`);
      const textSegments = data.match(/<text.+?>(.*?)<\/text>/g) || [];
      
      if (textSegments.length === 0) {
        throw new Error('No transcript segments found in response');
      }
      
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

    // Fetch both metadata and transcript in parallel.
    console.log(`[HANDLER] Starting parallel fetch for metadata and transcript`);

    // Fetch metadata and transcript in parallel
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
