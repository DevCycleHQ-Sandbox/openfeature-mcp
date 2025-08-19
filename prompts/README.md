# OpenFeature Install Prompts

This folder contains OpenFeature SDK installation guides that are bundled into the worker at build time.

## Structure

Each file should be a markdown file named after the SDK/technology:
- `javascript.md` - JavaScript/Web SDK guide
- `nodejs.md` - Node.js server SDK guide  
- `python.md` - Python SDK guide
- `java.md` - Java SDK guide
- etc.

## Adding New Guides

Create a new `.md` file in this folder with the guide content. The filename (without .md extension) will be the guide identifier.

## Building

After adding or updating prompts, run the build command to bundle them:

```bash
yarn build-prompts
```

This creates `src/tools/promptsBundle.generated.ts` with all the prompt content embedded.

## Available Scripts

- `yarn build-prompts` - Bundle prompts for deployment

## Usage in Worker

The worker serves install guides directly from the bundled prompts. Only guides present in this directory will be available in the worker.

To see available guides, visit `/guides` endpoint or check the `AVAILABLE_BUNDLED_GUIDES` in the generated bundle file.
