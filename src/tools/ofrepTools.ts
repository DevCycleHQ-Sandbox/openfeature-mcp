import { z } from "zod";
import type { RegisterToolWithErrorHandling } from "../server.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const OfrepArgsSchema = z.object({
  base_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Base URL of your OFREP-compatible flag service. must be set directly or via environment variables or config file."
    ),
  flag_key: z
    .string()
    .optional()
    .describe(
      "If provided, calls single flag evaluation, otherwise performs bulk evaluation."
    ),
  context: z
    .object({
      targetingKey: z
        .string()
        .optional()
        .describe(
          "A string logically identifying the subject of evaluation (end-user, service, etc). Should be set in the majority of cases."
        ),
    })
    .passthrough()
    .optional()
    .describe("Context information for flag evaluation"),
  etag: z.string().optional().describe("ETag for bulk evaluation"),
  auth: z
    .object({
      bearer_token: z.string().min(1).optional(),
      api_key: z.string().min(1).optional(),
    })
    .optional(),
});
type OfrepArgs = z.infer<typeof OfrepArgsSchema>;

const OfrepConfigSchema = z
  .object({
    baseUrl: z.string().min(1),
    bearerToken: z.string().optional(),
    token: z.string().optional(),
    apiKey: z.string().optional(),
  })
  .refine((data) => data.bearerToken || data.token || data.apiKey, {
    message: "At least one of bearerToken, token, or apiKey must be provided",
    path: ["bearerToken"],
  });

const ConfigFileSchema = z.object({
  OFREP: OfrepConfigSchema,
});
type OfrepConfig = z.infer<typeof OfrepConfigSchema>;

async function readConfigFromFile() {
  try {
    const explicitPath = process.env.OPENFEATURE_MCP_CONFIG_PATH;
    const defaultPath = resolve(homedir(), ".openfeature-mcp.json");
    const path =
      explicitPath && explicitPath.length > 0 ? explicitPath : defaultPath;
    const file = await readFile(path, { encoding: "utf-8" });
    const parsed = JSON.parse(file);

    const { OFREP } = ConfigFileSchema.parse(parsed);
    return OFREP;
  } catch {
    return null;
  }
}

async function resolveConfig(
  args: OfrepArgs
): Promise<Required<OfrepConfig> | null> {
  const envBase =
    process.env.OPENFEATURE_OFREP_BASE_URL ?? process.env.OFREP_BASE_URL;
  const envBearer =
    process.env.OPENFEATURE_OFREP_BEARER_TOKEN ??
    process.env.OFREP_BEARER_TOKEN;
  const envApiKey =
    process.env.OPENFEATURE_OFREP_API_KEY ?? process.env.OFREP_API_KEY;

  const fileCfg = await readConfigFromFile();

  const baseUrl = args.base_url ?? envBase ?? fileCfg?.baseUrl;
  const bearerToken =
    args.auth?.bearer_token ??
    envBearer ??
    fileCfg?.bearerToken ??
    fileCfg?.token;
  const apiKey = args.auth?.api_key ?? envApiKey ?? fileCfg?.apiKey;

  if (!baseUrl) return null;

  return {
    baseUrl,
    bearerToken: bearerToken ?? "",
    token: "",
    apiKey: apiKey ?? "",
  };
}

function jsonStringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Calls the OFREP API with the given configuration and arguments.
 */
async function callOfrepApi(
  cfg: Required<OfrepConfig>,
  parsed: OfrepArgs
): Promise<CallToolResult> {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const isSingle =
    typeof parsed.flag_key === "string" && parsed.flag_key.length > 0;
  const url = isSingle
    ? `${base}/ofrep/v1/evaluate/flags/${encodeURIComponent(
        parsed.flag_key as string
      )}`
    : `${base}/ofrep/v1/evaluate/flags`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };

  if (cfg.bearerToken) headers["authorization"] = `Bearer ${cfg.bearerToken}`;
  if (cfg.apiKey) headers["X-API-Key"] = cfg.apiKey;
  if (!isSingle && parsed.etag) headers["If-None-Match"] = parsed.etag;

  const body = JSON.stringify({
    context: parsed.context ?? {},
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const etag =
      response.headers.get("ETag") ??
      response.headers.get("Etag") ??
      response.headers.get("etag") ??
      undefined;

    if (response.status === 304) {
      return {
        content: [
          {
            type: "text",
            text: jsonStringifySafe({
              status: 304,
              etag,
              message: "Bulk evaluation not modified",
            }),
          },
        ],
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : await response.text();

    if (!response.ok) {
      // For error responses, prefer text over empty JSON objects
      const hasData =
        (data && typeof data === "string" && data.length > 0) ||
        (typeof data === "object" &&
          data !== null &&
          Object.keys(data).length > 0);

      const errorMessage = hasData
        ? data
        : await response.text().catch(() => "");

      const errorData = {
        status: response.status,
        error: errorMessage,
      };
      return {
        content: [{ type: "text", text: jsonStringifySafe(errorData) }],
      };
    }

    const responseData = isSingle
      ? { status: 200, data }
      : { status: 200, etag, data };

    return {
      content: [{ type: "text", text: jsonStringifySafe(responseData) }],
    };
  } catch (err) {
    const errMsg = { error: err instanceof Error ? err.message : String(err) };
    return { content: [{ type: "text", text: jsonStringifySafe(errMsg) }] };
  }
}

export function registerOfrepTools(
  registerToolWithErrorHandling: RegisterToolWithErrorHandling
): void {
  registerToolWithErrorHandling(
    "ofrep_flag_eval",
    {
      description:
        "Evaluate feature flags using OpenFeature Remote Evaluation Protocol (OFREP). If flag_key is omitted, performs bulk evaluation.",
      inputSchema: OfrepArgsSchema.shape,
    },
    async (args: unknown): Promise<CallToolResult> => {
      const parsed = OfrepArgsSchema.parse(args);

      const cfg = await resolveConfig(parsed);
      if (!cfg) {
        return {
          content: [
            {
              type: "text",
              text: "Missing base_url configuration. Provide base_url in args, set OPENFEATURE_OFREP_BASE_URL, or configure ~/.openfeature-mcp.json.",
            },
          ],
        };
      }

      return await callOfrepApi(cfg, parsed);
    }
  );
}
