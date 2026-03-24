# IDEAS.md — Journal / Second Brain

## The Vision: Second Brain

The journal app evolves into **Second Brain** — your always-on thinking partner that captures, organizes, and surfaces your thoughts, work, and ideas throughout the day.

It's not just a journal. It's an externalized mind you can talk to anytime, that remembers everything, finds connections you'd miss, and asks you the right questions at the right time.

### Core Concept
- **Always available** — talk to it anytime throughout the day via voice or text (phone, desktop, watch)
- **Conversational** — it asks you questions back when you talk to it, like a curious friend who knows your whole history
- **Organized automatically** — everything you say gets structured, tagged, and made searchable without you lifting a finger
- **Proactive** — it surfaces relevant past thoughts when you're working on something related, reminds you of open loops, notices patterns
- **Your entire mental model** — thoughts, ideas, work notes, meeting takeaways, learnings, people, decisions, dreams, goals — all in one searchable place

---

## Feature Ideas

### Already Built
- [x] Voice + text journaling with live transcription
- [x] AI-structured summaries (mood, events, goals, feelings, etc.)
- [x] Follow-up questions after each entry (deepens reflection)
- [x] Weekly/Monthly recaps with pattern detection
- [x] Photo attachments
- [x] Search across all entries
- [x] Calendar navigation with entry dots
- [x] Streak tracking
- [x] Edit entries + re-summarize
- [x] Export (markdown)
- [x] PWA (installable)

### In Progress / Planned
- [ ] **Talk to Your Journal** — natural language chat over all entries (pgvector RAG, see CHAT-FEATURE-PLAN.md)

### High Priority Ideas

#### Always-On Capture
- [ ] **Quick capture mode** — tap and talk for 10 seconds, it files it into the right category automatically. No friction. Like a voice note that organizes itself.
- [ ] **Widget / notification shade entry** — Android/iOS widget to capture a thought without even opening the app
- [ ] **Apple Watch / WearOS companion** — "Hey Second Brain, remind me to follow up with Alex about the demo" → captured, categorized, surfaced later
- [ ] **Telegram/iMessage bot** — text your thoughts to a chat bot, they appear in the app organized

#### Conversational Intelligence
- [ ] **Active listening mode** — when you talk to it, it asks follow-up questions in real-time (not just after saving). Like a conversation, not a monologue.
- [ ] **Morning check-in** — "How are you feeling? What's on your plate today?" proactive prompt each morning
- [ ] **Evening reflection** — "How did the day go? Did you get to those things you planned?" ties back to morning
- [ ] **Contextual nudges** — "You mentioned wanting to start meditating 3 weeks ago but haven't mentioned it since. Still interested?"
- [ ] **Devil's advocate mode** — when you're thinking through a decision, it pushes back and asks hard questions
- [ ] **Rubber duck debugging** — for work problems, it asks clarifying questions until you solve it yourself

#### Organization & Knowledge
- [ ] **Auto-tagging + categories** — entries auto-organize into: Work, Health, Relationships, Ideas, Goals, etc.
- [ ] **People graph** — tracks everyone you mention, builds a relationship map. "When did I last see Alex?" "What did Sarah recommend?"
- [ ] **Project threads** — link entries to projects. See all thoughts about "the startup idea" in one timeline.
- [ ] **Decision log** — flag entries as decisions. Track what you decided and why. Review later.
- [ ] **Idea bank** — separate space for raw ideas that get automatically connected to related entries
- [ ] **Learning log** — things you've learned, books, articles, courses. Spaced repetition reminders.
- [ ] **Meeting notes mode** — record a meeting, get structured notes + action items + follow-ups

#### Insights & Patterns
- [ ] **Mood heatmap** — calendar view colored by mood (like GitHub contribution graph)
- [ ] **Correlation engine** — "You tend to feel energized on days you exercise before work" "Your mood dips on Sundays"
- [ ] **Goal tracking** — set goals, track mentions and progress automatically across entries
- [ ] **Sentiment timeline** — actual sentiment analysis charting emotional trajectory over time
- [ ] **"On This Day" flashbacks** — 1 week, 1 month, 1 year ago entries shown on the home screen
- [ ] **Year in Review** — auto-generated annual recap. The themes of your year.
- [ ] **Weekly email digest** — summary of the week emailed to you (like the recap but delivered)

#### Social & Sharing
- [ ] **Shared journals** — couples journal, team retro, family memory book
- [ ] **Therapist export** — formatted PDF of recent entries for therapy sessions
- [ ] **Accountability partner** — share specific goals/streaks with a friend

#### Media & Rich Content
- [ ] **Audio playback** — keep the original audio recording, play it back later
- [ ] **Location tagging** — auto-attach location to entries. "All my entries from Tokyo" filter.
- [ ] **Spotify/music integration** — "What was I listening to that day?"
- [ ] **Screenshots & links** — paste a URL or screenshot, it gets attached and summarized

#### Platform & Distribution
- [ ] **Native mobile app** (React Native or Capacitor wrapper)
- [ ] **Desktop app** (Electron or Tauri)
- [ ] **Browser extension** — capture thoughts while browsing, highlight and save to Second Brain
- [ ] **API** — let other apps write to your Second Brain (Zapier, Shortcuts, etc.)
- [ ] **Import** — bring in existing journals from Day One, Apple Journal, Notion, etc.

### Monetization Ideas
- Free tier: 3 entries/day, basic summaries, 7-day recap
- Pro ($6.99/mo): Unlimited entries, chat with journal, monthly recaps, photo attachments, export
- Premium ($14.99/mo): Always-on capture, proactive nudges, advanced insights, API access

### Name Options
- **Second Brain** (strong, clear value prop)
- **Journal** (simple, current)
- **Reflect** (meditation/mindfulness angle)
- **Cortex** (techy, brain-like)
- **Thread** (thoughts threaded together)

---

## North Star
The end state is: you talk to Second Brain as naturally as you'd talk to a close friend who happens to have perfect memory. It knows your history, your goals, your patterns, your people. It makes you more self-aware, more organized, and more intentional — without adding friction to your day.

The journal is the starting point. The Second Brain is the destination.
