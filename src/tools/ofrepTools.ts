import { z } from "zod";
import type { OpenFeatureMCPServerInstance, ToolResult } from "../types.js";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const OfrepArgsSchema = z.object({
  base_url: z.string().url().optional(),
  flag_key: z.string().optional(),
  context: z.record(z.any()).optional(),
  etag: z.string().optional(),
  auth: z
    .object({
      bearer_token: z.string().min(1).optional(),
      api_key: z.string().min(1).optional(),
    })
    .optional(),
});

type OfrepArgs = z.infer<typeof OfrepArgsSchema>;

type OfrepConfig = {
  baseUrl?: string;
  bearerToken?: string;
  apiKey?: string;
};

async function readConfigFromFile(): Promise<Partial<OfrepConfig>> {
  try {
    const explicitPath = process.env.OPENFEATURE_MCP_CONFIG_PATH;
    const defaultPath = resolve(homedir(), ".openfeature-mcp.json");
    const path = explicitPath && explicitPath.length > 0 ? explicitPath : defaultPath;
    const file = await readFile(path, { encoding: "utf-8" });
    const parsed = JSON.parse(file);

    const ofrepSection = parsed?.ofrep ?? parsed?.OFREP ?? parsed;
    const baseUrl: unknown = ofrepSection?.baseUrl ?? ofrepSection?.base_url;
    const bearerToken: unknown =
      ofrepSection?.bearerToken ?? ofrepSection?.bearer_token ?? ofrepSection?.token;
    const apiKey: unknown = ofrepSection?.apiKey ?? ofrepSection?.api_key;

    return {
      baseUrl: typeof baseUrl === "string" ? baseUrl : undefined,
      bearerToken: typeof bearerToken === "string" ? bearerToken : undefined,
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
    };
  } catch {
    return {};
  }
}

async function resolveConfig(args: OfrepArgs): Promise<Required<OfrepConfig> | null> {
  const envBase = process.env.OPENFEATURE_OFREP_BASE_URL ?? process.env.OFREP_BASE_URL;
  const envBearer =
    process.env.OPENFEATURE_OFREP_BEARER_TOKEN ?? process.env.OFREP_BEARER_TOKEN;
  const envApiKey = process.env.OPENFEATURE_OFREP_API_KEY ?? process.env.OFREP_API_KEY;

  const fileCfg = await readConfigFromFile();

  const baseUrl = args.base_url ?? envBase ?? fileCfg.baseUrl;
  const bearerToken = args.auth?.bearer_token ?? envBearer ?? fileCfg.bearerToken;
  const apiKey = args.auth?.api_key ?? envApiKey ?? fileCfg.apiKey;

  if (!baseUrl) return null;

  return {
    baseUrl,
    bearerToken: bearerToken ?? "",
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

export function registerOfrepTools(serverInstance: OpenFeatureMCPServerInstance): void {
  serverInstance.registerToolWithErrorHandling(
    "ofrep_flag_eval",
    {
      description:
        "Evaluate feature flags using OpenFeature Remote Evaluation Protocol (OFREP). If flag_key is omitted, performs bulk evaluation.",
      inputSchema: OfrepArgsSchema.shape,
    },
    async (args: unknown): Promise<ToolResult> => {
      const parsed = OfrepArgsSchema.safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            { type: "text", text: `Invalid input: ${parsed.error.message}` },
          ],
        };
      }

      const cfg = await resolveConfig(parsed.data);
      if (!cfg) {
        return {
          content: [
            {
              type: "text",
              text:
                "Missing base_url configuration. Provide base_url in args, set OPENFEATURE_OFREP_BASE_URL, or configure ~/.openfeature-mcp.json.",
            },
          ],
        };
      }

      const base = cfg.baseUrl.replace(/\/$/, "");
      const isSingle = typeof parsed.data.flag_key === "string" && parsed.data.flag_key.length > 0;
      const url = isSingle
        ? `${base}/ofrep/v1/evaluate/flags/${encodeURIComponent(parsed.data.flag_key as string)}`
        : `${base}/ofrep/v1/evaluate/flags`;

      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json",
      };

      if (cfg.bearerToken) headers["authorization"] = `Bearer ${cfg.bearerToken}`;
      if (cfg.apiKey) headers["X-API-Key"] = cfg.apiKey;
      if (!isSingle && parsed.data.etag) headers["If-None-Match"] = parsed.data.etag;

      const body = JSON.stringify({
        context: parsed.data.context ?? {},
      });

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body,
        });

        const etag = response.headers.get("ETag") ?? response.headers.get("Etag") ?? response.headers.get("etag") ?? undefined;

        if (response.status === 304) {
          const out = {
            status: 304,
            etag,
            message: "Bulk evaluation not modified",
          };
          return { content: [{ type: "text", text: jsonStringifySafe(out) }] };
        }

        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await response.json().catch(() => undefined)
          : await response.text().catch(() => undefined);

        if (!response.ok) {
          const out = {
            status: response.status,
            error: data ?? (await response.text().catch(() => "")),
          };
          return { content: [{ type: "text", text: jsonStringifySafe(out) }] };
        }

        const out = isSingle
          ? { status: 200, data }
          : { status: 200, etag, data };

        return { content: [{ type: "text", text: jsonStringifySafe(out) }] };
      } catch (err) {
        const out = { error: err instanceof Error ? err.message : String(err) };
        return { content: [{ type: "text", text: jsonStringifySafe(out) }] };
      }
    }
  );
}

