import { z } from "zod";
import type { OpenFeatureMCPServerInstance } from "../types";
import { BUNDLED_PROMPTS, INSTALL_GUIDES } from "./promptsBundle.generated";

const InstallGuideArgsSchema = z.object({
  guide: z.enum(INSTALL_GUIDES),
});

export function registerInstallTools(
  serverInstance: OpenFeatureMCPServerInstance
): void {
  serverInstance.registerToolWithErrorHandling(
    "install_openfeature_sdk",
    {
      description: `Fetch and return OpenFeature install prompt Markdown by guide name. Available guides: ${INSTALL_GUIDES.join(
        ", "
      )}. Input: { guide: string }`,
      inputSchema: InstallGuideArgsSchema.shape,
    },
    async (args: unknown) => {
      const validatedArgs = InstallGuideArgsSchema.parse(args);
      const prompt = BUNDLED_PROMPTS[validatedArgs.guide];

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
