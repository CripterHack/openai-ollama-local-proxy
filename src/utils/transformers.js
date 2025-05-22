/**
 * WARNING: The prompt format used here (with [INST] ... [/INST]) is model-specific (e.g., Llama) and may not be appropriate for all models. If supporting multiple model families, refactor to make prompt construction model-aware.
 * 
 * Transforms an OpenAI chat completion request to Ollama format
 * 
 * @param {Object} openAIRequest - OpenAI API request body
 * @param {string} model - Model name to use
 * @returns {Object} Ollama API compatible request
 */
export function transformOpenAIRequestToOllama(openAIRequest, model) {
  // Extract messages and format them for Ollama
  const messages = openAIRequest.messages || [];
  
  // Construct the prompt string from messages
  let prompt = '';
  
  // Handle system message if present
  const systemMessage = messages.find(msg => msg.role === 'system');
  const systemContent = systemMessage ? systemMessage.content : '';
  
  // Construct conversation history
  for (const message of messages) {
    if (message.role === 'system') continue; // Skip system message as it's handled separately
    
    if (message.role === 'user') {
      prompt += `[INST] ${message.content} [/INST]\n`;
    } else if (message.role === 'assistant') {
      prompt += `${message.content}\n`;
    }
  }
  
  // Construct Ollama request
  const ollamaRequest = {
    model: model,
    prompt: prompt.trim(),
    stream: Boolean(openAIRequest.stream),
    options: {
      temperature: openAIRequest.temperature !== undefined ? openAIRequest.temperature : 0.7,
      top_p: openAIRequest.top_p !== undefined ? openAIRequest.top_p : 1.0,
      max_tokens: openAIRequest.max_tokens || 2048,
    }
  };
  
  // Add system prompt if present
  if (systemContent) {
    ollamaRequest.system = systemContent;
  }
  
  return ollamaRequest;
}

/**
 * Transforms an Ollama response to OpenAI chat completion format
 * 
 * @param {Object} ollamaResponse - Ollama API response
 * @param {string} model - Model name that was used
 * @param {Object} originalRequest - Original OpenAI request for reference
 * @returns {Object} OpenAI API compatible response
 */
export function transformOllamaResponseToOpenAI(ollamaResponse, model, originalRequest) {
  // Create timestamp for response
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Calculate token usage (approximate)
  // Note: This is a simple approximation, actual token count would require tokenization
  const promptTokens = estimateTokenCount(JSON.stringify(originalRequest.messages));
  const completionTokens = estimateTokenCount(ollamaResponse.response);
  const totalTokens = promptTokens + completionTokens;
  
  // Construct OpenAI compatible response
  return {
    id: `chatcmpl-${generateRandomId()}`,
    object: 'chat.completion',
    created: timestamp,
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: ollamaResponse.response
        },
        finish_reason: ollamaResponse.done ? 'stop' : 'length'
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens
    }
  };
}

/**
 * Generate a random ID for the OpenAI response
 * 
 * @returns {string} Random ID
 */
function generateRandomId() {
  return Math.random().toString(36).substring(2, 12);
}

/**
 * Estimate token count from text (very rough approximation)
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
  // Rough approximation: 1 token is about 4 characters for English text
  return Math.ceil(text.length / 4);
} 