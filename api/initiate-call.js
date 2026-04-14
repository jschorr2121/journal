// Endpoint to initiate the nightly journal call.
// Reads phone numbers from the `profiles` table and places a call to each
// user who has a phone number set. Triggered daily by Vercel cron (GET) and
// also available for manual testing via POST.
const twilio = require('twilio');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel cron hits this endpoint with GET and an Authorization header
  // containing CRON_SECRET. Reject unauthenticated GETs if the secret is set.
  if (req.method === 'GET' && process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const baseUrl = process.env.VERCEL_URL || process.env.BASE_URL;

  if (!accountSid || !authToken || !twilioPhone) {
    return res.status(500).json({ error: 'Missing Twilio configuration' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }
  if (!baseUrl) {
    return res.status(500).json({ error: 'Missing BASE_URL / VERCEL_URL — cannot form webhook URL' });
  }

  try {
    // Fetch all profiles that have a phone number set. Uses the service key
    // so RLS is bypassed.
    const profilesResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=user_id,phone_number`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!profilesResp.ok) {
      const detail = await profilesResp.text();
      console.error('Failed to fetch profiles:', detail);
      return res.status(500).json({ error: 'Failed to fetch profiles', details: detail });
    }

    const allProfiles = await profilesResp.json();
    const profiles = allProfiles.filter(p => p.phone_number && p.phone_number.trim());

    if (!profiles.length) {
      return res.status(200).json({
        success: true,
        message: 'No users with phone numbers configured — nothing to call',
        calls: [],
      });
    }

    const client = twilio(accountSid, authToken);
    const results = [];

    for (const profile of profiles) {
      const userId = profile.user_id;
      const toPhone = profile.phone_number;
      // Pass user_id in the webhook URL so twilio-voice knows which user
      // this recording should be saved for.
      const voiceUrl = `https://${baseUrl}/api/twilio-voice?user_id=${encodeURIComponent(userId)}`;

      try {
        const call = await client.calls.create({
          url: voiceUrl,
          to: toPhone,
          from: twilioPhone,
          method: 'POST',
          statusCallback: `https://${baseUrl}/api/twilio-status`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        });
        console.log(`Call initiated for user ${userId}:`, call.sid);
        results.push({ user_id: userId, callSid: call.sid, status: 'initiated' });
      } catch (err) {
        console.error(`Failed to call user ${userId}:`, err.message);
        results.push({ user_id: userId, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Initiated ${results.filter(r => r.status === 'initiated').length} of ${results.length} calls`,
      calls: results,
    });
  } catch (error) {
    console.error('Error initiating calls:', error);
    return res.status(500).json({
      error: 'Failed to initiate calls',
      details: error.message,
    });
  }
};
