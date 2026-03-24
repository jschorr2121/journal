module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const { transcript, date } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

  const systemPrompt = `You are a personal journal assistant. Take a raw voice transcript or typed entry and produce a clean, structured summary. Output valid JSON with this structure. ONLY include a section if the transcript actually mentions something relevant to it. Omit sections entirely (don't include the key) if nothing in the transcript touches on that topic.

{
  "title": "Short evocative title for the day (2-6 words, memorable not generic)",
  "mood": "Single word that captures the vibe",
  "key_events": ["Notable things that happened. For each, note what happened, who was involved, and where if mentioned. Be specific."],
  "productivity": ["Things accomplished, things left unfinished, frustrations or blockers encountered."],
  "goals_and_intentions": ["Tomorrow's priorities and todos, longer-term goals referenced, commitments made."],
  "health_and_wellbeing": ["Sleep quality, exercise, food/drink notes, energy level, any symptoms mentioned."],
  "relationships": ["Interactions with people, social dynamics, relationship reflections."],
  "gratitude": ["Things they expressed appreciation or positivity about."],
  "ideas_and_insights": ["New ideas, realizations, creative thoughts, learnings, aha moments."],
  "worries_and_open_loops": ["Unresolved concerns, things weighing on them, decisions not yet made, anxieties."],
  "feelings": ["Array of emotions/reflections mentioned - keep the person's voice. These should be actual feelings; if no feelings mentioned, keep blank."],
  "tags": ["lowercase category tags: work, social, health, creative, food, fitness, relationships, money, travel, etc."],
  "other_notes": ["Anything else mentioned that doesn't fall into the above categories."]
}

Rules:
- ONLY include a section if the transcript contains content for it. If they don't mention health at all, do NOT include health_and_wellbeing. If they don't express gratitude, do NOT include gratitude.
- Preserve the speaker's authentic voice and tone — don't corporatize or sanitize it
- Be specific: include names of people, places, restaurants, projects, etc.
- Each bullet should be concise but substantive (1-2 sentences, not overly wordy)
- goals_and_intentions should capture ALL todos and plans, even offhand ones ("I should probably..." counts). When in doubt, include it.
- Title should be vivid and specific ("Crushed the Morgan Stanley demo" not "Productive work day")
- Mood word should be specific and expressive
- Tags should reflect the actual content discussed`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Date: ${date || new Date().toLocaleDateString()}\n\nTranscript:\n${transcript}` }
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
