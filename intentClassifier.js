'use strict';

/**
 * Intent router. Classifies an incoming message into one of:
 *   - "new"     : a fresh topic / brief; wipe active session and start over.
 *   - "edit"    : refine the current draft; keep session context.
 *   - "approve" : the latest draft is final; archive it and close session.
 *   - "reset"   : explicit hard reset, no archive.
 *
 * Returns strict JSON. Anthropic Haiku follows this reliably.
 */

const SYSTEM_PROMPT = `You are an intent classifier for a WhatsApp scriptwriting assistant. Read the recent conversation and the new message, then output ONLY a JSON object — no prose, no markdown — of the form:

{"intent": "new" | "edit" | "approve" | "reset", "topic": "<short label or null>"}

Rules:

- "approve" — user is signing off on the current draft. Triggers: "approved", "approve", "final", "done", "ship it", "👍", "perfect", "lock it", "save this".
- "reset" — user explicitly wants to throw away the current context without saving. Triggers: "reset", "new chat", "start over", "wipe", "forget previous", "clear".
- "edit" — user is refining, criticising, or changing something about the draft just generated. Triggers: "make the hook punchier", "this is too long", "change the CTA", "more hindi", "I don't like the close", "shorter", "review it again".
- "new" — user is introducing a different topic from the active session, OR the session has no prior assistant draft, OR the message reads like a fresh brief (a topic, a celebrity name, a voice-note transcript describing a new case study).

Tie-breakers:
- If there is NO prior assistant draft in the conversation, intent is ALWAYS "new".
- A long message containing a new celebrity/case/topic is "new" even if it doesn't start with explicit words like "new topic".
- A short message that references the existing draft ("make it 50/50", "hook is weak", "redo it") is "edit".

"topic" should be a 2-5 word label for the new script (only when intent is "new"); otherwise null.`;

function buildUserPrompt(historyTurns, newMessage) {
  const history =
    historyTurns.length === 0
      ? '(no prior conversation)'
      : historyTurns
          .map(
            (m) =>
              `[${m.role}${m.kind && m.kind !== 'text' ? ':' + m.kind : ''}] ${truncate(
                m.content,
                400
              )}`
          )
          .join('\n');

  return `Recent conversation:
${history}

New message from user:
${truncate(newMessage, 2000)}

Output the JSON only.`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt };
