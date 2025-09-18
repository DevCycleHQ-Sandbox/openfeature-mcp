import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PROVIDER_DOCS } from "./tools/providersBundle.generated.js";
import type { ToolResult } from "./types.js";

export function registerProviderResources(server: McpServer): void {
  // Register provider documentation links as MCP resources (HTTPS URIs)
  try {
    for (const [providerName, guides] of Object.entries(PROVIDER_DOCS)) {
      for (const [guide, href] of Object.entries(guides)) {
        const uri = href;
        const name = `of-provider-doc:${providerName}:${guide}`;

        server.registerResource(
          name,
          uri,
          {
            title: `${providerName} ${guide} OpenFeature Provider Documentation`,
            description: `Documentation link for ${providerName} ${guide} OpenFeature Provider.`,
          },
          async () => {
            try {
              const res = await fetch(uri);
              if (!res.ok) {
                return {
                  contents: [
                    {
                      uri,
                      mimeType: "text/plain",
                      text: `Failed to fetch provider docs: ${res.status} ${res.statusText}`,
                    },
                  ],
                };
              }
              const mime = res.headers.get("content-type") || "text/html";
              const text = await res.text();
              return {
                contents: [
                  {
                    uri,
                    mimeType: mime,
                    text,
                  },
                ],
              };
            } catch (err) {
              return {
                contents: [
                  {
                    uri,
                    mimeType: "text/plain",
                    text: `Error fetching provider docs: ${String(err)}`,
                  },
                ],
              };
            }
          }
        );
      }
    }
  } catch (e) {
    console.error("Failed to register provider resources", e);
  }
}

export function buildProviderResourceLinks(
  providers: readonly string[],
  guide: string
): ToolResult["content"] {
  return providers
    .map((providerName) => ({
      providerName,
      href: (
        PROVIDER_DOCS as Record<string, Record<string, string> | undefined>
      )[providerName]?.[guide] as string | undefined,
    }))
    .filter((x) => !!x.href)
    .map(({ providerName, href }) => ({
      type: "resource_link" as const,
      uri: href as string,
      name: `of-provider-doc:${providerName}:${guide}`,
      title: `${providerName} ${guide} OpenFeature Provider Documentation`,
      description: `Documentation link for ${providerName} ${guide} OpenFeature Provider.`,
      mimeType: "text/html",
    }));
}

// Web resource templates not required when registering concrete HTTPS provider docs above.
