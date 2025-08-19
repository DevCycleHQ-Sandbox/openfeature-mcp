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
    handler: (args: unknown) => Promise<unknown>
  ) => void;
}
