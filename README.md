# OpenFeature MCP Local Server (stdio)

### Warning

**This project is in active development and intended for testing only. APIs, prompts, and behavior may change without notice. Do not use in production.**

A local Model Context Protocol (MCP) server that provides OpenFeature SDK installation guidance over stdio.

## Features

- **No Authentication Required**: Simplified implementation without OAuth or user management
- **OpenFeature SDK Installation Guides**: Fetch installation prompts for various OpenFeature SDKs
- **MCP stdio Transport**: Intended for local usage by MCP-compatible clients

## Configure your AI client (local)

### Claude Desktop

Edit your Claude Desktop config and add:

```json
{
  "mcpServers": {
    "openfeature": {
      "command": "npx",
      "args": ["-y", "@openfeature/mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Add to `~/.cursor/mcp_settings.json`:

```json
{
  "mcpServers": {
    "OpenFeature": {
      "command": "npx",
      "args": ["-y", "@openfeature/mcp"]
    }
  }
}
```

### VS Code (Continue)

Add to `.continue/config.json`:

```json
{
  "mcpServers": {
    "OpenFeature": {
      "command": "npx",
      "args": ["-y", "@openfeature/mcp"]
    }
  }
}
```

## NPX usage

- One-shot run:

```bash
npx -y @openfeature/mcp
```

- Installed binary (after cloning/building):

```bash
yarn build
npx openfeature-mcp
```

All logs are written to stderr. The MCP protocol messages use stdout.

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

## Development

### Prerequisites

- Node.js 18+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add or edit install guides in the `prompts/` folder (Markdown). These are bundled at build time.

3. Build prompts bundle:
   ```bash
   npm run build-prompts
   ```

4. Build TypeScript:
   ```bash
   npm run build
   ```

5. Run locally (binary entrypoint):
   ```bash
   node dist/cli.js
   ```