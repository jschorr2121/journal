// Endpoint to initiate the nightly journal call
const twilio = require('twilio');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const userPhone = process.env.USER_PHONE_NUMBER; // Jake's phone
  const baseUrl = process.env.VERCEL_URL || process.env.BASE_URL;

  if (!accountSid || !authToken || !twilioPhone || !userPhone) {
    return res.status(500).json({ error: 'Missing Twilio configuration' });
  }

  try {
    const client = twilio(accountSid, authToken);
    
    const call = await client.calls.create({
      url: `https://${baseUrl}/api/twilio-voice`,
      to: userPhone,
      from: twilioPhone,
      method: 'POST',
      statusCallback: `https://${baseUrl}/api/twilio-status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    console.log('Call initiated:', call.sid);
    return res.status(200).json({ 
      success: true, 
      callSid: call.sid,
      message: 'Journal call initiated'
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    return res.status(500).json({ 
      error: 'Failed to initiate call', 
      details: error.message 
    });
  }
};
