# Script Skill — WhatsApp Viral Reel Writer for American Hairline

Production-grade Node.js service. Vinitt sends a WhatsApp voice note or text → the bot transcribes, classifies intent, generates a 10/10 viral reel script in Vinitt's exact style, and replies on WhatsApp. Supports iterative editing in-thread without context bleeding across topics.

## Architecture

```
WAHA ──webhook──▶ Express  ──┐
                              │
                              ├─▶ Groq (whisper-large-v3)         transcription
                              ├─▶ Anthropic Haiku                 intent classification
                              ├─▶ Anthropic Sonnet + few-shots    writing / editing
                              └─▶ Supabase                        sessions, messages, archive
WAHA ◀──sendText─────────────┘
```

**Why this stack:**

- **Groq** for Whisper — same model as OpenAI but ~5× faster and ~30× cheaper. Critical because Vinitt mixes Hindi/Marathi/English freely; `whisper-large-v3` is multilingual.
- **Anthropic Haiku** for intent — cheap, fast, nails JSON classification.
- **Anthropic Sonnet** for writing — needed for the nuanced 50/50 Hinglish style. The system prompt + two-shot exemplars do most of the work.
- **Supabase** for state — sliding window memory keeps the DB footprint microscopic. Free tier handles thousands of scripts indefinitely.

## v2 changes (May 21, 2026 — post content-team meeting)

Rules added after Vinitt's brief to the content team:

- **Audience scope** — MOFU + BOFU only. TOFU briefs auto-reframe toward decision-trigger angles.
- **First Word Rule** — celebrity name MUST be the first word of the hook; high-profile names pulled into first 1-3 words even when tangential.
- **Hemingway pass** — output must be 10th-standard readable. Medical jargon banned. "DHT blocker" → "baal ki jad ko marne se rokta hai".
- **Auto-audit second pass** — Vinitt's explicit rule: never one-shot. The writer now generates → audits → rewrites to 10/10 internally before sending. Cost doubles for new scripts (~6¢) but the first thing Vinitt sees is the 10/10 version, not a 6/10 draft.
- **Language mode parameter** — `english` / `hindi` / `hinglish` (default). Switches happen only between full thoughts, never mid-sentence.
- **Content category parameter** — `transplant` / `toppers` / `permanent_extensions` / `wig`. Different vocabulary per category.
- **Duration target** — explicit 40-50 sec range, stated in runtime footer.

Edits remain single-pass — auto-audit would override the user's intent mid-iteration.

## Quick start

```bash
git clone <this>
cd script-skill
cp .env.example .env
# fill in keys (Anthropic, Groq, Supabase, WAHA)
npm install
# in Supabase SQL editor, run db/schema.sql once
npm start
```

Expose `https://yourhost/webhook/waha` and register it in WAHA's webhook config.

## Conversation flow

The bot supports four intents on every incoming message. Routed automatically by a small classifier (Haiku); no commands needed, but explicit keywords always work.

| Intent | What it does | Example messages |
|---|---|---|
| `new` | Closes any active session, opens a fresh one, generates a brand-new script. | A new topic, a celebrity name, a voice note about a new case. |
| `edit` | Refines the current draft in-thread. Session context preserved. | "Make the hook punchier", "more Hindi", "this is too long", "review again". |
| `approve` | Archives the current draft to `final_scripts`, closes the session. | "approved", "done", "ship it", "lock it", 👍 |
| `reset` | Throws away current context without archiving. | "reset", "new chat", "start over". |

**Why this fixes the two failure modes Vinitt asked about:**

1. *Contextual edits* — every message hits the active session and pulls the last N turns from `messages`. The writer sees the running history; edits compound coherently instead of starting from scratch.
2. *No bleeding between topics* — the intent router runs Haiku against the recent history before the writer is called. If it detects a new topic, the previous session is closed and a fresh one is opened **before** the writer is invoked. The writer literally never sees the previous topic's context.

## Memory model

Three tables (`db/schema.sql`):

- `sessions` — one row per script. `status` is `active` while being worked on, then flipped to `archived` on approval or `abandoned` on reset / TTL expiry.
- `messages` — every turn (user transcript, edit instruction, generated script). Sliding window of size `SESSION_WINDOW_SIZE` (default 20) is fed to the writer.
- `final_scripts` — approved scripts only. Tiny rows kept forever.
- `processed_events` — webhook idempotency (de-dupes WAHA redeliveries).

A scheduled cleanup function (`cleanup_old_data()`) auto-abandons stale sessions (>24h idle) and deletes closed sessions older than 7 days. Call it from `/admin/cleanup` via any cron service hitting once an hour.

## The Vinitt DNA (the actual magic)

The writer's system prompt + two-shot exemplars live in `src/prompts/scriptDna.js`. This file is the most important artefact in the repo — it encodes the 7-block structure, pacing cues, 50/50 Hinglish rule, "lines that travel" requirement, and the Celebrity Blueprint brand term. The few-shots are full Gambhir + Clip-on scripts from Vinitt's own approved outputs; rules alone don't reproduce the voice — exemplars do. **Do not delete them.**

When Vinitt's voice drifts (he changes hook style, drops a new brand term, etc.), update this file. Nothing else should need touching.

## WAHA notes

- The webhook handler returns `200` immediately and processes asynchronously; WAHA times out otherwise.
- HMAC validation is supported — set `WAHA_WEBHOOK_HMAC_SECRET` and configure the same in WAHA.
- Media is fetched via `payload.media.url` with `X-Api-Key` if the URL is on the WAHA host. Max 50 MB.
- `startTyping`/`stopTyping` keeps Vinitt visually informed during the 5–10s transcription + generation window.

## Cost per script (rough)

| Component | Per new script | Per edit |
|---|---|---|
| Groq Whisper (1-2 min voice note) | < $0.001 | < $0.001 |
| Haiku intent classifier | < $0.0005 | < $0.0005 |
| Sonnet writer (two-pass for new, single for edits) | ~$0.06 | ~$0.03 |
| Supabase | free tier | free tier |
| **Total** | **~6¢** | **~3¢** |

The doubled cost on `new` is the audit pass — non-negotiable per Vinitt's instructions ("never one-shot, always audit to 10/10"). Vinitt's 4 hours/week saved at his hourly rate makes this trivially worth it.

## Hardening checklist

Already in place:

- [x] Webhook HMAC validation (opt-in).
- [x] Idempotency on `payload.id` to prevent double-processing on WAHA retries.
- [x] Allowlist of phone numbers (`ALLOWED_PHONES`) — no one else can use the bot.
- [x] Async processing with immediate 200 ack.
- [x] Graceful shutdown (SIGTERM/SIGINT).
- [x] Structured logging (pino).
- [x] Error replies sent back to user on failure.
- [x] Session TTL auto-abandon.
- [x] Anthropic + Groq SDK built-in retries.

Worth adding when scaling:

- [ ] Per-phone rate limit (not needed for a single-user bot).
- [ ] Background job queue (BullMQ) if processing time grows.
- [ ] Sentry / error monitoring webhook.
