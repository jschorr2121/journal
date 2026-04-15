// Twilio voice webhook handler for journal calls.
//
// Two phases, both POST to this same endpoint:
//   1. Initial call connect → play greeting, start recording
//   2. Recording complete  → download, transcribe, summarize, save entry
//
// The user_id is passed via the ?user_id=... query param, threaded from
// initiate-call.js through the Record action URL so phase 2 knows which
// user to attribute the entry to.
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.query.user_id;
  console.log('twilio-voice hit — user_id:', userId, 'body keys:', Object.keys(req.body || {}));

  const twiml = new VoiceResponse();

  const sendTwiml = (xml) => {
    res.setHeader('Content-Type', 'text/xml');
    res.end(xml);
  };

  try {
    const body = req.body || {};

    // Phase 2: recording complete callback
    if (body.RecordingUrl) {
      console.log('Phase 2: recording completed for user', userId, ':', body.RecordingUrl);

      try {
        await processRecording(body.RecordingUrl, body.CallSid, userId);
      } catch (err) {
        console.error('Error processing recording:', err);
      }

      twiml.say('Thanks for your journal entry. Good night!');
      twiml.hangup();
      return sendTwiml(twiml.toString());
    }

    // Phase 1: initial call — prompt and start recording
    console.log('Phase 1: greeting user', userId);
    twiml.say(
      { voice: 'alice' },
      "Hi! This is your daily journal call. After the beep, record your journal entry for today. Press pound when you're done, or just hang up."
    );

    const actionUrl = userId
      ? `/api/twilio-voice?user_id=${encodeURIComponent(userId)}`
      : '/api/twilio-voice';

    twiml.record({
      action: actionUrl,
      method: 'POST',
      maxLength: 600,
      timeout: 5,
      transcribe: false,
      playBeep: true,
      finishOnKey: '#',
    });

    twiml.say("We didn't receive a recording. Please try again tomorrow.");
    twiml.hangup();
  } catch (err) {
    console.error('Unhandled error in twilio-voice:', err);
    twiml.say('Sorry, something went wrong. Please try again later.');
    twiml.hangup();
  }

  sendTwiml(twiml.toString());
};

// Give the function up to 60s so inline processing has room to complete.
module.exports.config = { maxDuration: 60 };

async function processRecording(recordingUrl, callSid, userId) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!accountSid || !authToken || !openaiKey || !supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables');
  }
  if (!userId) {
    throw new Error('Missing user_id — cannot attribute entry');
  }

  // 1. Download the recording from Twilio
  const recordingResponse = await fetch(`${recordingUrl}.mp3`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
  });

  if (!recordingResponse.ok) {
    throw new Error(`Failed to download recording: ${recordingResponse.statusText}`);
  }

  const audioBuffer = await recordingResponse.arrayBuffer();
  console.log('Downloaded recording, size:', audioBuffer.byteLength);

  // 2. Transcribe with OpenAI Whisper
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
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: transcribeBody,
  });

  if (!transcribeResponse.ok) {
    throw new Error(`Transcription failed: ${await transcribeResponse.text()}`);
  }

  const transcribeData = await transcribeResponse.json();
  const transcript = transcribeData.text;
  console.log('Transcription successful:', transcript.substring(0, 100) + '...');

  // 3. Summarize via GPT-4o-mini
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
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
- Title should be vivid and specific`,
        },
        {
          role: 'user',
          content: `Date: ${today}\n\nTranscript:\n${transcript}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!summaryResponse.ok) {
    throw new Error(`Summarization failed: ${await summaryResponse.text()}`);
  }

  const summaryData = await summaryResponse.json();
  const summary = JSON.parse(summaryData.choices[0].message.content);
  console.log('Summary generated:', summary.title);

  // 4. Save to Supabase
  const row = {
    user_id: userId,
    date: today,
    transcript,
    title: summary.title || null,
    mood: summary.mood || null,
    tags: summary.tags || [],
    highlights: summary.highlights || [],
    feelings: summary.feelings || [],
    todos: summary.todos || [],
    gratitude: summary.gratitude || [],
    key_events: summary.key_events || [],
    productivity: summary.productivity || [],
    goals_and_intentions: summary.goals_and_intentions || [],
    health_and_wellbeing: summary.health_and_wellbeing || [],
    relationships: summary.relationships || [],
    ideas_and_insights: summary.ideas_and_insights || [],
    worries_and_open_loops: summary.worries_and_open_loops || [],
    other_notes: summary.other_notes || [],
    follow_up_questions: summary.follow_up_questions || [],
    photos: [],
    duration_seconds: 0,
  };

  const saveResponse = await fetch(`${supabaseUrl}/rest/v1/journal_entries`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!saveResponse.ok) {
    throw new Error(`Failed to save entry: ${await saveResponse.text()}`);
  }

  console.log(`Journal entry saved for user ${userId} on ${today}`);
}
