import { z } from "zod";
import type { OpenFeatureMCPServerInstance, ToolResult } from "../types.js";
import {
  BUNDLED_PROMPTS,
  InstallGuideSchema,
} from "./promptsBundle.generated.js";
import {
  PROVIDER_DOCS,
  providersSchema,
  type ProviderName,
} from "./providersBundle.generated.js";

const InstallGuideArgsSchema = z.object({
  guide: InstallGuideSchema,
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
      const { guide, providers } = InstallGuideArgsSchema.parse(args);
      const prompt: string = BUNDLED_PROMPTS[guide];

      // Build provider-specific notes
      const providerNotes: string[] = [];

      for (const providerName of providers) {
        const providerDocLinks = PROVIDER_DOCS[providerName];
        if (!providerDocLinks) {
          throw new Error(
            `Provider '${providerName}' is not recognized. Available providers: ${Object.keys(
              PROVIDER_DOCS
            ).join(", ")}`
          );
        }

        const perGuideUrl = providerDocLinks[guide] || "";
        if (perGuideUrl) {
          providerNotes.push(
            `- **${providerName}**: Fetch the provider installation instructions from this link: ${perGuideUrl}. Follow the documentation to install and configure this provider alongside the OpenFeature ${guide} SDK.`
          );
        } else {
          providerNotes.push(
            `- **${providerName}**: No specific ${guide} documentation URL found. Search for "${providerName} OpenFeature ${guide}" installation documentation and provide installation instructions if available.`
          );
        }
      }

      const providersAppendix = providerNotes.length
        ? `\n\n---\n\nProvider installation instructions for ${guide}:\n\n${providerNotes.join(
            "\n"
          )}`
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
