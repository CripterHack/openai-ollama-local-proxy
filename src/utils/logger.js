import { config } from './config.js';

const levels = ['error', 'warn', 'info'];
const currentLevel = levels.indexOf((config.logging.level || 'info').toLowerCase());

/* eslint-disable no-console */
export const logger = {
  info: (...args) => {
    if (currentLevel >= 2) console.info('[INFO]', ...args);
  },
  warn: (...args) => {
    if (currentLevel >= 1) console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    if (currentLevel >= 0) console.error('[ERROR]', ...args);
  },
};
