'use strict';

require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.string().default('info'),

  OPENAI_API_KEY: z.string().default(''),
  OPENROUTER_API_KEY: z.string().default(''),

  WRITER_MODEL: z.string().default('openai/gpt-4o'),
  INTENT_MODEL: z.string().default('openai/gpt-4o-mini'),

  SESSION_TTL_HOURS: z.coerce.number().default(12),
  SESSION_WINDOW_SIZE: z.coerce.number().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
}

module.exports = parsed.success ? parsed.data : {
  PORT: 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  LOG_LEVEL: 'info',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  WRITER_MODEL: 'openai/gpt-4o',
  INTENT_MODEL: 'openai/gpt-4o-mini',
  SESSION_TTL_HOURS: 12,
  SESSION_WINDOW_SIZE: 20,
};
