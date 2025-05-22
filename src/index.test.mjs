jest.mock('./utils/transformers.js', () => ({
  transformOpenAIRequestToOllama: jest.fn(() => ({
    model: 'mock',
    prompt: 'test',
    options: {},
    stream: false,
  })),
  transformOllamaResponseToOpenAI: jest.fn(() => ({ result: 'ok' })),
}));
jest.mock('axios');
import { jest } from '@jest/globals';
import axios from 'axios';
axios.create = jest.fn(() => axios);
axios.get = jest.fn();
axios.post = jest.fn();
import request from 'supertest';
import express from 'express';
import { createChatCompletionsRouter } from './routes/chatCompletions.js';

// Create a mock axios instance for integration tests
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
};

const app = express();
app.use(express.json());
app.use('/v1/chat/completions', createChatCompletionsRouter(mockAxios));

describe('/v1/chat/completions endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
  });

  it('should return 400 for missing messages', async () => {
    const res = await request(app).post('/v1/chat/completions').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 200 and OpenAI-style response for valid request', async () => {
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: 'llama3:instruct' }] } });
    mockAxios.post.mockResolvedValue({ data: { response: 'Hello!', done: true } });
    const res = await request(app)
      .post('/v1/chat/completions')
      .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'llama3:instruct' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        object: 'chat.completion',
        model: expect.any(String),
        choices: expect.any(Array),
        usage: expect.any(Object),
      })
    );
  });

  it('should fallback to default model if requested model not found', async () => {
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: 'llama3:instruct' }] } });
    mockAxios.post.mockResolvedValue({ data: { response: 'Hello!', done: true } });
    const res = await request(app)
      .post('/v1/chat/completions')
      .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'nonexistent-model' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        object: 'chat.completion',
        model: expect.any(String),
        choices: expect.any(Array),
        usage: expect.any(Object),
      })
    );
  });

  it('should return 500 for Ollama API error', async () => {
    mockAxios.get.mockResolvedValue({ data: { models: [{ name: 'llama3:instruct' }] } });
    const apiError = new Error('Ollama error');
    apiError.response = { status: 500, data: { error: 'Ollama error' } };
    mockAxios.post.mockRejectedValue(apiError);
    const res = await request(app)
      .post('/v1/chat/completions')
      .send({ messages: [{ role: 'user', content: 'Hi' }], model: 'llama3:instruct' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/Ollama API error/);
  });
});
