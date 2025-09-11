import { z } from "zod";
import type { OpenFeatureMCPServerInstance, ToolResult } from "../types.js";

const OfrepEvalArgsSchema = z.object({
  baseUrl: z.string().url().optional(),
  flag_key: z.string().optional(),
  targetingKey: z.string().optional(),
  context: z.record(z.any()).optional(),
  apiKey: z.string().optional(),
  bearerToken: z.string().optional(),
  headers: z.record(z.string()).optional(),
  ifNoneMatch: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

async function doFetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  if (!timeoutMs) return fetch(input, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function registerOfrepTools(
  serverInstance: OpenFeatureMCPServerInstance
): void {
  serverInstance.registerToolWithErrorHandling(
    "ofrep_flag_eval",
    {
      description:
        "Evaluate flags via the OpenFeature Remote Evaluation Protocol (OFREP). If `flag_key` is provided evaluates a single flag, otherwise performs a bulk evaluation.",
      inputSchema: OfrepEvalArgsSchema.shape,
    },
    async (args: unknown): Promise<ToolResult> => {
      const parsed = OfrepEvalArgsSchema.safeParse(args);
      if (!parsed.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid input: ${parsed.error.message}`,
            },
          ],
        };
      }

      const data = parsed.data;
      const baseUrl =
        data.baseUrl ?? process.env.OFREP_BASE_URL ?? "";
      if (!baseUrl) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                "Missing base URL. Provide `baseUrl` or set OFREP_BASE_URL env var.",
            },
          ],
        };
      }

      const bearerToken = data.bearerToken ?? process.env.OFREP_BEARER_TOKEN;
      const apiKey = data.apiKey ?? process.env.OFREP_API_KEY;

      const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(data.headers ?? {}),
      };
      if (bearerToken) {
        headers["authorization"] = `Bearer ${bearerToken}`;
      } else if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const context: Record<string, unknown> = {
        ...(data.context ?? {}),
      };
      if (data.targetingKey) {
        context.targetingKey = data.targetingKey;
      }

      const isSingle = Boolean(data.flag_key);
      const url = isSingle
        ? `${baseUrl.replace(/\/$/, "")}/ofrep/v1/evaluate/flags/${encodeURIComponent(
            data.flag_key as string
          )}`
        : `${baseUrl.replace(/\/$/, "")}/ofrep/v1/evaluate/flags`;

      if (!isSingle && data.ifNoneMatch) {
        headers["if-none-match"] = data.ifNoneMatch;
      }

      const body = JSON.stringify({ context });

      try {
        const res = await doFetchWithTimeout(
          url,
          { method: "POST", headers, body },
          data.timeoutMs
        );

        const etag = res.headers.get("etag") ?? undefined;

        if (res.status === 304) {
          const result = {
            status: res.status,
            notModified: true,
            etag,
          };
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        const text = await res.text();
        let json: unknown;
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { raw: text };
        }

        const result = {
          status: res.status,
          etag,
          data: json,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          content: [
            {
              type: "text" as const,
              text: `OFREP request failed: ${message}`,
            },
          ],
        };
      }
    }
  );
}

