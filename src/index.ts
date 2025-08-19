import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import type { ZodRawShape } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { workerVersion } from "./version";
import { registerInstallTools } from "./tools/installTools";
import type { OpenFeatureMCPServerInstance } from "./types";
import { INSTALL_GUIDES } from "./tools/promptsBundle.generated";

/**
 * Error handling utility for MCP tools
 */
function handleToolError(error: unknown, toolName: string) {
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
 * OpenFeature MCP Server for Cloudflare Workers
 *
 * This class extends McpAgent to provide OpenFeature SDK installation guidance
 * through the Model Context Protocol over Server-Sent Events (SSE).
 * This is a simplified version without OAuth authentication.
 */
export class OpenFeatureMCP extends McpAgent<
  Env,
  unknown,
  Record<string, unknown>
> {
  private readonly version = workerVersion;

  server = new McpServer({
    name: "OpenFeature MCP Server",
    version: this.version,
  });

  /**
   * Initialize the MCP server with tools and handlers
   */
  override async init() {
    console.log("Initializing OpenFeature MCP Worker", {
      version: this.version,
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
        handler: (args: unknown) => Promise<unknown>
      ) => {
        this.server.registerTool(
          name,
          // TypeScript workaround: The MCP SDK's registerTool has complex generic constraints
          // that cause "Type instantiation is excessively deep" errors when used with our
          // adapter pattern. The types are correct at runtime, but TS can't verify them.
          config as Parameters<typeof this.server.registerTool>[1],
          async (args: unknown) => {
            try {
              const result = await handler(args);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              };
            } catch (error) {
              return handleToolError(error, name);
            }
          }
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
    console.log("OpenFeature MCP Worker handling request:", request.url);

    // Handle MCP protocol endpoints
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      return OpenFeatureMCP.serve("/mcp").fetch(request, env, ctx);
    } else if (url.pathname === "/sse") {
      return OpenFeatureMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    // Health check and info endpoints for debugging
    if (url.pathname === "/health") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "OpenFeature MCP Server",
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    if (url.pathname === "/info") {
      return Promise.resolve(
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
          {
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Root route - redirect to OpenFeature documentation
    if (url.pathname === "/") {
      return Promise.resolve(
        Response.redirect("https://openfeature.dev/docs/", 301)
      );
    }

    // Default 404 response
    return Promise.resolve(new Response("Not Found", { status: 404 }));
  },
};
