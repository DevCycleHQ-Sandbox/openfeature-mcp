import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  providerSchema,
  PROVIDERS,
  PROVIDER_DOCS,
  type ProviderName,
} from "./tools/providersBundle.generated.js";
import {
  InstallGuideSchema,
  INSTALL_GUIDES,
  type InstallGuide,
} from "./tools/promptsBundle.generated.js";
import type { ToolResult } from "./types.js";
import { z } from "zod";

export const ENABLE_RESOURCE_LINKS =
  process.env.ENABLE_RESOURCE_LINKS &&
  (process.env.ENABLE_RESOURCE_LINKS === "true" ||
    process.env.ENABLE_RESOURCE_LINKS === "1");

const TemplateVarsSchema = z.object({
  provider: providerSchema,
  language: InstallGuideSchema,
});

function resourceName(providerName: string, guide: string): string {
  return `of-provider-doc:${providerName}:${guide}`;
}

export function registerProviderResources(server: McpServer): void {
  if (!ENABLE_RESOURCE_LINKS) {
    return;
  }

  // Register a single Resource Template for provider docs: openfeature+doc://{provider}/{language}
  const template = new ResourceTemplate(
    "openfeature+doc://{provider}/{language}",
    {
      list: undefined,
      complete: {
        provider: async (value: string) =>
          PROVIDERS.filter((p) =>
            p.toLowerCase().includes((value || "").toLowerCase())
          ),
        language: async (value: string) =>
          INSTALL_GUIDES.filter((l) =>
            l.toLowerCase().includes((value || "").toLowerCase())
          ),
      },
    }
  );

  server.registerResource(
    "openfeature_provider_doc",
    template,
    {
      title: "OpenFeature Provider Docs",
      description:
        "Template for OpenFeature provider docs by provider and language.",
    },
    (_uri, variables) => {
      const { provider, language } = TemplateVarsSchema.parse({
        provider: variables.provider,
        language: variables.language,
      });

      const href = PROVIDER_DOCS[provider]?.[language];
      if (!href) {
        return {
          contents: [
            {
              uri: `openfeature+doc://${provider}/${language}`,
              mimeType: "text/plain",
              text: `No documentation mapping found for provider='${provider}' language='${language}'.`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: href,
            mimeType: "text/uri-list",
            text: href,
          },
        ],
      };
    }
  );
}

export function buildProviderResourceLinks(
  providers: readonly ProviderName[],
  guide: InstallGuide
): ToolResult["content"] {
  if (!ENABLE_RESOURCE_LINKS) {
    return [];
  }

  return providers
    .filter((providerName) => !!PROVIDER_DOCS[providerName]?.[guide])
    .map((providerName) => ({
      type: "resource_link",
      uri: `openfeature+doc://${providerName}/${guide}`,
      name: resourceName(providerName, guide),
      title: `${providerName} ${guide} OpenFeature Provider Documentation`,
    }));
}
