# Changelog

This document tracks all the changes, features added, and work done on this project over time. 

## [2026-07-23]
- Investigated project hosting status.
- Created `memory/` folder to persist project history, changelog, and rejected ideas.
- Added `.gitignore` to prepare the project for version control.
- Initialized a Git repository to maintain a full, trackable history of the codebase.

## [2026-07-28]
- Evaluated and validated user's NotebookLM deep-structure extraction of "How to Create Irresistible Hooks" (Curiosity Loop & 3-step formula).
- Upgraded `scriptDna.js` system prompt with:
  - **The Curiosity Loop & Viral Hook Formula** (replacing standalone First Word Rule).
  - **The 3-Step Snapback Formula**: Context Lean-In → Scroll Stop Stun Gun → Contrarian Snapback.
  - **Staccato Delivery & Speed-to-Value**: Max 5-7 words per opening sentence, value delivered under 4 seconds.
- Added anti-patterns to `# WHAT YOU NEVER DO`: The Fraud Trap and Rhythmic Monotony.
- Upgraded `AUDIT_PROMPT` checks 1 and 7 to enforce 3-step formula, staccato voiceover, and speed-to-value during 2nd-pass 10/10 script audits.
- Upgraded `/api/hooks` endpoint in `server.js` to enforce the 3-Step Snapback Formula, Staccato delivery (<5-7 words), and Speed-to-Value (<4s) during Stage 2 hook generation. Both script drafting and alternative hook generation are now 100% synchronized.
- Built **The Consultation Hook Engine** (separate skill set for unscripted docu-style consultation reels):
  - Created [consultationHookDna.js](file:///d:/Project/ContentFactory/consultationHookDna.js) encoding Sir's 6 approved consultation hook buckets (Unexpected Question, Confession, Contradiction, Social Pressure, Identity, Pattern Interrupt), Netflix mini-doc formatting, and banned salon questions.
  - Added dedicated endpoint `POST /api/consultation-hooks` in [server.js](file:///d:/Project/ContentFactory/server.js).
  - Updated UI in [App.jsx](file:///d:/Project/ContentFactory/frontend/src/App.jsx) with dedicated **🎥 Consultation Hooks** buttons alongside standard **✨ Reel Hooks** buttons.
- Upgraded **Script Writing Engine to Support Dual-Mode Script Generation**:
  - Added `CONSULTATION_SCRIPT_SYSTEM_PROMPT` and `CONSULTATION_SCRIPT_AUDIT_PROMPT` in [consultationHookDna.js](file:///d:/Project/ContentFactory/consultationHookDna.js).
  - Updated [writer.js](file:///d:/Project/ContentFactory/writer.js) and [server.js](file:///d:/Project/ContentFactory/server.js) to accept `formatMode` (`'reel'` vs `'consultation'`). In consultation mode, the two-pass writer drafts and audits a 7-Part Netflix-style Reality Mini-Documentary (Cold Open, Pattern Interrupt, The Story, Diagnosis, The Build, The Reveal, Reflection).
  - Added **🎬 Video Script & Hook Mode** dropdown selector in the frontend ([App.jsx](file:///d:/Project/ContentFactory/frontend/src/App.jsx)) allowing instant switching between Informational Reels and Consultation Mini-Docs before script generation.
