/**
 * Type definitions for OpenFeature MCP Worker
 */
import type { ZodRawShape } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * Server instance interface for registering tools
 * Compatible with MCP SDK patterns
 */
export interface OpenFeatureMCPServerInstance {
  registerToolWithErrorHandling: (
    name: string,
    config: {
      description: string;
      annotations?: ToolAnnotations;
      inputSchema?: ZodRawShape;
      outputSchema?: ZodRawShape;
    },
    handler: (args: unknown) => Promise<ToolResult>
  ) => void;
}

/**
 * Standard MCP tool result shape used by this worker
 */
export type ToolResult = {
  content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "resource_link";
        uri: string;
        name: string;
        title?: string;
        description?: string;
        mimeType?: string;
      }
  >;
};
