// pages/transcript.js
import { useState } from 'react';

export default function TranscriptPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add new states for company URLs
  const [companyUrls, setCompanyUrls] = useState({
    aboutUrl: ''
  });
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loadingCompanyInfo, setLoadingCompanyInfo] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }

      const data = await response.json();
      console.log('Received data:', data);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const content = [
      `Title: ${result.video.title}`,
      `Author: ${result.video.author}`,
      `Description: ${result.video.description}`,
      `Language: ${result.video.transcriptLanguage}`,
      `URL: ${result.video.url}`,
      '\n' + '='.repeat(80) + '\n',
      'Transcript:',
      result.transcript.map(segment => segment.text).join('\n')
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${result.video.id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCompanyUrlsSubmit = async (e) => {
    e.preventDefault();
    setLoadingCompanyInfo(true);
    setLoadingAnalysis(true);
    
    try {
      // Get company content
      const response = await fetch('/api/jina-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          urls: [companyUrls.aboutUrl]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company information');
      }

      const companyData = await response.json();
      setCompanyInfo(companyData);

      // Now analyze everything with GPT
      const analysisResponse = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoInfo: result.video,
          transcript: result.transcript,
          companyContent: companyData[0].transcript
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze content');
      }

      const analysisData = await analysisResponse.json();
      setAnalysis(analysisData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCompanyInfo(false);
      setLoadingAnalysis(false);
    }
  };

  const findSignificantSegments = (transcript, minLength = 20) => {
    // Debug the incoming transcript
    console.log('First transcript item:', transcript[0]);

    return transcript
      .filter(t => {
        // Debug filter conditions
        console.log('Checking segment:', {
          length: t.text.length,
          start: t.start,
          text: t.text.substring(0, 30)
        });
        return t.text.length >= minLength && !t.text.includes('[Music]');
      })
      .map(t => ({
        time: Number(t.start), // Ensure it's a number
        text: t.text,
        duration: t.duration
      }))
      .filter((t, i, arr) => {
        // Filter out segments that are too close together (within 2 seconds)
        return i === 0 || (t.time - arr[i-1].time) > 2;
      });
  };

  const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleGptInputDownload = () => {
    if (!result || !companyInfo) return;

    const segments = findSignificantSegments(result.transcript);
    console.log('Processed segments:', segments.slice(0, 3)); // Debug first 3 segments

    const gptInput = [
      "VIDEO INFORMATION:",
      `Title: ${result.video.title}`,
      `Description: ${result.video.description}`,
      `Video ID: ${result.video.id}`,
      "",
      "SIGNIFICANT TRANSCRIPT SEGMENTS:",
      ...segments.map(t => 
        `TIME: ${formatTimestamp(Number(t.time))}\nTEXT: ${t.text}\n---`
      ),
      "",
      "COMPANY INFORMATION:",
      companyInfo[0].transcript,
      "",
      "AVAILABLE TIMESTAMPS:",
      segments.map(t => formatTimestamp(Number(t.time))).join(', ')
    ].join('\n');

    // Debug the output
    console.log('First few segments in output:', 
      segments.slice(0, 3).map(s => ({
        time: formatTimestamp(Number(s.time)),
        text: s.text.substring(0, 30)
      }))
    );

    const blob = new Blob([gptInput], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gpt-input-${result.video.id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">YouTube Transcript Extractor</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col gap-4">
          <label htmlFor="url" className="font-medium">
            Enter YouTube URL:
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="border p-2 rounded"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Extracting...' : 'Get Transcript'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="bg-white shadow rounded p-4 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Video Information:</h2>
              <button
                onClick={handleDownload}
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                Download Transcript
              </button>
            </div>

            <div className="mb-6">
              <img 
                src={result.video.thumbnailUrl} 
                alt={result.video.title}
                className="w-full max-w-md mx-auto rounded mb-4"
              />
              <h3 className="font-bold text-lg mb-2">{result.video.title}</h3>
              <p className="text-gray-600 mb-2">Author: {result.video.author}</p>
              <p className="text-gray-600 mb-2">Language: {result.video.transcriptLanguage}</p>
              <div className="bg-gray-50 p-3 rounded mb-2">
                <h4 className="font-medium mb-1">Description:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{result.video.description}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2">Transcript:</h3>
              <div className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap">
                {result.transcript.map((segment, index) => (
                  <div key={index} className="mb-2 flex">
                    <span className="text-gray-500 mr-2 min-w-[60px]">
                      {formatTimestamp(segment.start)}
                    </span>
                    <p>{segment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h2 className="text-xl font-bold mb-4">Add Company Information</h2>
            <form onSubmit={handleCompanyUrlsSubmit} className="space-y-4">
              <div>
                <label htmlFor="aboutUrl" className="font-medium block mb-2">
                  Company Website URL:
                </label>
                <input
                  type="url"
                  id="aboutUrl"
                  value={companyUrls.aboutUrl}
                  onChange={(e) => setCompanyUrls(prev => ({
                    ...prev,
                    aboutUrl: e.target.value
                  }))}
                  className="border p-2 rounded w-full"
                  placeholder="https://company.com"
                />
              </div>

              <button
                type="submit"
                disabled={loadingCompanyInfo || !companyUrls.aboutUrl}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loadingCompanyInfo ? 'Fetching...' : 'Get Company Info'}
              </button>
            </form>

            {loadingAnalysis && (
              <div className="mt-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Analyzing content and generating optimizations...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}

            {!loadingAnalysis && analysis && (
              <div className="mt-8">
                <h3 className="font-bold text-xl mb-4">Optimized Content Suggestions:</h3>
                
                <div className="space-y-6">
                  {/* Video Optimization Section */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold text-lg mb-3">Video Optimization</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="font-medium block mb-1">Suggested Title:</label>
                        <p className="bg-white p-2 rounded border">
                          {analysis.videoOptimization.title}
                        </p>
                      </div>

                      <div>
                        <label className="font-medium block mb-1">Suggested Description:</label>
                        <div className="bg-white p-2 rounded border whitespace-pre-wrap">
                          {/* Intro */}
                          <p className="mb-4">{analysis.videoOptimization.description.intro}</p>
                          
                          {/* Sections with Timestamps */}
                          <p className="mb-2">Video Sections:</p>
                          {(() => {
                            // Create array of sections with unique timestamps
                            const uniqueSections = [];
                            const usedTimes = new Set();
                            
                            analysis.videoOptimization.description.sections
                              .sort((a, b) => a.time - b.time)
                              .forEach(section => {
                                const timeStr = formatTimestamp(section.time);
                                if (!usedTimes.has(timeStr)) {
                                  uniqueSections.push(section);
                                  usedTimes.add(timeStr);
                                }
                              });
                            
                            return uniqueSections.map((section, index) => (
                              <p key={index} className="ml-4 mb-1">
                                <a 
                                  href={`https://youtu.be/${result.video.id}?t=${Math.floor(section.time)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {formatTimestamp(section.time)}
                                </a>
                                {` - ${section.label}`}
                              </p>
                            ));
                          })()}
                          
                          {/* Call to Action */}
                          <p className="mt-4 mb-4">{analysis.videoOptimization.description.callToAction}</p>
                          
                          {/* Hashtags */}
                          <p>{analysis.videoOptimization.description.hashtags.join(' ')}</p>
                        </div>
                      </div>

                      <div>
                        <label className="font-medium block mb-1">Suggested Tags:</label>
                        <div className="flex flex-wrap gap-2">
                          {analysis.videoOptimization.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Company Information Section */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-bold text-lg mb-3">Company Information</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="font-medium block mb-1">Social Media Links:</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(analysis.companyInfo.socialMediaLinks).map(([platform, url]) => (
                            url && (
                              <a 
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white p-2 rounded border hover:bg-gray-50 flex items-center gap-2"
                              >
                                <span className="capitalize">{platform}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-medium block mb-1">Company Description:</label>
                        <p className="bg-white p-2 rounded border whitespace-pre-wrap">
                          {analysis.companyInfo.companyDescription}
                        </p>
                      </div>

                      <div>
                        <label className="font-medium block mb-1">Contact Information:</label>
                        <p className="bg-white p-2 rounded border">
                          {analysis.companyInfo.contactInfo}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Copy Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const videoId = result.video.id;
                        
                        // First, ensure sections have unique timestamps
                        const uniqueSections = [];
                        const usedTimes = new Set();
                        
                        // Sort sections by time and only keep sections with unique timestamps
                        analysis.videoOptimization.description.sections
                          .sort((a, b) => a.time - b.time)
                          .forEach(section => {
                            const timeStr = formatTimestamp(section.time);
                            if (!usedTimes.has(timeStr)) {
                              uniqueSections.push(section);
                              usedTimes.add(timeStr);
                            }
                          });
                        
                        const description = [
                          analysis.videoOptimization.description.intro,
                          '',
                          'Video Sections:',
                          ...uniqueSections.map(section => 
                            `${formatTimestamp(section.time)} - ${section.label} ➜ https://youtu.be/${videoId}?t=${Math.floor(section.time)}`
                          ),
                          '',
                          analysis.videoOptimization.description.callToAction,
                          '',
                          analysis.videoOptimization.description.hashtags.join(' '),
                          '',
                          '-------------------------------------------',
                          '',
                          analysis.companyInfo.companyDescription,
                          '',
                          'Connect with us:',
                          ...Object.entries(analysis.companyInfo.socialMediaLinks)
                            .filter(([_, url]) => url)
                            .map(([platform, url]) => `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`),
                          '',
                          analysis.companyInfo.contactInfo
                        ].join('\n');
                        
                        navigator.clipboard.writeText(description);
                      }}
                      className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
                    >
                      Copy Full Description
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(analysis.videoOptimization.tags.join(', '))}
                      className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
                    >
                      Copy Tags
                    </button>
                    <button
                      onClick={handleGptInputDownload}
                      className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download GPT Input
                    </button>
                  </div>

                  {/* Timestamps */}
                  <div className="my-4">
                    <p className="font-medium mb-2">Timestamps:</p>
                    {analysis.videoOptimization.description.sections
                      .sort((a, b) => a.time - b.time)
                      .map((section, index) => (
                        <div key={index} className="ml-4 mb-1">
                          <span className="text-blue-600 cursor-pointer hover:underline">
                            {formatTimestamp(section.time)}
                          </span>
                          {` - ${section.label}`}
                          <p className="text-gray-600 text-sm ml-8">{section.description}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
