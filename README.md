# OpenAI to Ollama Local Proxy

A lightweight proxy server that redirects OpenAI API requests to a local Ollama instance.

## Overview

This proxy allows you to use any OpenAI-compatible client library or application with your local Ollama models. It receives requests formatted for the OpenAI API and redirects them to your Ollama instance running on localhost.

## Features

- Transparent proxy between OpenAI API clients and Ollama
- Maintains OpenAI API request/response format compatibility
- Supports chat completions endpoint
- No API keys required for local development
- Automatic model fallback for non-existent or OpenAI-named models
- Handles requests to the official api.openai.com domain

## Prerequisites

- Node.js (>= 14.x)
- [Ollama](https://github.com/ollama/ollama) installed and running locally

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/openai-ollama-local-proxy.git
   cd openai-ollama-local-proxy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Make sure Ollama is running locally:
   ```
   ollama serve
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=gemma3:1b
```

## Model Mapping and Fallback

The proxy includes a smart model mapping and fallback system:

1. If the requested model is a recognized OpenAI model (like "gpt-4", "gpt-3.5-turbo", "o1"), it will be automatically mapped to your default Ollama model.

2. If the requested model doesn't exist in your Ollama instance, the proxy will fall back to the default model (gemma3:1b or as configured in your .env file).

3. To use a specific Ollama model, simply specify its exact name as in your Ollama instance:
   ```javascript
   model: 'llama3:instruct' // Will use this model if available, otherwise fall back
   ```

## Host Redirection Setup

To use existing OpenAI clients without modifying their code, you can redirect requests from `api.openai.com` to your local proxy. This requires modifying your system's hosts file.

### macOS / Linux

1. Open Terminal
2. Edit the hosts file with administrator privileges:
   ```bash
   sudo nano /etc/hosts
   ```
3. Add the following line to the file:
   ```
   127.0.0.1 api.openai.com
   ```
4. Save the file (Ctrl+O, then Enter) and exit (Ctrl+X)
5. Flush your DNS cache:
   - For macOS:
     ```bash
     sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
     ```
   - For Linux (Ubuntu/Debian):
     ```bash
     sudo systemd-resolve --flush-caches
     ```
   - For Linux (older systems):
     ```bash
     sudo service nscd restart
     ```

### Windows

1. Open Notepad as Administrator (right-click Notepad and select "Run as administrator")
2. Open the file: `C:\Windows\System32\drivers\etc\hosts`
3. Add the following line:
   ```
   127.0.0.1 api.openai.com
   ```
4. Save the file
5. Flush your DNS cache by opening Command Prompt as Administrator and running:
   ```cmd
   ipconfig /flushdns
   ```

## SSL Certificate Setup

Since the proxy intercepts HTTPS requests, you'll need to run the server with SSL certificates:

1. The server requires SSL certificates to run HTTPS. The certificates are included in the repository:
   - `server.key`: SSL private key
   - `server.crt`: SSL certificate

2. If you need to generate new certificates:
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt -subj "/CN=api.openai.com" -addext "subjectAltName=DNS:api.openai.com"
   ```

## Usage

1. Start the proxy server with administrator privileges (required for port 80/443):
   ```
   sudo npm start
   ```
   
   On Windows, run Command Prompt as Administrator and use:
   ```
   npm start
   ```

2. The server will be available at both standard HTTP/HTTPS ports and port 3000. Any requests to `api.openai.com` will be redirected to your local Ollama instance.

3. Example with OpenAI Node.js client (using standard OpenAI endpoint):
   ```javascript
   import OpenAI from 'openai';

   const openai = new OpenAI({
     apiKey: 'dummy-key', // required by the client but not used
   });

   const completion = await openai.chat.completions.create({
     model: 'gemma3:1b', // or any model available in your Ollama instance
     messages: [{ role: 'user', content: 'Hello world!' }],
   });
   ```

   You can also use standard OpenAI model names which will be mapped to your default model:
   ```javascript
   const completion = await openai.chat.completions.create({
     model: 'gpt-4', // Will be mapped to your default Ollama model
     messages: [{ role: 'user', content: 'Hello world!' }],
   });
   ```

## Supported Endpoints

- `/v1/chat/completions` - Chat completions API

## Testing

This project is fully covered by automated tests:

- **Unit tests** for transformers and controllers
- **Integration tests** for the `/v1/chat/completions` endpoint

### Test Infrastructure and Dependency Injection

- The router (`chatCompletionsRouter`) is now created via a factory function: `createChatCompletionsRouter([axiosInstance])`.
- **Production** uses the default export, which uses the real axios instance.
- **Tests** inject a mock axios instance, enabling robust, isolated, and deterministic testing of all error branches (including network and API errors).
- See `src/controllers/chatCompletions.test.mjs` and `src/index.test.mjs` for examples of dependency injection in tests.

To run all tests:

```
npm test
```

Tests use [Jest](https://jestjs.io/) and [Supertest](https://github.com/visionmedia/supertest). All core logic and API endpoints are covered.

## Production Readiness

This platform follows best practices for error handling, configuration, and logging. All core areas are covered by automated tests. Outstanding recommendations are only for optional improvements (dynamic model mapping, prompt flexibility, startup logic documentation, and security hardening for privileged ports).

## License

MIT 
