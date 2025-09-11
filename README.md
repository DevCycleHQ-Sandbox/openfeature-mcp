# OpenFeature MCP Local Server (stdio)

### Warning

**This project is in active development and intended for testing only. APIs, prompts, and behavior may change without notice. Do not use in production.**

A local Model Context Protocol (MCP) server that provides OpenFeature SDK installation guidance over stdio.

## Features

- **No Authentication Required**: Simplified implementation without OAuth or user management
- **OpenFeature SDK Installation Guides**: Fetch installation prompts for various OpenFeature SDKs
- **MCP stdio Transport**: Intended for local usage by MCP-compatible clients

## Configure your AI client (local)

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

### Claude Code (CLI)

Add the server via CLI:

```bash
claude mcp add --transport stdio openfeature npx -y @openfeature/mcp
```

Then manage the connection in the CLI with `/mcp`.

### Windsurf

In the "Manage MCP servers" raw config, add:

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

## NPM Global install (optional)

If you prefer a global install instead of NPX:

```bash
npm install -g @openfeature/mcp
```

Now in your MCP config use `openfeature-mcp` as the command:

```json
{
  "mcpServers": {
    "openfeature": {
      "command": "openfeature-mcp"
    }
  }
}
```

All logs are written to stderr. The MCP protocol messages use stdout.

## Available Tools

### `install_openfeature_sdk`

### `ofrep_flag_eval`

Evaluate flags using the OpenFeature Remote Evaluation Protocol (OFREP) [specification](`https://github.com/open-feature/protocol`). If `flag_key` is provided, performs a single-flag evaluation; otherwise, performs a bulk evaluation per the [OpenAPI definition](`https://raw.githubusercontent.com/open-feature/protocol/refs/heads/main/service/openapi.yaml`).

Inputs:

- `baseUrl` (string, optional): Base URL of your OFREP service (e.g. `https://flags.example.com`). If omitted, uses `OFREP_BASE_URL` env var.
- `flag_key` (string, optional): When set, uses single-flag endpoint; otherwise uses bulk endpoint.
- `targetingKey` (string, optional): Added to the evaluation context as `context.targetingKey`.
- `context` (object, optional): Additional evaluation context properties.
- `apiKey` (string, optional): Sends `x-api-key` header. If omitted, uses `OFREP_API_KEY` env var.
- `bearerToken` (string, optional): Sends `Authorization: Bearer ...`. If omitted, uses `OFREP_BEARER_TOKEN` env var.
- `headers` (object, optional): Extra headers to include.
- `ifNoneMatch` (string, optional): ETag for bulk evaluation cache validation. Returns 304 if not modified.
- `timeoutMs` (number, optional): Request timeout in milliseconds.

Output:

- JSON string with `status`, optional `etag`, and `data` (parsed response). If bulk eval returns 304, `notModified: true` is set.

Examples:

Bulk evaluation with env-configured auth:

```json
{
  "baseUrl": "https://flags.example.com",
  "context": { "plan": "pro" },
  "ifNoneMatch": "\"etag-from-previous-call\""
}
```

Single flag evaluation with explicit bearer token:

```json
{
  "baseUrl": "https://flags.example.com",
  "flag_key": "my-flag",
  "targetingKey": "user-123",
  "bearerToken": "<token>"
}
```

Authentication configuration options:

- Environment variables: set `OFREP_BASE_URL`, `OFREP_API_KEY`, and/or `OFREP_BEARER_TOKEN` before launching the server.
- MCP client config (when supported): some clients allow passing env into the MCP server command. For example, you can wrap the `npx` call in a shell script that exports env vars.
- Local shell profile: export the variables in your shell (e.g., `.bashrc`, `.zshrc`) so they apply to the `npx @openfeature/mcp` invocation.

References: [OFREP repository](`https://github.com/open-feature/protocol`), [OFREP OpenAPI](`https://raw.githubusercontent.com/open-feature/protocol/refs/heads/main/service/openapi.yaml`).

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