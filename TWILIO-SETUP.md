# Twilio Nightly Journal Call Setup

## Overview
Every night at 10:30 PM ET, your journal app will automatically call you via Twilio to record your daily entry. The recording is then transcribed, summarized, and saved to your database.

## Architecture
1. **Cron job** (disabled by default) triggers at 10:30 PM ET
2. **POST** to `/api/initiate-call` starts the outbound call
3. **Twilio** calls your phone and plays greeting
4. **You record** your journal entry (up to 10 minutes)
5. **Recording** is automatically downloaded
6. **Transcription** via OpenAI Whisper
7. **Summarization** via existing GPT-4o-mini logic
8. **Save** to Supabase database

## Required Environment Variables

Add these to your Vercel environment variables:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
USER_PHONE_NUMBER=+1234567890    # Your personal phone number

# Base URL (for webhooks)
BASE_URL=your-journal-app.vercel.app
# OR if VERCEL_URL is available, it will use that automatically

# Already have these:
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
```

## Twilio Setup Steps

### 1. Sign up for Twilio
- Go to https://www.twilio.com/try-twilio
- Sign up for a free trial account
- You get $15 credit which is ~500 minutes of calls

### 2. Get a Phone Number
- In Twilio Console, go to Phone Numbers > Manage > Buy a number
- Choose a number (preferably local to you for better answer rates)
- Cost: $1/month + $0.0085/minute for calls

### 3. Get Your Credentials
- **Account SID**: Found on Twilio Console dashboard
- **Auth Token**: Click "View" on the dashboard (keep this secret!)

### 4. Configure Webhooks
Twilio needs to know where to send call events. In your Twilio Console:
- Go to Phone Numbers > Manage > Active Numbers
- Click your purchased number
- Under "Voice & Fax", set:
  - **A Call Comes In**: Webhook → `https://your-journal-app.vercel.app/api/twilio-voice` → HTTP POST
  - **Primary handler fails**: Leave blank or use same URL

### 5. Install Dependencies
```bash
cd /home/ubuntu/clawd/journal
npm install twilio
```

### 6. Deploy to Vercel
```bash
cd /home/ubuntu/clawd/journal
vercel --prod
```

### 7. Enable the Cron Job
Once everything is configured and tested:
```bash
# Use OpenClaw's cron tool
cron update --jobId ba0d71da-26ee-4294-a4aa-d4753c0dd02c --patch '{"enabled": true}'
```

## Testing

### Test the Call Manually
```bash
curl -X POST https://your-journal-app.vercel.app/api/initiate-call
```

You should receive a call immediately. The workflow:
1. Phone rings
2. Greeting plays: "Hi! This is your daily journal call..."
3. Beep sounds
4. You record your entry
5. Press # or hang up when done
6. "Thanks for your journal entry. Good night!"
7. Call ends, processing happens in background

### Check Logs
- **Twilio Console** > Monitor > Logs > Calls - see call status
- **Vercel Dashboard** > Your Project > Logs - see API logs
- **Supabase** > Table Editor > entries - verify entry was saved

## Cost Estimate
- **Phone number**: $1/month
- **Outbound call**: ~$0.013/minute (average 5-min call = $0.065)
- **Recording storage**: Free (deleted after processing)
- **Monthly**: ~$1 + ($0.065 × 30 days) = ~$3/month

## Troubleshooting

### Call doesn't connect
- Check USER_PHONE_NUMBER is in E.164 format: `+1234567890`
- Verify Twilio number is configured correctly
- Check Twilio Console > Monitor > Logs for error messages

### Recording fails
- Check webhook URL is accessible: `curl https://your-app.vercel.app/api/twilio-voice`
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct
- Check Vercel function logs for errors

### Transcription fails
- Verify OPENAI_API_KEY is valid
- Check OpenAI usage limits/quota
- Look for transcription errors in Vercel logs

### Entry not saved
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY
- Verify table exists: `entries` table in Supabase
- Check Supabase logs for permission issues

## Manual Trigger
You can manually trigger a journal call anytime:
```bash
curl -X POST https://your-journal-app.vercel.app/api/initiate-call
```

## Disable Nightly Calls
```bash
cron update --jobId ba0d71da-26ee-4294-a4aa-d4753c0dd02c --patch '{"enabled": false}'
```

## DST (Daylight Saving Time) Note
The cron runs at 02:30 UTC which is:
- **10:30 PM EDT** (March - November, most of the year)
- **9:30 PM EST** (November - March, winter)

If you want it to always be 10:30 PM regardless of DST, you'll need to adjust the cron schedule twice a year, or switch to a timezone-aware scheduler.

## Next Steps
1. ✅ Code is ready (already created the API endpoints)
2. ⏳ Get Twilio account and phone number
3. ⏳ Add environment variables to Vercel
4. ⏳ Deploy to Vercel: `cd /home/ubuntu/clawd/journal && vercel --prod`
5. ⏳ Test manually with curl
6. ⏳ Enable cron job

## Questions?
Let me know if you need help with any step!
