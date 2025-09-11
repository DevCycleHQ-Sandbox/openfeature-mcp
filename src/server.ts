import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ZodRawShape } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { workerVersion } from "./version.js";
import { registerInstallTools } from "./tools/installTools.js";
import { registerOfrepTools } from "./tools/ofrepTools.js";
import type { OpenFeatureMCPServerInstance, ToolResult } from "./types.js";

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

export function createServer(): McpServer {
  const server = new McpServer({
    name: "OpenFeature MCP Server",
    version: workerVersion,
  });

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
          console.error("MCP tool invoke", { tool: name, args });
          const result = await handler(args);
          console.error("MCP tool success", { tool: name });
          return result;
        } catch (error) {
          return handleToolError(error, name);
        }
      };

      server.registerTool(
        name,
        config as Parameters<typeof server.registerTool>[1],
        toolHandler as Parameters<typeof server.registerTool>[2]
      );
    },
  };

  registerInstallTools(serverAdapter);
  registerOfrepTools(serverAdapter);

  return server;
}

export async function startServer(): Promise<void> {
  // Error logs must be used here as stdout is used for MCP protocol messages
  console.error("Initializing OpenFeature MCP local server", {
    version: workerVersion,
  });

  const server = createServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    console.error("Received SIGINT, shutting down.");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    console.error("Received SIGTERM, shutting down.");
    process.exit(0);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });

  transport.onclose = () => {
    console.error("Stdio transport closed. Exiting server.");
    process.exit(0);
  };

  await server.connect(transport);
  console.error("✅ OpenFeature MCP Server (stdio) started");
}

export default startServer;
