# Talk to Your Journal — Feature Plan

## Overview
A conversational interface that lets you ask natural language questions about your journal entries. "When was the last time I felt really productive?" → searches your entries and gives a contextual answer.

## Architecture

### Option A: Simple Vector Search (Recommended to start)
**Cost: ~$0.001 per query | Build time: 4-6 hours**

1. **Embedding Pipeline**
   - When an entry is saved/updated, generate an embedding via OpenAI `text-embedding-3-small` ($0.02/1M tokens — essentially free)
   - Store the embedding vector in Supabase using `pgvector` extension (free, built into Supabase)
   - Embed a combination of: title + mood + all section content + transcript excerpt

2. **Query Flow**
   ```
   User asks question
   → Embed the question
   → Vector similarity search against all entry embeddings (top 5-10 matches)
   → Pass matches + question to GPT for a natural language answer
   → Display answer with links to referenced entries
   ```

3. **Database Changes**
   ```sql
   -- Enable pgvector
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Add embedding column
   ALTER TABLE journal_entries ADD COLUMN embedding vector(1536);
   
   -- Create index for fast similarity search
   CREATE INDEX ON journal_entries 
     USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 100);
   ```

4. **New API Endpoints**
   - `POST /api/embed` — Generate and store embedding for an entry (called on save/update)
   - `POST /api/chat` — Handle a chat query (embed question → search → GPT answer)
   - `POST /api/backfill-embeddings` — One-time job to embed all existing entries

### Option B: Full RAG with Conversation Memory
**Cost: ~$0.01 per query | Build time: 8-12 hours**

Everything from Option A, plus:
- Conversation history (multi-turn chat)
- Supabase table for chat sessions
- Context window management (sliding window of recent messages + retrieved entries)
- "Sources" panel showing which entries informed the answer

## UI Design

### Chat Panel
- Slide-out panel from the right side (like a chat drawer)
- Toggle button in the header (chat bubble icon)
- Message bubbles: user questions (right) + AI answers (left)
- AI answers include clickable entry references (date + title) that navigate to that day
- Suggested questions on first open:
  - "What have I been most grateful for lately?"
  - "When was I most productive this month?"
  - "What patterns do you notice in my moods?"
  - "Summarize my week"
  - "What are my open loops?"

### Chat Input
- Text input at bottom of panel
- Voice input button (reuse existing speech recognition)
- Send button

### Answer Format
- Natural conversational text
- Inline citations: "[Mar 15 — Crushed the Demo]" as clickable links
- If the answer references specific entries, show small preview cards

## Example Queries & Expected Behavior

| Query | Approach |
|-------|----------|
| "When did I last go to the gym?" | Vector search for gym/exercise entries → find most recent |
| "What's been stressing me out?" | Search worries_and_open_loops + negative moods → synthesize |
| "How has my mood been this month?" | Fetch all mood fields for date range → trend analysis |
| "Tell me about the dinner with Alex" | Vector search for Alex + dinner → return matching entry |
| "What should I focus on this week?" | Search recent goals/todos/open_loops → prioritize |
| "Am I happier than last month?" | Compare mood distributions across months |

## Implementation Steps

### Phase 1: Backend (2-3 hours)
1. Enable pgvector in Supabase SQL Editor
2. Add embedding column + index
3. Build `/api/embed` endpoint
4. Build `/api/chat` endpoint  
5. Build `/api/backfill-embeddings` for existing entries
6. Hook embedding generation into save/update flow

### Phase 2: Frontend (2-3 hours)
1. Chat panel UI (slide-out drawer)
2. Message rendering (bubbles, citations, entry links)
3. Input bar with send + voice
4. Suggested questions
5. Loading states

### Phase 3: Polish (1-2 hours)
1. Entry link navigation (click citation → go to that day)
2. Conversation memory (optional — can start stateless)
3. "More like this" button on entries
4. Rate answers (thumbs up/down for future tuning)

## Cost Estimate
- **Embeddings**: ~$0.00002 per entry (negligible)
- **Chat query**: ~$0.001-0.003 per question (embedding + GPT-5.4-mini)
- **Storage**: pgvector adds ~6KB per entry (1536-dim float32)
- **At 365 entries/year**: ~$0.01/year for embeddings, ~$0.50/year for daily chat usage

## Tech Stack
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims, cheapest)
- **Vector DB**: Supabase pgvector (already included, no extra cost)
- **Answer generation**: GPT-5.4-mini (fast, cheap, good enough)
- **Alternative**: Could use Groq for answer generation too (even cheaper)

## Migration Path
Start with Option A (stateless single-turn). If users want conversation memory, upgrade to Option B later. The vector search infrastructure is the same either way.

## Timeline
- **Day 1**: Database setup + embedding pipeline + backfill
- **Day 2**: Chat API + basic UI
- **Day 3**: Polish, citations, suggested questions, voice input
- **Total: ~3 days of focused work**
