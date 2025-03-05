// pages/api/analyze-content.js
import OpenAI from 'openai';
import { companyVideoTemplate } from '../../utils/templates';

export const config = {
  maxDuration: 500,
  runtime: 'edge'
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const formatTimestamp = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Improved function to identify potential topic boundaries
const identifyPotentialTopics = (transcript, minSegmentLength = 30) => {
  // Look for section headers - often short, standalone phrases
  const potentialHeaders = transcript.filter((segment, index) => {
    // Check if this is a short segment (likely a title)
    const isShortSegment = segment.text.length < 25 && segment.text.length > 5;
    
    // Check if it's followed by a longer explanation
    const isFollowedByExplanation = index < transcript.length - 1 && 
      transcript[index + 1].text.length > 25;
    
    // Check if it contains words that suggest a title/header
    const hasTitleWords = /offering|cloud|service|introduction|conclusion|advantage|feature|step|how|what|why/i.test(segment.text);
    
    // Check if it's capitalized (titles often are)
    const isCapitalized = segment.text === segment.text.charAt(0).toUpperCase() + segment.text.slice(1).toLowerCase();
    
    return (isShortSegment && (isFollowedByExplanation || hasTitleWords || isCapitalized));
  });
  
  // Add the first segment and segments after pauses
  const potentialTopics = [...potentialHeaders];
  
  // Add first segment if not already included
  if (transcript.length > 0 && !potentialTopics.some(t => t.start === transcript[0].start)) {
    potentialTopics.push(transcript[0]);
  }
  
  // Add segments after significant pauses
  transcript.forEach((segment, index) => {
    if (index > 0) {
      const previousSegment = transcript[index - 1];
      const pauseDuration = segment.start - (previousSegment.start + previousSegment.duration);
      
      // If there's a pause of more than 2 seconds, might be a topic change
      if (pauseDuration > 2 && !potentialTopics.some(t => t.start === segment.start)) {
        potentialTopics.push(segment);
      }
    }
  });
  
  // Add segments with specific section markers
  transcript.forEach(segment => {
    const hasMarker = /climber|hybrid|offering|cloud|sauce|step|conclusion/i.test(segment.text);
    if (hasMarker && !potentialTopics.some(t => t.start === segment.start)) {
      potentialTopics.push(segment);
    }
  });
  
  // Ensure we have enough potential topics (at least 8-10)
  if (potentialTopics.length < 8) {
    // Add more segments at regular intervals
    const interval = Math.floor(transcript.length / 8);
    for (let i = 0; i < transcript.length; i += interval) {
      if (!potentialTopics.some(topic => topic.time === transcript[i].start)) {
        potentialTopics.push(transcript[i]);
      }
    }
  }
  
  // Sort by timestamp and remove duplicates
  return potentialTopics
    .sort((a, b) => a.start - b.start)
    .filter((topic, index, self) => 
      index === self.findIndex(t => formatTimestamp(t.start) === formatTimestamp(topic.start))
    );
};

// Improved validation function that matches section labels to transcript content
const validateTimestamp = (section, transcript) => {
  const { time, label } = section;
  
  // Extract keywords from the section label
  const keywords = label.toLowerCase().split(' ')
    .filter(word => word.length > 4 && !['about', 'these', 'those', 'their', 'there'].includes(word));
  
  // Find segments that contain these keywords
  const matchingSegments = transcript.filter(segment => 
    keywords.some(keyword => segment.text.toLowerCase().includes(keyword))
  );
  
  if (matchingSegments.length > 0) {
    // Find the earliest matching segment
    const earliestMatch = matchingSegments.reduce((earliest, current) => 
      current.start < earliest.start ? current : earliest
    );
    
    // If the earliest match is within 30 seconds of the provided time, use it
    if (Math.abs(earliestMatch.start - time) < 30) {
      return earliestMatch.start;
    }
    
    // Otherwise, use the earliest match regardless
    return earliestMatch.start;
  }
  
  // If no matching segments, find the closest timestamp
  const closest = transcript.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.start - time);
    const currDiff = Math.abs(curr.start - time);
    return currDiff < prevDiff ? curr : prev;
  });
  
  return closest.start;
};

