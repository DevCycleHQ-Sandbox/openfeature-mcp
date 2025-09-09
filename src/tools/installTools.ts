import { z } from "zod";
import type { OpenFeatureMCPServerInstance, ToolResult } from "../types.js";
import { BUNDLED_PROMPTS, INSTALL_GUIDES } from "./promptsBundle.generated.js";

const InstallGuideArgsSchema = z.object({
  guide: z.enum(INSTALL_GUIDES),
});

export function registerInstallTools(
  serverInstance: OpenFeatureMCPServerInstance
): void {
  serverInstance.registerToolWithErrorHandling(
    "install_openfeature_sdk",
    {
      description:
        "Fetch and return OpenFeature install prompt Markdown by SDK type.",
      inputSchema: InstallGuideArgsSchema.shape,
    },
    async (args: unknown): Promise<ToolResult> => {
      const parsed = InstallGuideArgsSchema.safeParse(args);
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

      const prompt = BUNDLED_PROMPTS[parsed.data.guide];
      return {
        content: [
          {
            type: "text" as const,
            text: prompt,
          },
        ],
      };
    }
  );
}
