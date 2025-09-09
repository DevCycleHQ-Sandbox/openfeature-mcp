import { z } from "zod";
import type { OpenFeatureMCPServerInstance, ToolResult } from "../types.js";
import { BUNDLED_PROMPTS, INSTALL_GUIDES } from "./promptsBundle.generated.js";
import { PROVIDER_SUPPORT, providersSchema } from "./providersBundle.generated.js";

const InstallGuideArgsSchema = z.object({
  guide: z.enum(INSTALL_GUIDES),
  providers: providersSchema.optional().default([]),
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

      const guide = parsed.data.guide;
      const providers: string[] = parsed.data.providers ?? [];
      const prompt: string = BUNDLED_PROMPTS[guide as (typeof INSTALL_GUIDES)[number]];

      // Build provider-specific notes
      const providerNotes: string[] = [];
      for (const providerName of providers) {
        const support = PROVIDER_SUPPORT[providerName as string];
        if (!support) {
          providerNotes.push(`- ${providerName}: Not recognized.`);
          continue;
        }
        const supportsGuide = support.supportedGuides.includes(guide as (typeof INSTALL_GUIDES)[number]);
        if (supportsGuide) {
          const url = support.docsUrl || "";
          const link = url ? ` (${url})` : "";
          providerNotes.push(`- ${providerName}: Supported for ${guide}.${link}`);
        } else {
          providerNotes.push(`- ${providerName}: Not listed as supporting ${guide}.`);
        }
      }

      const providersAppendix = providerNotes.length
        ? `\n\n---\n\nProvider installation references for ${guide}:\n\n${providerNotes.join("\n")}`
        : "";
      return {
        content: [
          {
            type: "text" as const,
            text: `${prompt}${providersAppendix}`,
          },
        ],
      };
    }
  );
}
