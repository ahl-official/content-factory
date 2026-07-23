'use strict';

const OpenAI = require('openai');
const config = require('./config');
const logger = require('./logger');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./intentClassifier');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
});

const VALID_INTENTS = new Set(['new', 'edit', 'approve', 'reset']);

/**
 * Returns { intent, topic }. Falls back to "new" if anything goes wrong —
 * "new" is safer than "edit" because it never corrupts an existing draft.
 */
async function classifyIntent({ historyTurns, newMessage, hasPriorDraft }) {
  // Fast-path: no prior assistant draft means it can only be "new" or "reset".
  // Reset is uncommon and the user will say it explicitly; default to new.
  if (!hasPriorDraft) {
    return { intent: 'new', topic: null };
  }

  try {
    const resp = await openai.chat.completions.create({
      model: config.INTENT_MODEL,
      max_tokens: 80,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(historyTurns, newMessage) },
      ],
    });

    const raw = resp.choices[0]?.message?.content?.trim() || '';

    const parsed = safeParseJson(raw);
    if (!parsed || !VALID_INTENTS.has(parsed.intent)) {
      logger.warn({ raw }, 'intent classifier returned unparseable output');
      return { intent: 'new', topic: null };
    }
    return { intent: parsed.intent, topic: parsed.topic || null };
  } catch (err) {
    logger.error({ err: err.message }, 'intent classifier call failed');
    return { intent: 'new', topic: null };
  }
}

function safeParseJson(s) {
  // Handle a leading ```json fence if the model adds one.
  const cleaned = s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

module.exports = { classifyIntent };
