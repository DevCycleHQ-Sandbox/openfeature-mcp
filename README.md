# OpenFeature MCP Cloudflare Worker

### Warning

**This project is in active development and intended for testing only. APIs, prompts, and behavior may change without notice. Do not use in production.**

A simplified Model Context Protocol (MCP) server running on Cloudflare Workers that provides OpenFeature SDK installation guidance.

## Features

- **No Authentication Required**: Simplified implementation without OAuth or user management
- **OpenFeature SDK Installation Guides**: Fetch installation prompts for various OpenFeature SDKs
- **MCP Protocol Support**: Supports both SSE and JSON-RPC transports
- **Cloudflare Workers**: Serverless deployment with global edge distribution

## Available Tools

### `install_openfeature_sdk`

Fetches and returns OpenFeature SDK install prompt Markdown for a given guide from the bundled prompts.

**Parameters:**
- `guide` (string enum): One of the supported guides listed below

**Supported Guides (bundled):**
- android
- dotnet
- go
- ios
- java
- javascript
- nestjs
- nodejs
- php
- python
- react
- ruby

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

2. Add or edit install guides in the `prompts/` folder (Markdown). These are bundled at build time.

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

The worker exposes MCP transport endpoints and simple health/info endpoints.

### Examples

1. **Health:**
   ```bash
   curl http://localhost:8787/health
   ```

2. **Info:**
   ```bash
   curl http://localhost:8787/info
   ```

3. **MCP over HTTP (JSON-RPC) or SSE:**
   Point your MCP-compatible client to `/mcp` (JSON-RPC) or `/sse` (SSE). The tool name is `install_openfeature_sdk` and requires an input object like `{ "guide": "react" }`.

## Architecture

This is a simplified version of the DevCycle MCP worker, with all authentication and project management features removed. It focuses solely on providing OpenFeature SDK installation guidance through MCP tool calls.
