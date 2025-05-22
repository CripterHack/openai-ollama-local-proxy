import axios from 'axios';
import { transformOpenAIRequestToOllama, transformOllamaResponseToOpenAI } from '../utils/transformers.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

// Base URL for Ollama API - explicitly use IPv4
const OLLAMA_BASE_URL = config.ollama.baseUrl;
const DEFAULT_MODEL = config.ollama.defaultModel;

// OpenAI model name mapping to Ollama models
// NOTE: This mapping is static and uses the value of DEFAULT_MODEL at module load time.
// If DEFAULT_MODEL changes at runtime, this mapping will NOT update automatically.
// To update mapping dynamically, refactor to use a function or re-generate mapping as needed.
const MODEL_MAPPING = {
  'gpt-3.5-turbo': DEFAULT_MODEL,
  'gpt-4': DEFAULT_MODEL,
  'gpt-4-turbo': DEFAULT_MODEL,
  'gpt-4.1': DEFAULT_MODEL,
  'gpt-4.1-mini': DEFAULT_MODEL,
  'gpt-4-vision': DEFAULT_MODEL,
  'o1': DEFAULT_MODEL,
  'o1-mini': DEFAULT_MODEL,
  'o1-preview': DEFAULT_MODEL,
  'claude-3': DEFAULT_MODEL,
  'claude-3-sonnet': DEFAULT_MODEL,
  'claude-3-opus': DEFAULT_MODEL,
  'claude-3-haiku': DEFAULT_MODEL,
};

// Create axios instance with explicit IPv4 configuration
const ollamaAxios = axios.create({
  baseURL: OLLAMA_BASE_URL,
  family: 4 // Force IPv4
});

/**
 * Forwards chat completion requests from OpenAI format to Ollama
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {Object} [axiosInstance] - Optional axios instance for dependency injection (for testing)
 */
export async function forwardChatCompletionRequest(req, res, next, axiosInstance = ollamaAxios) {
  try {
    // Validate request
    if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "Missing required 'messages' parameter",
          type: 'invalid_request_error',
          code: 'invalid_parameters'
        }
      });
    }

    // Get requested model or use default
    let requestedModel = req.body.model || DEFAULT_MODEL;
    
    // Check if it's an OpenAI model name and map to Ollama model
    if (MODEL_MAPPING[requestedModel]) {
      logger.info(`Mapping OpenAI model '${requestedModel}' to Ollama model '${MODEL_MAPPING[requestedModel]}'`);
      requestedModel = MODEL_MAPPING[requestedModel];
    }
    
    // Get available models from Ollama
    try {
      const modelList = await axiosInstance.get('/api/tags');
      const availableModels = modelList.data.models.map(model => model.name);
      
      // Check if requested model exists in Ollama
      if (!availableModels.includes(requestedModel)) {
        logger.warn(`Requested model '${requestedModel}' not found. Available models: ${availableModels.join(', ')}`);
        logger.warn(`Falling back to default model: ${DEFAULT_MODEL}`);
        requestedModel = DEFAULT_MODEL;
      }
    } catch (error) {
      // If fetching model list fails, log and fallback to default model
      logger.warn('Could not fetch model list from Ollama, using default model as fallback: ' + error.message);
      requestedModel = DEFAULT_MODEL;
    }
    
    // Transform OpenAI request format to Ollama format
    const ollamaRequest = transformOpenAIRequestToOllama(req.body, requestedModel);
    
    // Log request details
    logger.info(`Forwarding request to Ollama for model: ${requestedModel}`);
    
    // Forward request to Ollama API with explicit IPv4 address
    const response = await axiosInstance.post('/api/generate', ollamaRequest);
    
    // Transform Ollama response to OpenAI format
    const openAIResponse = transformOllamaResponseToOpenAI(response.data, requestedModel, req.body);
    
    // Send response back to client
    res.status(200).json(openAIResponse);
  } catch (error) {
    logger.error('Error forwarding request to Ollama: ' + error.message);
    logger.error('Error object for diagnostics: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // --- Error Handling Policy ---
    // 1. If error is from Ollama API (i.e., axios error with response), respond with 500 and formatted error
    // 2. If error is a network or unexpected error, call next(error) to propagate to Express error middleware
    if (error.response && error.response.data) {
      // Ollama API returned an error (e.g., model not found, internal error)
      return res.status(error.response.status || 500).json({
        error: {
          message: `Ollama API error: ${error.response.data.error || error.message}`,
          type: 'api_error',
          code: 'ollama_error'
        }
      });
    }
    // Network error or unexpected error
    return next(error);
  }
} 