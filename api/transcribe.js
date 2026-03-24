// Kept as fallback — can be used for audio file uploads or re-processing
// Primary transcription now uses Web Speech API in the browser
const { Readable } = require('stream');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length === 0) return res.status(400).json({ error: 'No audio data received' });

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.webm"\r\nContent-Type: audio/webm\r\n\r\n`);
    parts.push(audioBuffer);
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nThis is a daily journal entry about someone's day.\r\n`);
    parts.push(`--${boundary}--\r\n`);

    const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Transcription failed', details: await response.text() });
    const data = await response.json();
    return res.status(200).json({ transcript: data.text });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

module.exports.config = { api: { bodyParser: false } };
