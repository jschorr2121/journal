const { SUMMARY_PROMPT, FOLLOWUP_PROMPT, SUMMARY_MODEL } = require('./_prompts');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const { transcript, date, existingSummary } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

  const isFollowUp = !!existingSummary;
  const systemPrompt = isFollowUp ? FOLLOWUP_PROMPT : SUMMARY_PROMPT;

  const userContent = isFollowUp
    ? `Date: ${date || new Date().toLocaleDateString()}\n\nExisting summary:\n${JSON.stringify(existingSummary, null, 2)}\n\nNew follow-up transcript:\n${transcript}`
    : `Date: ${date || new Date().toLocaleDateString()}\n\nTranscript:\n${transcript}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Summarization failed', details: await response.text() });
    const data = await response.json();
    const summary = JSON.parse(data.choices[0].message.content);
    return res.status(200).json({ summary });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
