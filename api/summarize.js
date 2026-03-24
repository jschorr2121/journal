module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const { transcript, date, existingSummary } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

  const isFollowUp = !!existingSummary;

  const systemPrompt = isFollowUp
    ? `You are a personal journal assistant. The user already has a journal entry with this existing summary, and has now added a follow-up response. Merge the new content into the existing summary — update sections, add new items, adjust mood/title if appropriate. Also generate 1-2 NEW follow-up questions based on the combined content.

Output valid JSON:
{
  "title": "Updated title if the follow-up changes the vibe (2-6 words)",
  "mood": "Updated mood word",
  "key_events": [], "productivity": [], "goals_and_intentions": [],
  "health_and_wellbeing": [], "relationships": [], "gratitude": [],
  "ideas_and_insights": [], "worries_and_open_loops": [], "feelings": [],
  "tags": [], "other_notes": [],
  "follow_up_questions": ["1-2 thoughtful follow-up questions based on the COMBINED entry"]
}

Rules:
- MERGE new content with existing — don't lose anything from the original summary
- Only include sections that have content
- Follow-up questions should be specific to what they said, not generic
- Preserve the speaker's authentic voice`
    : `You are a personal journal assistant. Take a raw voice transcript or typed entry and produce a clean, structured summary. Also generate 1-2 follow-up questions to deepen their reflection.

Output valid JSON:
{
  "title": "Short evocative title for the day (2-6 words, memorable not generic)",
  "mood": "Single word that captures the vibe, this should not be generic",
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
  "other_notes": ["Anything else mentioned that doesn't fall into the above categories."],
  "follow_up_questions": ["1-2 specific, thoughtful follow-up questions that reference what the user actually talked about. NOT generic prompts. These should feel like a good therapist or close friend asking a natural follow-up."]
}

Rules:
- ONLY include a section if the transcript contains content for it
- Preserve the speaker's authentic voice and tone
- Be specific: include names of people, places, restaurants, projects, etc.
- Each bullet should be concise but substantive (1-2 sentences)
- goals_and_intentions should capture ALL todos and plans, even offhand ones
- Title should be vivid and specific ("Crushed the Morgan Stanley demo" not "Productive work day")
- Mood word should be specific and expressive, not generic
- Follow-up questions should be specific to the content, empathetic, and encourage deeper reflection`;

  const userContent = isFollowUp
    ? `Date: ${date || new Date().toLocaleDateString()}\n\nExisting summary:\n${JSON.stringify(existingSummary, null, 2)}\n\nNew follow-up transcript:\n${transcript}`
    : `Date: ${date || new Date().toLocaleDateString()}\n\nTranscript:\n${transcript}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
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
