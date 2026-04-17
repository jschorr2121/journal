# Journal App — TODO

## Cost / Infrastructure
- [ ] **Switch Twilio → SignalWire** — same "calls you every night" UX, ~3-4x cheaper ($0.004/min vs $0.014/min). API is Twilio-compatible so it's a credential swap + one URL change, no logic changes.
- [ ] **Switch OpenAI Whisper → Groq Whisper** — currently using `whisper-1` via `api.openai.com`. Groq runs Whisper large-v3 at ~7x cheaper ($0.00083/min vs $0.006/min) and is much faster. API change in `api/twilio-voice.js`.

## Bugs
- [ ] **Photos not showing after upload** — `journal-photos` bucket exists but photos aren't appearing. Need to check Supabase storage RLS policies (authenticated users likely need an INSERT policy). Open browser console and check for upload errors when adding a photo.
