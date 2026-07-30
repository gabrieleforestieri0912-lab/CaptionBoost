import { Innertube } from 'youtubei.js';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const yt = await Innertube.create({ lang: 'en' });
console.log('Session created');

async function tryGetTranscript(yt, videoId, lang) {
  const info = await yt.getInfo(videoId);
  const c = info.captions;
  const tracks = c?.caption_tracks;
  if (!tracks || tracks.length === 0) return null;
  
  // Find the best matching track
  let track = tracks.find(t => t.language_code === lang);
  if (!track) track = tracks[0];
  
  const baseUrl = track.base_url + '&fmt=json';
  
  // Try using the session's HTTP client
  try {
    // Check if session has an http client
    const http = yt.session?.http;
    if (http && typeof http.fetch === 'function') {
      // Use a normal URL (not going through API)
      const resp = await http.fetch(baseUrl.split('?')[0] + '?' + baseUrl.split('?')[1]);
      console.log('HTTP response:', resp.status, resp.ok);
      const text = await resp.text();
      if (text && !text.includes('<html')) {
        return JSON.parse(text);
      }
    }
  } catch(e) {
    console.log('HTTP approach failed:', e.message.substring(0,100));
  }
  
  // Try plain fetch with explicit headers
  try {
    const resp = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.youtube.com/watch?v=' + videoId,
        'Origin': 'https://www.youtube.com',
        'x-youtube-identity-token': yt.session?.context?.client?.id_token || '',
      },
    });
    console.log('Fetch status:', resp.status);
    if (resp.ok) {
      const text = await resp.text();
      if (text && !text.includes('<html') && !text.includes('<script')) {
        return JSON.parse(text);
      }
    }
  } catch(e) {
    console.log('Fetch approach failed:', e.message.substring(0,100));
  }
  
  return null;
}

const data = await tryGetTranscript(yt, 'n7g6T6HNymo', 'en');
if (data) {
  console.log('Got data type:', typeof data);
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    if (data.length > 0) console.log('First:', JSON.stringify(data[0]));
  } else if (data.events) {
    console.log('Events count:', data.events.length);
    console.log('First event:', JSON.stringify(data.events[0]?.segs?.[0]));
  }
} else {
  console.log('No data returned');
}
