import { transformOpenAIRequestToOllama, transformOllamaResponseToOpenAI } from './transformers.js';

describe('transformOpenAIRequestToOllama', () => {
  it('should transform a basic OpenAI request to Ollama format', () => {
    const openAIRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ],
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 100,
      stream: true
    };
    const model = 'llama3:instruct';
    const ollamaReq = transformOpenAIRequestToOllama(openAIRequest, model);
    expect(ollamaReq).toEqual({
      model: 'llama3:instruct',
      prompt: '[INST] Hello! [/INST]',
      stream: true,
      options: {
        temperature: 0.5,
        top_p: 0.9,
        max_tokens: 100
      },
      system: 'You are a helpful assistant.'
    });
  });

  it('should handle missing optional fields and no system message', () => {
    const openAIRequest = {
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello there!' }
      ]
    };
    const model = 'llama3:instruct';
    const ollamaReq = transformOpenAIRequestToOllama(openAIRequest, model);
    expect(ollamaReq).toMatchObject({
      model: 'llama3:instruct',
      prompt: '[INST] Hi [/INST]\nHello there!',
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 2048
      }
    });
    expect(ollamaReq).not.toHaveProperty('system');
  });

  it('should handle empty messages array', () => {
    const openAIRequest = { messages: [] };
    const model = 'llama3:instruct';
    const ollamaReq = transformOpenAIRequestToOllama(openAIRequest, model);
    expect(ollamaReq.prompt).toBe('');
  });
});

describe('transformOllamaResponseToOpenAI', () => {
  it('should transform an Ollama response to OpenAI format', () => {
    const ollamaResponse = {
      response: 'Hello!',
      done: true
    };
    const model = 'llama3:instruct';
    const originalRequest = {
      messages: [
        { role: 'user', content: 'Hi' }
      ]
    };
    const result = transformOllamaResponseToOpenAI(ollamaResponse, model, originalRequest);
    expect(result).toMatchObject({
      object: 'chat.completion',
      model: 'llama3:instruct',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }
      ],
      usage: expect.objectContaining({
        prompt_tokens: expect.any(Number),
        completion_tokens: expect.any(Number),
        total_tokens: expect.any(Number)
      })
    });
  });

  it('should handle incomplete Ollama response', () => {
    const ollamaResponse = {
      response: 'Partial...',
      done: false
    };
    const model = 'llama3:instruct';
    const originalRequest = {
      messages: [
        { role: 'user', content: 'Hi' }
      ]
    };
    const result = transformOllamaResponseToOpenAI(ollamaResponse, model, originalRequest);
    expect(result.choices[0].finish_reason).toBe('length');
  });
}); 