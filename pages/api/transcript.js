// pages/api/transcript.js
import { YoutubeTranscript } from 'youtube-transcript';
import cheerio from 'cheerio';

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
    console.log('Fetching metadata and transcript for video ID:', videoId);
    const [metadata, transcriptList] = await Promise.all([
      getVideoMetadata(videoId),
      YoutubeTranscript.fetchTranscript(videoId)
    ]);

    if (!transcriptList || transcriptList.length === 0) {
      console.log('No transcript found for video ID:', videoId);
      return res.status(404).json({ 
        message: 'No transcript found for this video',
        detail: 'The video might not have captions available'
      });
    }

    // Log the first few transcript entries to debug
    console.log('First few transcript entries:', transcriptList.slice(0, 3));

    // After fetching the transcript
    console.log('Raw transcript data (first 5 entries):', 
      transcriptList.slice(0, 5).map(item => ({
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
      transcriptLanguage: transcriptList[0]?.language || 'unknown'
    };

    console.log('Successfully fetched transcript, length:', transcriptList.length);
    
    // Update the transcript formatting
    const formattedTranscript = transcriptList.map(item => {
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
      raw: transcriptList[0],
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
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Check for specific error types
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
