import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerOfrepTools } from "./ofrepTools.js";
import type { RegisterToolWithErrorHandling } from "../server.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a mock tool registration function
function createMockRegisterTool() {
  const tools = new Map<
    string,
    { handler: (args: unknown) => Promise<CallToolResult> }
  >();

  const registerTool: RegisterToolWithErrorHandling = (
    name,
    config,
    handler
  ) => {
    tools.set(name, { handler });
  };

  return { registerTool, tools };
}

describe("ofrepTools", () => {
  let mockRegisterTool: RegisterToolWithErrorHandling;
  let tools: Map<string, any>;
  let toolHandler: (args: unknown) => Promise<CallToolResult>;

  beforeEach(() => {
    const mock = createMockRegisterTool();
    mockRegisterTool = mock.registerTool;
    tools = mock.tools;

    // Register the tools
    registerOfrepTools(mockRegisterTool);
    toolHandler = tools.get("ofrep_flag_eval").handler;

    // Clear fetch mock
    mockFetch.mockClear();

    // Clear environment variables
    delete process.env.OPENFEATURE_OFREP_BASE_URL;
    delete process.env.OFREP_BASE_URL;
    delete process.env.OPENFEATURE_OFREP_BEARER_TOKEN;
    delete process.env.OFREP_BEARER_TOKEN;
    delete process.env.OPENFEATURE_OFREP_API_KEY;
    delete process.env.OFREP_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema Validation", () => {
    beforeEach(() => {
      process.env.OPENFEATURE_OFREP_BASE_URL = "https://api.example.com";
      process.env.OPENFEATURE_OFREP_BEARER_TOKEN = "test-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: () => Promise.resolve({ value: true, reason: "STATIC" }),
      });
    });

    it("should accept valid args", async () => {
      const result = await toolHandler({
        flag_key: "my-feature",
        context: { targetingKey: "user-123" },
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
    });

    it("should reject invalid URL", async () => {
      await expect(
        toolHandler({
          base_url: "not-a-valid-url",
          flag_key: "test-flag",
        })
      ).rejects.toThrow();
    });
  });

  describe("OFREP API Compliance", () => {
    beforeEach(() => {
      process.env.OPENFEATURE_OFREP_BASE_URL = "https://flags.example.com";
      process.env.OPENFEATURE_OFREP_BEARER_TOKEN = "test-token";
    });

    it("should make correct single flag evaluation request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: () =>
          Promise.resolve({ key: "my-feature", value: true, reason: "STATIC" }),
      });

      await toolHandler({
        flag_key: "my-feature",
        context: { targetingKey: "user-123" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://flags.example.com/ofrep/v1/evaluate/flags/my-feature",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: "Bearer test-token",
          },
          body: JSON.stringify({ context: { targetingKey: "user-123" } }),
        }
      );
    });

    it("should make correct bulk evaluation request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ["content-type", "application/json"],
          ["etag", '"v1.0.0"'],
        ]),
        json: () => Promise.resolve({ flags: [] }),
      });

      await toolHandler({
        context: { targetingKey: "user-123" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://flags.example.com/ofrep/v1/evaluate/flags",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "content-type": "application/json",
            authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("should include If-None-Match header with etag", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: () => Promise.resolve({ flags: [] }),
      });

      await toolHandler({
        context: { targetingKey: "user-123" },
        etag: '"abc123"',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "If-None-Match": '"abc123"',
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      process.env.OPENFEATURE_OFREP_BASE_URL = "https://flags.example.com";
      process.env.OPENFEATURE_OFREP_BEARER_TOKEN = "test-token";
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map([["content-type", "application/json"]]),
        json: () => Promise.resolve({ errorCode: "FLAG_NOT_FOUND" }),
        text: () => Promise.resolve("Flag not found"),
      });

      const result = await toolHandler({ flag_key: "nonexistent-flag" });
      const response = JSON.parse(result.content[0].text as string);

      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await toolHandler({ flag_key: "test-flag" });
      const response = JSON.parse(result.content[0].text as string);

      expect(response.error).toBe("Connection refused");
    });
  });

  describe("Configuration", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        json: () => Promise.resolve({ value: true }),
      });
    });

    it("should prioritize args over env vars", async () => {
      process.env.OPENFEATURE_OFREP_BASE_URL = "https://env.example.com";
      process.env.OPENFEATURE_OFREP_BEARER_TOKEN = "env-token";

      await toolHandler({
        base_url: "https://args.example.com",
        flag_key: "test-flag",
        auth: { bearer_token: "args-token" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://args.example.com/ofrep/v1/evaluate/flags/test-flag",
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer args-token",
          }),
        })
      );
    });

    it("should return error when no base URL configured", async () => {
      const result = await toolHandler({ flag_key: "test-flag" });

      expect(result.content[0].text).toContain(
        "Missing base_url configuration"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
