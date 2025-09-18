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

function buildProviderPrompts(
  providers: ProviderName[],
  guide: z.infer<typeof InstallGuideSchema>
): string[] {
  const providerPrompts: string[] = [];

  for (const providerName of providers) {
    const providerDocLinks = PROVIDER_DOCS[providerName];
    if (!providerDocLinks) {
      throw new Error(
        `Provider '${providerName}' is not recognized. Available providers: ${Object.keys(
          PROVIDER_DOCS
        ).join(", ")}`
      );
    }

    console.error(`providerDocLinks: ${providerDocLinks}`);
    console.error(`guide: ${guide}`);
    const perGuideUrl = providerDocLinks[guide] || "";
    if (perGuideUrl) {
      providerPrompts.push(
        `- **${providerName}**: Read the provider documentation from this link: ${perGuideUrl} and evaluate the best way to install and configure this provider alongside the OpenFeature ${guide} SDK.`
      );
    } else {
      providerPrompts.push(
        `- **${providerName}**: No specific ${guide} documentation URL found. Search for "${providerName} OpenFeature ${guide}" installation documentation and provide installation instructions if available.`
      );
    }
  }

  return providerPrompts;
}

function processPromptWithProviders(
  prompt: string,
  providers: ProviderName[],
  guide: z.infer<typeof InstallGuideSchema>,
  providerPrompts: string[]
): string {
  // Marker-based injection: replace the block between markers when providers are specified
  const providersMarkerPattern =
    /<!--\s*PROVIDERS:START\s*-->[\s\S]*?<!--\s*PROVIDERS:END\s*-->/;

  const providerBlock = providerPrompts.length
    ? ["### Step 2: Provider installation", "", ...providerPrompts].join("\n")
    : "";

  const providersAppendix = providerPrompts.length
    ? `\n\n---\n\nProvider installation instructions for ${guide}:\n\n${providerPrompts.join(
        "\n"
      )}`
    : "";

  let finalText = prompt;

  if (providers.length > 0) {
    if (providersMarkerPattern.test(prompt)) {
      // Replace the marker block with provider content (without the markers)
      finalText = prompt.replace(providersMarkerPattern, providerBlock);
    } else {
      // Fallback: append to the end if no marker exists in the prompt
      finalText = `${prompt}${providersAppendix}`;
    }
  } else {
    // No providers specified: strip the marker block entirely
    finalText = prompt.replace(providersMarkerPattern, "");
  }

  return finalText;
}

export function registerInstallTools(
  serverInstance: OpenFeatureMCPServerInstance
): void {
  serverInstance.registerToolWithErrorHandling(
    "install_openfeature_sdk",
    {
      description: [
        "Fetch OpenFeature SDK installation instructions, and follow the instructions to install the OpenFeature SDK.",
        "If you are installing a provider, also fetches the provider installation instructions.",
        "Also includes documentation and examples for using OpenFeature SDK in your application.",
        "Choose the guide that matches the application's language/framework.",
      ].join(" "),
      annotations: {
        title: "Install OpenFeature SDK",
        readOnlyHint: true,
      },
      inputSchema: InstallGuideArgsSchema.shape,
    },
    async (args: unknown): Promise<ToolResult> => {
      const { guide, providers } = InstallGuideArgsSchema.parse(args);
      const prompt: string = BUNDLED_PROMPTS[guide];

      const providerPrompts = buildProviderPrompts(providers, guide);
      const finalText = processPromptWithProviders(
        prompt,
        providers,
        guide,
        providerPrompts
      );
      console.error(`install_openfeature_sdk prompt text: \n${finalText}`);

      return {
        content: [
          {
            type: "text" as const,
            text: finalText,
          },
        ],
      };
    }
  );
}
