'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { transcribe } = require('./transcription');
const { writeNewScript, editScript } = require('./writer');
const { SYSTEM_PROMPT } = require('./scriptDna');
const config = require('./config');
const logger = require('./logger');
const { OpenAI } = require('openai');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
});

// ─── Google Sheets DB Init ───────────────────────────────────────────────────
let doc = null;

async function initSheet() {
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    logger.warn("Google Sheet credentials missing. Skipping DB sync.");
    return;
  }
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Database', headerValues: ['Key', 'Data'] });
    } else {
      try { await sheet.setHeaderRow(['Key', 'Data']); } catch(e) {}
    }
    logger.info("Connected to Google Sheets Database");
  } catch (e) {
    logger.error({ err: e }, "Failed to init Google Sheets Database");
  }
}
initSheet();

// ─── DB Endpoints ────────────────────────────────────────────────────────────
app.get('/api/db/load', async (req, res) => {
  if (!doc) return res.json({ topics: [], targetAudiences: [], creatorReferences: [], sirStyleGuide: '', activeCreatorId: null, activeAudienceId: null, hookLibrary: [] });
  try {
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const data = {};
    rows.forEach(r => {
      try {
        data[r.get('Key')] = JSON.parse(r.get('Data'));
      } catch (e) {
        data[r.get('Key')] = r.get('Data');
      }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/db/save', async (req, res) => {
  if (!doc) return res.json({ success: true, warning: "No DB connection" });
  try {
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const payload = req.body;

    for (const [key, value] of Object.entries(payload)) {
      const stringifiedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const existingRow = rows.find(r => r.get('Key') === key);
      if (existingRow) {
        existingRow.set('Data', stringifiedValue);
        await existingRow.save();
      } else {
        await sheet.addRow({ Key: key, Data: stringifiedValue });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// ─── Generate Angles for a Topic ───────────────────────────────────────────────
app.post('/api/angles', async (req, res) => {
  try {
    const { topic, targetAudience } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    let prompt = `You are an elite content strategist for American Hairline (AHL).
The writer has selected the following topic for an Instagram Reel:
"${topic}"

Generate exactly 5 distinct, high-engagement angles/hooks for this topic.
${targetAudience ? `IMPORTANT: Tailor these angles specifically for this target audience: ${targetAudience}` : ''}

Each angle should be 1-2 sentences summarizing the approach (e.g. "The Myth Buster: Start by debunking...").
Return ONLY a valid JSON array of 5 strings. No markdown, no extra text.
["angle 1", "angle 2", "angle 3", "angle 4", "angle 5"]`;

    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    let text = (resp.choices[0]?.message?.content || '[]').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let angles = [];
    try {
      angles = JSON.parse(text);
    } catch (e) {
      angles = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 5);
    }

    res.json({ angles: angles.slice(0, 5) });
  } catch (err) {
    logger.error({ err: err.message }, 'angles error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate Hooks for a Script ───────────────────────────────────────────────
app.post('/api/hooks', async (req, res) => {
  try {
    const { script, hookLibrary } = req.body;
    if (!script) return res.status(400).json({ error: 'script is required' });

    const libraryText = hookLibrary && hookLibrary.length > 0
      ? `Use these specific hook templates from our Hook Library:\n${hookLibrary.map(h => `- [${h.type}] ${h.name}: ${h.notes}`).join('\n')}`
      : 'Draw inspiration for Visual, Action, and Text hooks based on standard viral content strategies.';

    let prompt = `You are an elite content strategist for American Hairline (AHL).
The writer has finalized the following script for an Instagram Reel:

--- SCRIPT START ---
${script}
--- SCRIPT END ---

Your job is to generate exactly 6 varied hook options for the very beginning of this script. 
You MUST provide exactly this breakdown:
- 3 Verbal Hooks (What the person says directly to camera)
- 1 Visual Hook (A striking visual element or prop)
- 1 Action Hook (A specific action or movement)
- 1 Text-on-Screen Hook (A compelling text overlay)

${libraryText}

Return ONLY a valid JSON array of 6 strings. No markdown, no extra text.
Each string should briefly describe the hook category, action, and what is said/shown (e.g. "[Visual Hook] User applies the patch while saying 'I wish I knew this sooner...'").
["hook 1", "hook 2", "hook 3", "hook 4", "hook 5", "hook 6"]`;

    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    let text = (resp.choices[0]?.message?.content || '[]').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let hooks = [];
    try {
      hooks = JSON.parse(text);
    } catch (e) {
      hooks = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 5);
    }

    res.json({ hooks: hooks.slice(0, 6) });
  } catch (err) {
    logger.error({ err: err.message }, 'hooks error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate 10 daily ideas ─────────────────────────────────────────────────
app.post('/api/ideas', async (req, res) => {
  try {
    const prompt = `You are an elite content strategist for American Hairline (AHL), a premium hair replacement clinic in India.

Generate exactly 10 highly engaging, controversial, or educational short-form video (Instagram Reel) topic ideas. Target people who are actively considering a hair transplant or a hair system (clip-on, permanent extensions, wig) — NOT general audiences.

Return ONLY a valid JSON array of 10 strings. No markdown, no extra text, no numbers:
["idea 1", "idea 2", "idea 3", "idea 4", "idea 5", "idea 6", "idea 7", "idea 8", "idea 9", "idea 10"]`;

    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
    });

    let text = (resp.choices[0]?.message?.content || '[]').trim();
    // Strip any markdown fences the model may add
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let ideas = [];
    try {
      const parsed = JSON.parse(text);
      // Handle both ["a","b"] and {"ideas": ["a","b"]}
      ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || Object.values(parsed)[0] || []);
    } catch (e) {
      // Fallback: split numbered lines like "1. Some idea"
      ideas = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 5);
    }

    res.json({ ideas });
  } catch (err) {
    logger.error({ err: err.message }, 'ideas error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Chat with AI (topic brainstorming) ──────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const systemPrompt = {
      role: 'system',
      content: `You are a friendly but expert viral content strategist for American Hairline (AHL).
You help content writers brainstorm and refine reel topics. Here is the full brand DNA to guide you:

---
${SYSTEM_PROMPT}
---

Rules for you:
- Be concise and conversational (3-5 sentences max per reply).
- Ask one focused question at a time to help the writer sharpen the angle.
- Always think about MOFU/BOFU audiences — people already considering a hair solution.
- When the writer seems happy, suggest a final structured brief they can share with 'Sir' (Vinitt).`,
    };

    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
    });

    res.json({ reply: resp.choices[0]?.message?.content || '' });
  } catch (err) {
    logger.error({ err: err.message }, 'chat error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Transcribe audio ─────────────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
  try {
    const result = await transcribe(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'transcription error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate final script ────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    const { topic, context, transcript, sirStyleGuide, creatorInspiration, targetAudience } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    let brief = `TOPIC: ${topic}\n`;
    if (targetAudience) brief += `\nTARGET AUDIENCE (Tailor the hook, angle, and language specifically to this demographic):\n${targetAudience}\n\n`;
    if (sirStyleGuide) brief += `\nSIR'S LEARNED STYLE GUIDE (apply these preferences — they override defaults):\n${sirStyleGuide}\n\n`;
    if (creatorInspiration) brief += `\nCREATOR INSPIRATION (Optional technique hints for pacing/structure. Do NOT override foundation rules or Sir's style guide):\n${creatorInspiration}\n\n`;
    if (context) brief += `CONTEXT FROM CONTENT TEAM DISCUSSION:\n${context}\n\n`;
    if (transcript) brief += `RAW VOICE-NOTE FROM VINITT (Sir's direction):\n"""\n${transcript}\n"""`;

    const script = await writeNewScript({ brief });
    res.json({ script });
  } catch (err) {
    logger.error({ err: err.message }, 'generate error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Incremental Style Guide Learning ────────────────────────────────────────
// Called after every Sir feedback. Reads the current guide, checks if the new
// feedback adds a NEW insight, and only adds it if it's genuinely new.
app.post('/api/learn', async (req, res) => {
  try {
    const { currentStyleGuide, sirFeedback, scriptBefore, topic } = req.body;
    if (!sirFeedback) return res.status(400).json({ error: 'sirFeedback required' });

    const prompt = `You are maintaining a "Sir's Style Guide" — a living document that captures the content preferences of Vinitt (Sir), director of American Hairline.

CURRENT STYLE GUIDE:
${currentStyleGuide ? currentStyleGuide : '(Empty — no rules learned yet.)'}

NEW FEEDBACK FROM SIR:
Topic: "${topic || 'unknown'}"
Script he reviewed:
"""
${(scriptBefore || '').slice(0, 1500)}
"""
His feedback / instruction:
"""
${sirFeedback}
"""

YOUR TASK:
1. Understand what this feedback reveals about Sir's preferences or taste
2. Check if this insight is ALREADY captured in the current style guide (even in different words)
3. If already captured → return isNewRule: false and the guide unchanged
4. If it is genuinely new → add it as a specific, actionable point under the correct category

CATEGORY STRUCTURE (use these, add new ones if needed):
- HOOKS: rules about how scripts should open
- CTAs: call-to-action preferences
- LANGUAGE: Hindi/English/Hinglish preferences
- TONE & DELIVERY: how aggressive, warm, cold, direct he wants the voice
- STRUCTURE: pacing, block order, pauses, cuts
- CONTENT RULES: what topics/angles he approves or rejects
- AVOID: things he has explicitly rejected

When adding a point, write it like: "• [Specific rule]. Context: [what triggered this — topic/situation]"

Return ONLY this JSON (no markdown):
{
  "isNewRule": true or false,
  "updatedGuide": "the full updated style guide text",
  "newPoint": "the exact sentence added (only if isNewRule is true, else null)"
}`;

    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    let text = (resp.choices[0]?.message?.content || '{}').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      // If parsing fails, return guide unchanged
      result = { isNewRule: false, updatedGuide: currentStyleGuide || '', newPoint: null };
    }

    res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'learn error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Revise existing script with Sir's new feedback ───────────────────────────
// Accepts: { currentScript, sirFeedback, previousRevisions[] }
// Uses the existing editScript() single-pass writer — best for iterations.
app.post('/api/revise', async (req, res) => {
  try {
    const { currentScript, sirFeedback, previousRevisions, sirStyleGuide, creatorInspiration, targetAudience } = req.body;
    if (!currentScript) return res.status(400).json({ error: 'currentScript required' });
    if (!sirFeedback)   return res.status(400).json({ error: 'sirFeedback required' });

    const historyTurns = [
      { role: 'assistant', content: currentScript },
      ...(previousRevisions || []).flatMap(rev => [
        { role: 'assistant', content: rev.script },
        { role: 'user',      content: `Sir's feedback on that version: ${rev.feedback}` },
      ]),
    ];

    // Prepend target audience, style guide and creator inspiration
    const instructionParts = [];
    if (targetAudience) instructionParts.push(`TARGET AUDIENCE (tailor language/angle):\n${targetAudience}`);
    if (sirStyleGuide) instructionParts.push(`SIR'S STYLE GUIDE (apply these):\n${sirStyleGuide}`);
    if (creatorInspiration) instructionParts.push(`CREATOR INSPIRATION (optional pacing/structure hints):\n${creatorInspiration}`);
    instructionParts.push(`Sir's specific note on this draft:\n${sirFeedback}`);
    
    const instruction = instructionParts.join('\n\n');

    const revised = await editScript({ historyTurns, instruction });
    res.json({ script: revised });
  } catch (err) {
    logger.error({ err: err.message }, 'revise error');
    res.status(500).json({ error: err.message });
  }
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error({ err: err.stack || err.message }, 'unhandled express error');
  res.status(500).json({ error: 'internal server error' });
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'script-skill up');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

