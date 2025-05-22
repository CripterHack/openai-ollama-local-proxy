import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { chatCompletionsRouter } from './routes/chatCompletions.js';
import { config } from './utils/config.js';
import https from 'https';
import fs from 'fs';
import { logger } from './utils/logger.js';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// OpenAI API compatible routes
app.use('/v1/chat/completions', chatCompletionsRouter);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Invalid URL path: ${req.path}`,
      type: 'invalid_request_error',
      code: 'path_not_found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.type || 'server_error',
      code: err.code || 'internal_error'
    }
  });
});

// Start HTTP server on normal port
app.listen(PORT, () => {
  logger.info(`HTTP server running on port ${PORT}`);
});

// Start HTTP server on port 80 (requires sudo)
try {
  app.listen(80, () => {
    logger.info('HTTP server running on port 80');
  });
} catch (err) {
  logger.warn('Could not start HTTP server on port 80. Try running with sudo: ' + err.message);
}

let options = {};
try {
  options.key = fs.readFileSync('server.key');
  options.cert = fs.readFileSync('server.crt');
} catch (err) {
  logger.warn('SSL certificate files not found or unreadable. HTTPS server will not start: ' + err.message);
}

// Start HTTPS server on port 443 (requires sudo)
if (options.key && options.cert) {
  try {
    https.createServer(options, app).listen(443, () => {
      logger.info('HTTPS server running on port 443');
    });
  } catch (err) {
    logger.warn('Could not start HTTPS server on port 443. Try running with sudo: ' + err.message);
  }
} 