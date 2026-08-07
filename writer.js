'use strict';

const OpenAI = require('openai');
const config = require('./config');
const logger = require('./logger');
const { SYSTEM_PROMPT, AUDIT_PROMPT, FEW_SHOTS } = require('./scriptDna');
const { CONSULTATION_SCRIPT_SYSTEM_PROMPT, CONSULTATION_SCRIPT_AUDIT_PROMPT } = require('./consultationHookDna');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
});

/**
 * Two-pass writing for new scripts:
 *   Pass 1: draft from brief.
 *   Pass 2: audit + rewrite to 10/10.
 *
 * Mirrors Vinitt's own workflow ("never one-shot — audit, make it 10/10").
 * Single-pass would routinely ship 6-7/10 drafts.
 */
async function writeNewScript({ brief, videoFormat = null, brandVoice = null }) {
  const briefMessage = { role: 'user', content: formatBrief(brief) };
  const baseType = videoFormat?.baseType || 'reel';
  const initialShots = baseType === 'consultation' ? [] : FEW_SHOTS;
  const auditPrompt = baseType === 'consultation' ? CONSULTATION_SCRIPT_AUDIT_PROMPT : AUDIT_PROMPT;

  // Pass 1: draft.
  const draft = await runWriter({
    messages: [...initialShots, briefMessage],
    mode: 'new-draft',
    videoFormat,
    brandVoice,
  });

  // Pass 2: audit + rewrite.
  const final = await runWriter({
    messages: [
      ...initialShots,
      briefMessage,
      { role: 'assistant', content: draft },
      { role: 'user', content: auditPrompt },
    ],
    mode: 'new-audit',
    videoFormat,
    brandVoice,
  });

  return final;
}

/**
 * Edits are single-pass. The user is iterating — auto-audit would
 * override their direction.
 */
async function editScript({ historyTurns, instruction, videoFormat = null, brandVoice = null }) {
  const realTurns = historyTurns
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: m.role === 'user' ? formatBrief(m.content) : m.content,
    }));
  const baseType = videoFormat?.baseType || 'reel';
  const initialShots = baseType === 'consultation' ? [] : FEW_SHOTS;

  const messages = [
    ...initialShots,
    ...realTurns,
    { role: 'user', content: formatEditInstruction(instruction) },
  ];
  return runWriter({ messages, mode: 'edit', videoFormat, brandVoice });
}

async function runWriter({ messages, mode, videoFormat = null, brandVoice = null }) {
  const t0 = Date.now();
  const baseType = videoFormat?.baseType || 'reel';
  let sysPrompt = baseType === 'consultation' ? CONSULTATION_SCRIPT_SYSTEM_PROMPT : SYSTEM_PROMPT;

  // Dynamically replace hardcoded AHL with brandVoice name if provided
  if (brandVoice) {
    sysPrompt = sysPrompt.replace(/American Hairline \(AHL\)/g, brandVoice.name);
    sysPrompt = sysPrompt.replace(/American Hairline/g, brandVoice.name);
    sysPrompt = sysPrompt.replace(/AHL/g, brandVoice.name);
    
    // Also append the brand rules at the end of the system prompt
    sysPrompt += `\n\n# BRAND IDENTITY & RULES (MANDATORY)\nName: ${brandVoice.name}\nTone: ${brandVoice.tone}\nRules: ${brandVoice.rules}\n`;
  }
  
  // Inject the specific video format rules
  if (videoFormat && videoFormat.rules) {
    sysPrompt += `\n\n# VIDEO FORMAT RULES: ${videoFormat.name}\n${videoFormat.rules}\n`;
  }
  const resp = await openai.chat.completions.create({
    model: config.WRITER_MODEL,
    max_tokens: 4096,
    temperature: mode === 'new-audit' ? 0.5 : 0.7,
    messages: [
      { role: 'system', content: sysPrompt },
      ...messages,
    ],
  });
  const text = resp.choices[0]?.message?.content?.trim() || '';

  logger.info(
    {
      mode,
      ms: Date.now() - t0,
      in_tokens: resp.usage?.input_tokens,
      out_tokens: resp.usage?.output_tokens,
    },
    'writer done'
  );

  return text;
}

function formatBrief(brief) {
  const trimmed = String(brief || '').trim();
  // If the brief already arrives in our structured TOPIC/CONTEXT format,
  // pass it through untouched.
  if (/^TOPIC\s*:/i.test(trimmed) || /CONTEXT FROM VINITT/i.test(trimmed)) {
    return trimmed;
  }
  // Otherwise it's a raw voice-note transcript / loose text. Wrap it with
  // explicit instruction so the model knows to infer language mode,
  // category, and CTA from the content.
  return `RAW VOICE-NOTE TRANSCRIPT FROM VINITT:

"""
${trimmed}
"""

Build a complete reel script from this. Apply your full structure, language rules, and pacing cues.

Inference rules when fields are unstated:
- LANGUAGE: default \`hinglish\` unless the voice note clearly leans into one language ("I want this fully in Hindi" → \`hindi\`; English-only delivery → \`english\`).
- CATEGORY: infer from content — transplant / toppers / permanent_extensions / wig. If genuinely ambiguous, default \`transplant\`.
- BRAND: default \`ahl\`.
- CTA: pick share-based if the topic is awareness-driven (celebrity, callout, education), comment-based if it's a soft conversion (introducing a solution AHL offers).

Pick the strongest hook angle from the content. Obey the First Word Rule strictly. Output the script only.`;
}

function formatEditInstruction(instruction) {
  return `Vinitt's note on the current draft:

"""
${String(instruction || '').trim()}
"""

Apply this change to the most recent draft and output the FULL updated script (not a diff). Keep the structure, language balance, and pacing rules intact. Re-check the First Word Rule and Hemingway test on the updated version. Output the script only.`;
}

module.exports = { writeNewScript, editScript };
