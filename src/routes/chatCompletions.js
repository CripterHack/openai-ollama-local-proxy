import express from 'express';
import { forwardChatCompletionRequest } from '../controllers/chatCompletions.js';

// Factory function for router with optional axios instance
function createChatCompletionsRouter(axiosInstance) {
  const router = express.Router();
  // Dependency-injected handler
  router.post('/', (req, res, next) => forwardChatCompletionRequest(req, res, next, axiosInstance));
  return router;
}

// Default router for production (uses default axios instance)
const chatCompletionsRouter = createChatCompletionsRouter();

export { chatCompletionsRouter, createChatCompletionsRouter }; 