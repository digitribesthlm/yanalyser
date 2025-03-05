// pages/api/jina-search.js
import { YoutubeTranscript } from 'youtube-transcript';

// Improved domain validation function
const isAllowedDomain = (url) => {
  try {
    // Parse the URL to get the hostname
    const hostname = new URL(url).hostname;
    
    // Get allowed domains from environment variable and clean up any whitespace
    const allowedDomains = process.env.DOMAIN_ALLOWED 
      ? process.env.DOMAIN_ALLOWED.split(',').map(d => d.trim())
      : [];
    
    console.log('Checking domain:', hostname, 'against allowed domains:', allowedDomains);
    
    // Check if the hostname matches or is a subdomain of any allowed domain
    return allowedDomains.some(domain => {
      // Handle exact match
      if (hostname === domain) return true;
      
      // Handle subdomain match (ensure we're matching full domain parts)
      if (hostname.endsWith(`.${domain}`)) return true;
      
      // Handle www variant
      if (hostname === `www.${domain}` || domain === `www.${hostname}`) return true;
      
      return false;
    });
  } catch (error) {
    console.error('Error checking domain:', error);
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { urls, keywords } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ message: 'URLs array is required' });
  }

  // Check if all URLs are from allowed domains
  const invalidUrls = urls.filter(url => 
    !isAllowedDomain(url) && !url.includes('youtube.com') && !url.includes('youtu.be')
  );
  
  if (invalidUrls.length > 0) {
    return res.status(403).json({ 
      message: 'Access denied: Only allowed domains and YouTube URLs are permitted',
      invalidUrls 
    });
  }

  try {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          // Check if it's a YouTube URL
          const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
          
          if (isYouTube) {
            // Extract video ID from URL
            const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
            
            if (!videoId) {
              throw new Error('Invalid YouTube URL');
            }

            // Get transcript using youtube-transcript
            const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);

            if (!transcriptList || transcriptList.length === 0) {
              throw new Error('No transcript found for this video');
            }

            // Get video info from the transcript metadata
            const firstSegment = transcriptList[0];
            const videoInfo = {
              id: videoId,
              url: url,
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              title: firstSegment.video?.title || 'Untitled Video',
              author: firstSegment.video?.author || 'Unknown Author',
              transcriptLanguage: firstSegment.language || 'unknown'
            };

            // Format the transcript
            const transcript = transcriptList.map(item => item.text).join('\n');

            return {
              url,
              metadata: videoInfo,
              transcript,
              contentLength: transcript.length,
              success: true
            };
          } else {
            // Handle non-YouTube URLs with Jina
            const response = await fetch(`https://r.jina.ai/${url}`, {
              headers: { 
                'Authorization': `Bearer ${process.env.JINA_API_KEY}` 
              }
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch ${url}`);
            }

            const content = await response.text();
            
            return {
              url,
              metadata: {
                title: url,
                description: 'Web content'
              },
              transcript: content,
              contentLength: content.length,
              success: true
            };
          }
        } catch (error) {
          console.error(`Error processing ${url}:`, error);
          return {
            url,
            metadata: {},
            transcript: `Error: ${error.message}`,
            contentLength: 0,
            success: false
          };
        }
      })
    );
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      message: 'Error processing URLs',
      error: error.message 
    });
  }
} 