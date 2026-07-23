'use strict';

require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.string().default('info'),

  OPENAI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),

  WRITER_MODEL: z.string().default('openai/gpt-4o'),
  INTENT_MODEL: z.string().default('openai/gpt-4o-mini'),

  SESSION_TTL_HOURS: z.coerce.number().default(12),
  SESSION_WINDOW_SIZE: z.coerce.number().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

module.exports = parsed.data;
