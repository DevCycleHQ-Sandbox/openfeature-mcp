# OpenFeature MCP Cloudflare Worker

A simplified Model Context Protocol (MCP) server running on Cloudflare Workers that provides OpenFeature SDK installation guidance.

## Features

- **No Authentication Required**: Simplified implementation without OAuth or user management
- **OpenFeature SDK Installation Guides**: Fetch installation prompts for various OpenFeature SDKs
- **MCP Protocol Support**: Supports both SSE and JSON-RPC transports
- **Cloudflare Workers**: Serverless deployment with global edge distribution

## Available Tools

### `install_openfeature_sdk`

Fetches and returns OpenFeature SDK installation guides from the AI-Prompts-And-Rules repository.

**Parameters:**
- `guide` (string): The SDK guide to fetch (e.g., "javascript", "python", "java")

**Supported Guides:**
- android
- dotnet
- go
- java
- javascript
- nodejs
- php
- python
- react
- react-native
- ruby
- web

## Endpoints

- `/mcp` - MCP JSON-RPC transport endpoint
- `/sse` - MCP Server-Sent Events transport endpoint
- `/health` - Health check endpoint
- `/info` - Service information endpoint
- `/` - Redirects to OpenFeature documentation

## Development

### Prerequisites

- Node.js 18+
- Yarn (using regular node_modules, not PnP)
- Wrangler CLI

### Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. (Optional) Sync prompts from GitHub or add custom prompts to the `prompts/` folder:
   ```bash
   yarn sync-prompts        # Sync popular guides
   yarn sync-prompts:all    # Sync all available guides
   ```

3. Build prompts bundle:
   ```bash
   yarn build-prompts
   ```

4. Run locally:
   ```bash
   yarn dev
   ```

5. Build for production:
   ```bash
   yarn build
   ```

### Deployment

Deploy to Cloudflare Workers:

```bash
yarn deploy
```

## Usage

The worker provides a simple HTTP API for accessing OpenFeature SDK installation guides:

### REST API Endpoints

- **GET `/guides`** - List all available installation guides
- **GET `/install-guide/:guide`** - Get a specific installation guide (returns markdown)
- **POST `/tool/install_openfeature_sdk`** - MCP-style tool call endpoint

### Examples

1. **List available guides:**
   ```bash
   curl http://localhost:8787/guides
   ```

2. **Get a specific guide:**
   ```bash
   curl http://localhost:8787/install-guide/javascript
   ```

3. **MCP-style tool call:**
   ```bash
   curl -X POST http://localhost:8787/tool/install_openfeature_sdk \
     -H "Content-Type: application/json" \
     -d '{"guide": "javascript"}'
   ```

### Response Format

The MCP-style endpoint returns responses in this format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "<!-- Markdown content of the install guide -->"
    }
  ]
}
```

## Architecture

This is a simplified version of the DevCycle MCP worker, with all authentication and project management features removed. It focuses solely on providing OpenFeature SDK installation guidance through HTTP endpoints.

### Install Guide Storage

The worker uses a hybrid approach for install guides:

1. **Bundled Prompts**: Guides are bundled at build time from the local `prompts/` folder for fast access
2. **GitHub Fallback**: If a guide isn't bundled, it falls back to fetching from GitHub
3. **Build-time Generation**: The `yarn build-prompts` command creates a TypeScript bundle from local markdown files

### Key Differences from Source

- **No Authentication**: Removed OAuth, JWT tokens, and user management
- **No API Client**: No external API calls to DevCycle services
- **No Project Management**: No project selection or state management
- **Single Tool Focus**: Only the install SDK tool is included
- **Simplified Deployment**: No KV storage or durable objects required
- **Local Prompts**: Install guides are bundled at build time for better performance

## License

This project is part of the OpenFeature ecosystem.
