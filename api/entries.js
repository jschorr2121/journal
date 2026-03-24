// CRUD for journal entries via Supabase REST API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function headers() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const base = `${SUPABASE_URL}/rest/v1/journal_entries`;

  try {
    if (req.method === 'GET') {
      const { date, from, to } = req.query;
      let url = base + '?order=created_at.desc';
      if (date) url += `&date=eq.${date}`;
      else if (from && to) url += `&date=gte.${from}&date=lte.${to}`;

      const resp = await fetch(url, { headers: headers() });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      return res.status(200).json({ entries: await resp.json() });
    }

    if (req.method === 'POST') {
      const { date, transcript, summary, duration_seconds } = req.body;
      if (!date || !transcript) return res.status(400).json({ error: 'date and transcript required' });

      const entry = {
        date, transcript,
        title: summary?.title || null,
        mood: summary?.mood || null,
        highlights: summary?.highlights || [],
        feelings: summary?.feelings || [],
        todos: summary?.todos || [],
        gratitude: summary?.gratitude || [],
        tags: summary?.tags || [],
        duration_seconds: duration_seconds || null,
      };

      const resp = await fetch(base, {
        method: 'POST', headers: headers(), body: JSON.stringify(entry),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      return res.status(201).json({ entry: data[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const resp = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: headers() });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      return res.status(200).json({ deleted: true });
    }

    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const resp = await fetch(`${base}?id=eq.${id}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ ...req.body, updated_at: new Date().toISOString() }),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      return res.status(200).json({ entry: data[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