// Add this function to ensure proper spacing between timestamps
const ensureTimestampSpacing = (sections, minSpacing = 30) => {
  if (!sections || sections.length === 0) return [];
  
  // Sort sections by time
  const sortedSections = [...sections].sort((a, b) => a.time - b.time);
  
  // Keep the first section
  const result = [sortedSections[0]];
  
  // For each subsequent section, ensure it's at least minSpacing seconds after the previous one
  for (let i = 1; i < sortedSections.length; i++) {
    const prevSection = result[result.length - 1];
    const currentSection = sortedSections[i];
    
    // Only add this section if it's at least minSpacing seconds after the previous one
    if (currentSection.time - prevSection.time >= minSpacing) {
      result.push(currentSection);
    }
  }
  
  return result;
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { videoInfo, transcript, companyContent } = await request.json();

    if (!videoInfo || !transcript || !companyContent) {
      return new Response(JSON.stringify({ error: 'All information is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting OpenAI analysis...');
    
    // Identify potential topic boundaries
    const potentialTopics = identifyPotentialTopics(transcript);
    console.log('Identified potential topics:', potentialTopics.map(t => ({
      time: formatTimestamp(t.start),
      text: t.text.substring(0, 30) + '...'
    })));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: "system",
          content: `You are a content optimizer that creates engaging YouTube content in a specific format. Return your analysis in JSON format.
                    
                    For titles: Create concise but informative titles that include key topic and context.
                    
                    For descriptions: Structure them as follows:
                    1. Opening paragraph introducing the video
                    2. Sections with timestamps
                    3. Call to action with website and subscription prompt
                    4. Relevant hashtags`
        },
        {
          role: "user",
          content: `Analyze this content and create clickable section timestamps.

                    VIDEO INFORMATION:
                    Title: ${videoInfo.title}
                    Description: ${videoInfo.description}
                    Video ID: ${videoInfo.id}
                    
                    VALID SECTION TIMESTAMPS (use ONLY these exact timestamps):
                    ${potentialTopics.map(t => 
                      `${formatTimestamp(t.start)} - ${t.text.substring(0, 50)}...`
                    ).join('\n')}

                    COMPANY INFORMATION:
                    ${companyContent}

                    Instructions:
                    1. Create an engaging YouTube title and description
                    2. Select 4-6 major sections from the VALID SECTION TIMESTAMPS above
                    3. For each section:
                       - Use ONLY timestamps from the list above
                       - DO NOT create new timestamps
                       - Choose timestamps that represent major topic changes
                       - Write a brief description for each section
                    4. IMPORTANT: Ensure sections are AT LEAST 30 SECONDS APART
                       - Do not select timestamps that are close together
                       - Space your selections throughout the video duration
                       - First timestamp can be at the beginning (0:00)
                       - Last timestamp should be in the latter half of the video

                    IMPORTANT: 
                    - You MUST use timestamps EXACTLY as they appear in the VALID SECTION TIMESTAMPS list
                    - Do not round or modify the timestamps
                    - Choose timestamps that are AT LEAST 30 SECONDS APART
                    - Sections must represent significant content changes

                    Return a JSON object matching this schema: ${JSON.stringify(companyVideoTemplate)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Validate and correct timestamps
    const usedTimestamps = new Set();

    // First map to correct timestamps
    let correctedSections = analysis.videoOptimization.description.sections
      .map(section => {
        // Find the exact matching timestamp from our potential topics
        const matchingTopic = potentialTopics.find(topic => 
          formatTimestamp(topic.start) === formatTimestamp(section.time)
        );
        
        // If we found a match, use its exact time
        if (matchingTopic) {
          return {
            ...section,
            time: matchingTopic.start
          };
        }
        
        // Otherwise, validate the timestamp against transcript content
        return {
          ...section,
          time: validateTimestamp(section, transcript)
        };
      })
      .sort((a, b) => a.time - b.time);

    // Then ensure proper spacing between sections
    correctedSections = ensureTimestampSpacing(correctedSections, 30);

    // Then filter out any duplicates
    analysis.videoOptimization.description.sections = correctedSections
      .filter(section => {
        const timeStr = formatTimestamp(section.time);
        if (usedTimestamps.has(timeStr)) {
          return false;
        }
        usedTimestamps.add(timeStr);
        return true;
      });

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 