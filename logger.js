'use strict';

const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'script-skill' },
  ...(config.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
      }
    : {}),
});

module.exports = logger;
