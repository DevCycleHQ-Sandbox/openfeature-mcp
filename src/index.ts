import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import type { ZodRawShape } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { workerVersion } from "./version";
import { registerInstallTools } from "./tools/installTools";
import type { OpenFeatureMCPServerInstance, ToolResult } from "./types";
import { INSTALL_GUIDES } from "./tools/promptsBundle.generated";

/**
 * Error handling utility for MCP tools
 */
function handleToolError(error: unknown, toolName: string): ToolResult {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error occurred";
  console.error(`Tool ${toolName} error:`, errorMessage);

  return {
    content: [
      {
        type: "text" as const,
        text: `Error in ${toolName}: ${errorMessage}`,
      },
    ],
  };
}

/**
 * Build a small request log context for observability
 */
function buildRequestLogContext(request: Request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    pathname: url.pathname,
    search: url.search || undefined,
    host: url.host,
    userAgent: request.headers.get("user-agent") || undefined,
    cfRay: request.headers.get("cf-ray") || undefined,
  };
}

/**
 * OpenFeature MCP Server for Cloudflare Workers
 *
 * Durable Object interface: This class is registered as the Durable Object
 * implementation (see wrangler.toml) and is instantiated by Cloudflare when
 * addressed via its binding. It extends McpAgent to provide OpenFeature SDK
 * installation guidance over the Model Context Protocol (MCP), including SSE.
 * This is a simplified version without OAuth authentication.
 */
export class OpenFeatureMCP extends McpAgent<
  Env,
  unknown,
  Record<string, unknown>
> {
  server = new McpServer({
    name: "OpenFeature MCP Server",
    version: workerVersion,
  });

  /**
   * Initialize the MCP server with tools and handlers
   */
  override async init() {
    console.log("Initializing OpenFeature MCP Worker", {
      version: workerVersion,
      availableGuides: INSTALL_GUIDES,
    });

    // Create an adapter to make the worker's McpServer compatible with the registration pattern
    const serverAdapter: OpenFeatureMCPServerInstance = {
      registerToolWithErrorHandling: (
        name: string,
        config: {
          description: string;
          annotations?: ToolAnnotations;
          inputSchema?: ZodRawShape;
          outputSchema?: ZodRawShape;
        },
        handler: (args: unknown) => Promise<ToolResult>
      ) => {
        const toolHandler = async (
          args: { [x: string]: any },
          _extra: unknown
        ): Promise<ToolResult> => {
          try {
            console.log("MCP tool invoke", { tool: name, args });
            const result = await handler(args);
            console.log("MCP tool success", { tool: name });
            return result;
          } catch (error) {
            return handleToolError(error, name);
          }
        };

        this.server.registerTool(
          name,
          // TypeScript workaround: The MCP SDK's registerTool has complex generic constraints
          // that cause "Type instantiation is excessively deep" errors when used with our
          // adapter pattern. The types are correct at runtime, but TS can't verify them fully.
          config as Parameters<typeof this.server.registerTool>[1],
          toolHandler as Parameters<typeof this.server.registerTool>[2]
        );
      },
    };

    // Register OpenFeature SDK installation tools
    registerInstallTools(serverAdapter);

    console.log("✅ OpenFeature MCP Worker initialization completed");
  }
}

// Export a fetch handler that creates a simple MCP server without OAuth
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestLogContext = buildRequestLogContext(request);
    console.log("Request received", requestLogContext);

    const url = new URL(request.url);

    const routes: Record<string, () => Promise<Response>> = {
      "/mcp": () => OpenFeatureMCP.serve("/mcp").fetch(request, env, ctx),
      "/sse": () => OpenFeatureMCP.serveSSE("/sse").fetch(request, env, ctx),
      "/health": () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: "ok",
              service: "OpenFeature MCP Server",
              timestamp: new Date().toISOString(),
            }),
            { headers: { "Content-Type": "application/json" } }
          )
        ),
      "/info": () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              service: "OpenFeature MCP Server",
              version: workerVersion,
              endpoints: {
                mcp: "/mcp",
                sse: "/sse",
                health: "/health",
                info: "/info",
              },
              availableGuides: INSTALL_GUIDES,
            }),
            { headers: { "Content-Type": "application/json" } }
          )
        ),
      "/": () =>
        Promise.resolve(
          Response.redirect("https://openfeature.dev/docs/reference/intro", 301)
        ),
    };

    const handler = routes[url.pathname];
    if (handler) {
      return handler();
    } else {
      console.warn("Route not found", { pathname: url.pathname });
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    }
  },
};
