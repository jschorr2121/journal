// Twilio voice webhook handler for journal calls
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const response = new VoiceResponse();

  // Check if this is the initial call or a recording callback
  if (req.body.RecordingUrl) {
    // Recording completed - trigger transcription
    console.log('Recording completed:', req.body.RecordingUrl);
    response.say('Thanks for your journal entry. Good night!');
    response.hangup();
    
    // Trigger async processing (don't await - let Twilio callback complete)
    processRecording(req.body.RecordingUrl, req.body.CallSid).catch(console.error);
    
    return res.type('text/xml').send(response.toString());
  }

  // Initial call - prompt for journal entry
  response.say({
    voice: 'alice'
  }, 'Hi! This is your daily journal call. After the beep, record your journal entry for today. Press pound when you\'re done, or just hang up.');
  
  response.record({
    action: '/api/twilio-voice',
    method: 'POST',
    maxLength: 600, // 10 minutes max
    timeout: 5, // 5 seconds of silence ends recording
    transcribe: false, // We'll use OpenAI Whisper instead
    playBeep: true,
    finishOnKey: '#'
  });

  response.say('We didn\'t receive a recording. Please try again tomorrow.');
  response.hangup();

  res.type('text/xml').send(response.toString());
};

async function processRecording(recordingUrl, callSid) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!accountSid || !authToken || !openaiKey || !supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return;
    }

    // Download the recording from Twilio
    const recordingResponse = await fetch(`${recordingUrl}.mp3`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });

    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.statusText}`);
    }

    const audioBuffer = await recordingResponse.arrayBuffer();
    console.log('Downloaded recording, size:', audioBuffer.byteLength);

    // Transcribe with OpenAI Whisper
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="journal-entry.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`);
    parts.push(Buffer.from(audioBuffer));
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nThis is a daily journal entry about someone's day.\r\n`);
    parts.push(`--${boundary}--\r\n`);

    const transcribeBody = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
    
    const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: transcribeBody
    });

    if (!transcribeResponse.ok) {
      throw new Error(`Transcription failed: ${await transcribeResponse.text()}`);
    }

    const transcribeData = await transcribeResponse.json();
    const transcript = transcribeData.text;
    console.log('Transcription successful:', transcript.substring(0, 100) + '...');

    // Generate summary using OpenAI
    const today = new Date().toISOString().split('T')[0];
    
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a personal journal assistant. Take a raw voice transcript and produce a clean, structured summary.

Output valid JSON:
{
  "title": "Short evocative title for the day (2-6 words, memorable not generic)",
  "mood": "Single word that captures the vibe",
  "key_events": ["Notable things that happened with specifics"],
  "productivity": ["Things accomplished, unfinished, frustrations"],
  "goals_and_intentions": ["Tomorrow's priorities, longer-term goals"],
  "health_and_wellbeing": ["Sleep, exercise, food, energy level"],
  "relationships": ["Interactions, social dynamics"],
  "gratitude": ["Things they expressed appreciation about"],
  "ideas_and_insights": ["New ideas, realizations, learnings"],
  "worries_and_open_loops": ["Unresolved concerns, decisions pending"],
  "feelings": ["Emotions/reflections mentioned"],
  "tags": ["lowercase tags: work, social, health, etc."],
  "other_notes": ["Anything else mentioned"],
  "follow_up_questions": ["1-2 thoughtful follow-up questions"]
}

Rules:
- ONLY include sections with content
- Preserve authentic voice
- Be specific with names, places, details
- Title should be vivid and specific`
          },
          {
            role: 'user',
            content: `Date: ${today}\n\nTranscript:\n${transcript}`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!summaryResponse.ok) {
      throw new Error(`Summarization failed: ${await summaryResponse.text()}`);
    }

    const summaryData = await summaryResponse.json();
    const summary = JSON.parse(summaryData.choices[0].message.content);
    console.log('Summary generated:', summary.title);

    // Save to Supabase
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/entries`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        entry_date: today,
        transcript: transcript,
        summary: summary,
        duration: 0 // Could calculate from recording duration if needed
      })
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to save entry: ${await saveResponse.text()}`);
    }

    console.log('Journal entry saved successfully for', today);
  } catch (error) {
    console.error('Error processing recording:', error);
  }
}
