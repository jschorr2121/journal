// GET /api/insights?user_id=UUID
// Returns flashbacks, open loops, and mood data for the insights dashboard.
// Uses the service key to bypass RLS.

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id required' });

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  try {
    // 1. Flashbacks — entries at 7, 30, 90, 365 days ago
    const offsets = [7, 30, 90, 365];
    const flashbackDates = offsets.map(d => {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      return dt.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    });

    const flashbackFilter = flashbackDates.map(d => `date.eq.${d}`).join(',');
    const fbResp = await fetch(
      `${supabaseUrl}/rest/v1/journal_entries?user_id=eq.${userId}&or=(${flashbackFilter})&select=id,date,title,mood,key_events,highlights&order=date.desc`,
      { headers }
    );
    const flashbackRows = fbResp.ok ? await fbResp.json() : [];

    const flashbacks = flashbackDates.map((date, i) => {
      const entries = flashbackRows.filter(e => e.date === date);
      if (!entries.length) return null;
      const e = entries[0];
      const highlight = (e.key_events || e.highlights || [])[0] || null;
      return {
        date,
        daysAgo: offsets[i],
        label: offsets[i] === 7 ? '1 week ago' : offsets[i] === 30 ? '1 month ago' : offsets[i] === 90 ? '3 months ago' : '1 year ago',
        title: e.title,
        mood: e.mood,
        highlight,
      };
    }).filter(Boolean);

    // 2. Open Loops — last 14 days of worries_and_open_loops, check if mentioned since
    const fourteenAgo = new Date();
    fourteenAgo.setDate(fourteenAgo.getDate() - 14);
    const fourteenAgoStr = fourteenAgo.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const loopsResp = await fetch(
      `${supabaseUrl}/rest/v1/journal_entries?user_id=eq.${userId}&date=gte.${fourteenAgoStr}&select=date,worries_and_open_loops,transcript&order=date.asc`,
      { headers }
    );
    const loopRows = loopsResp.ok ? await loopsResp.json() : [];

    // Collect open loop items and check if they were mentioned in later entries
    const openLoops = [];
    for (let i = 0; i < loopRows.length; i++) {
      const row = loopRows[i];
      const items = row.worries_and_open_loops || [];
      for (const item of items) {
        // Extract key words from the loop item (3+ char words)
        const keywords = item.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        if (!keywords.length) continue;

        // Check if any subsequent entry's transcript mentions these keywords
        let resolved = false;
        for (let j = i + 1; j < loopRows.length; j++) {
          const laterTranscript = (loopRows[j].transcript || '').toLowerCase();
          const matches = keywords.filter(k => laterTranscript.includes(k));
          if (matches.length >= Math.min(2, keywords.length)) {
            resolved = true;
            break;
          }
        }

        if (!resolved) {
          openLoops.push({ text: item, date: row.date });
        }
      }
    }

    // Deduplicate similar loops (keep the most recent)
    const uniqueLoops = [];
    const seen = new Set();
    for (const loop of openLoops.reverse()) {
      const key = loop.text.toLowerCase().substring(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLoops.push(loop);
      }
    }

    // 3. Mood week — last 7 days
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    const sevenAgoStr = sevenAgo.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    const moodResp = await fetch(
      `${supabaseUrl}/rest/v1/journal_entries?user_id=eq.${userId}&date=gte.${sevenAgoStr}&select=date,mood&order=date.asc`,
      { headers }
    );
    const moodRows = moodResp.ok ? await moodResp.json() : [];

    // Build 7-day mood array (one entry per day, most recent mood if multiple)
    const moodMap = {};
    for (const row of moodRows) {
      moodMap[row.date] = row.mood;
    }
    const moodWeek = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      moodWeek.push({ date: dateStr, mood: moodMap[dateStr] || null });
    }

    return res.status(200).json({
      flashbacks,
      openLoops: uniqueLoops.slice(0, 8),
      moodWeek,
    });
  } catch (err) {
    console.error('Insights error:', err);
    return res.status(500).json({ error: err.message });
  }
};
