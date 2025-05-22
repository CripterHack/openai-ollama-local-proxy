jest.mock('../utils/transformers.js', () => ({
  transformOpenAIRequestToOllama: jest.fn(() => ({})),
  transformOllamaResponseToOpenAI: jest.fn(() => ({ result: 'ok' }))
}));
jest.mock('axios');
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import axios from 'axios';
axios.create = jest.fn(() => axios);
axios.get = jest.fn();
axios.post = jest.fn();
import { forwardChatCompletionRequest } from './chatCompletions.js';
import { config } from '../utils/config.js';
import httpMocks from 'node-mocks-http';

const mockRes = () => httpMocks.createResponse({ eventEmitter: EventEmitter });
const mockNext = jest.fn();

// Remove global axios mocks for get/post
const mockAxios = {
  get: jest.fn(),
  post: jest.fn()
};

describe('forwardChatCompletionRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
  });

  it('should return 400 if messages are missing or invalid', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = mockRes();
    await forwardChatCompletionRequest(req, res, mockNext, mockAxios);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData()).toMatch(/Missing required 'messages'/);
  });

  it('should map OpenAI model names to default Ollama model', async () => {
    const req = httpMocks.createRequest({
      body: {
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'gpt-4'
      }
    });
    const res = mockRes();
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: config.ollama.defaultModel }] } });
    mockAxios.post.mockResolvedValue({ data: { response: 'Hello!', done: true } });
    await forwardChatCompletionRequest(req, res, mockNext, mockAxios);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getData();
    expect(typeof data).toBe('string');
    const parsed = JSON.parse(data);
    expect(parsed).toEqual(expect.objectContaining({
      object: 'chat.completion',
      model: expect.any(String),
      choices: expect.any(Array),
      usage: expect.any(Object)
    }));
  });

  it('should fallback to default model if requested model not found', async () => {
    const req = httpMocks.createRequest({
      body: {
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'nonexistent-model'
      }
    });
    const res = mockRes();
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: config.ollama.defaultModel }] } });
    mockAxios.post.mockResolvedValue({ data: { response: 'Hello!', done: true } });
    await forwardChatCompletionRequest(req, res, mockNext, mockAxios);
    expect(res._getStatusCode()).toBe(200);
    const data = res._getData();
    expect(typeof data).toBe('string');
    const parsed = JSON.parse(data);
    expect(parsed).toEqual(expect.objectContaining({
      object: 'chat.completion',
      model: expect.any(String),
      choices: expect.any(Array),
      usage: expect.any(Object)
    }));
  });

  it('should handle Ollama API errors gracefully', async () => {
    const req = httpMocks.createRequest({
      body: {
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'llama3:instruct'
      }
    });
    const res = mockRes();
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: 'llama3:instruct' }] } });
    const apiError = new Error('Ollama error');
    apiError.response = { status: 500, data: { error: 'Ollama error' } };
    mockAxios.post.mockRejectedValue(apiError);
    await forwardChatCompletionRequest(req, res, mockNext, mockAxios);
    expect(res._getStatusCode()).toBe(500);
    const data = res._getData();
    expect(typeof data).toBe('string');
    const parsed = JSON.parse(data);
    expect(parsed).toHaveProperty('error');
    expect(parsed.error.message).toMatch(/Ollama API error/);
  });

  it('should call next(error) for network or unexpected errors', async () => {
    const req = httpMocks.createRequest({
      body: {
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'llama3:instruct'
      }
    });
    const res = mockRes();
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: 'llama3:instruct' }] } });
    const networkError = new Error('Network error');
    mockAxios.post.mockRejectedValue(networkError);
    await forwardChatCompletionRequest(req, res, mockNext, mockAxios);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
}); 