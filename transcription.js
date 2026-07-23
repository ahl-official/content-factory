'use strict';

const OpenAI = require('openai');
const { toFile } = require('openai');
const config = require('./config');
const logger = require('./logger');

// Use the official OpenAI API for Whisper transcription.
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

function extFromMime(mime) {
  if (!mime) return 'ogg';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('webm')) return 'webm';
  return 'ogg';
}

/**
 * Transcribe a voice note Buffer to text.
 * Returns: { text, language }
 */
async function transcribe(buffer, mimetype) {
  const ext = extFromMime(mimetype);
  const file = await toFile(buffer, `voice.${ext}`, { type: mimetype });

  const t0 = Date.now();
  const resp = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    temperature: 0,
    // No language hint — Vinitt switches mid-thought, let the model detect.
  });
  logger.info(
    { ms: Date.now() - t0, lang: resp.language, len: resp.text?.length },
    'transcription done'
  );

  return { text: resp.text.trim(), language: resp.language };
}

module.exports = { transcribe };
