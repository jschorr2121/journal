// Twilio status callback handler
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { CallSid, CallStatus, To, From } = req.body;
  
  console.log('Call status update:', {
    sid: CallSid,
    status: CallStatus,
    to: To,
    from: From,
    timestamp: new Date().toISOString()
  });

  // Log status for debugging
  // Possible statuses: initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled
  
  if (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
    console.error('Call failed:', CallStatus, 'for call', CallSid);
  }

  res.status(200).send('OK');
};
