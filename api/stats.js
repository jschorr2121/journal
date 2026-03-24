const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    // Get all unique entry dates for stats
    const { data, error } = await supabase
      .from('entries')
      .select('entry_date, created_at')
      .order('entry_date', { ascending: false });

    if (error) throw error;

    const totalEntries = data.length;
    const uniqueDays = new Set(data.map(d => d.entry_date));
    const totalDays = uniqueDays.size;

    // Calculate streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const dateSet = uniqueDays;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dateSet.has(key)) {
        streak++;
      } else if (i > 0) break;
    }

    // Dates with entries (for calendar dots)
    const entryDates = [...uniqueDays];

    return res.status(200).json({ totalEntries, totalDays, streak, entryDates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
