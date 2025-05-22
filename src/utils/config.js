import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // Ollama configuration
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    defaultModel: process.env.DEFAULT_MODEL || 'gemma3:1b',
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  }
}; 