const { createClient } = require('@supabase/supabase-js');

function getSupabase(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const { type, startDate, endDate, entries } = req.body;
  // entries is passed from the client (already fetched via Supabase client-side)

  if (!entries || !entries.length) {
    return res.status(400).json({ error: 'No entries provided for recap' });
  }

  const period = type === 'month' ? 'month' : 'week';

  const entrySummaries = entries.map(e => ({
    date: e.date,
    title: e.title,
    mood: e.mood,
    key_events: e.key_events,
    highlights: e.highlights,
    productivity: e.productivity,
    goals_and_intentions: e.goals_and_intentions,
    health_and_wellbeing: e.health_and_wellbeing,
    relationships: e.relationships,
    gratitude: e.gratitude,
    ideas_and_insights: e.ideas_and_insights,
    worries_and_open_loops: e.worries_and_open_loops,
    feelings: e.feelings,
    tags: e.tags,
  }));

  const systemPrompt = `You are a personal journal analyst. Given a ${period}'s worth of journal entries, create a thoughtful recap that surfaces patterns, themes, and insights the person might not notice day-to-day.

Output valid JSON:
{
  "title": "Evocative title for this ${period} (e.g. 'The Week Everything Clicked' or 'A Month of Quiet Growth')",
  "overall_mood": "The dominant emotional tone across the ${period}",
  "mood_arc": "1-2 sentences describing how their mood shifted across the ${period}",
  "top_themes": ["3-5 recurring themes or topics that came up repeatedly"],
  "wins": ["Notable accomplishments, breakthroughs, or positive moments"],
  "challenges": ["Ongoing struggles, setbacks, or things that were hard"],
  "open_loops": ["Unresolved items, things they said they'd do but didn't, ongoing worries"],
  "relationships_summary": "Brief note on social/relationship patterns this ${period}",
  "health_summary": "Brief note on health/wellness patterns",
  "growth_observed": ["Ways they grew, things they learned, mindset shifts"],
  "patterns_noticed": ["Interesting patterns: 'You tend to feel X when Y', 'Every time Z happens, you mention...'"],
  "suggestion": "One thoughtful suggestion or reflection prompt for next ${period}",
  "entry_count": ${entries.length},
  "date_range": "${startDate} to ${endDate}"
}

Rules:
- Be specific — reference actual events, people, and details from entries
- Find connections between entries that the person might miss
- Be honest but kind — note struggles without being harsh
- patterns_noticed is the most valuable section — find non-obvious patterns
- Only include sections where you have real content
- Keep the person's voice and energy — don't be clinical`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${period.charAt(0).toUpperCase() + period.slice(1)} entries (${startDate} to ${endDate}):\n\n${JSON.stringify(entrySummaries, null, 2)}` }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: 'Recap generation failed', details: await response.text() });
    const data = await response.json();
    const recap = JSON.parse(data.choices[0].message.content);
    return res.status(200).json({ recap });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
