# OpenFeature Web SDK Installation Prompt

You are helping to install and configure the OpenFeature Web SDK for browser-based JavaScript/TypeScript applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, use an example `InMemoryProvider` to get started.

**Do not use this for:**

- React applications (use `react.md` instead)
- Node.js/server-side apps (use the Server JavaScript SDK guide)
- React Native or other non-browser runtimes

## Required Information

Before proceeding, confirm:

- [ ] Your package manager (npm, yarn, pnpm)
- [ ] Which file is your entry point (e.g., `src/main.ts`, `src/index.js`)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature Web SDK? If not provided, this guide will use an example `InMemoryProvider`.
- [ ] Do you want to combine multiple providers into a single client? If yes, plan to use the Multi-Provider (see Advanced section) and install `@openfeature/multi-provider-web`.

Reference: OpenFeature Web SDK docs [OpenFeature Web SDK](https://openfeature.dev/docs/reference/technologies/client/web).

## Installation Steps

### 1. Install the OpenFeature Web SDK

Install the core Web SDK package into your browser app.

```bash
# npm
npm install --save @openfeature/web-sdk

# yarn
yarn add @openfeature/web-sdk

# pnpm
pnpm add @openfeature/web-sdk
```

### 2. Set up OpenFeature with the example InMemoryProvider

Initialize OpenFeature early in app startup and set the example in-memory provider.

```javascript
import { OpenFeature, InMemoryProvider } from '@openfeature/web-sdk';

const flagConfig = {
  'new-message': {
    disabled: false,
    variants: {
      on: true,
      off: false,
    },
    defaultVariant: 'off',
    contextEvaluator: (context) => {
      if (context?.silly) {
        return 'on';
      }
      return 'off';
    },
  },
};

const inMemoryProvider = new InMemoryProvider(flagConfig);

// Optionally await readiness: await OpenFeature.setProviderAndWait(inMemoryProvider);
OpenFeature.setProvider(inMemoryProvider);
```

### 3. Evaluate flags with the client

Get the OpenFeature client and evaluate feature flag values.

```javascript
import { OpenFeature } from '@openfeature/web-sdk';

async function run() {
  const client = OpenFeature.getClient();

  const showNewMessage = await client.getBooleanValue('new-message', false);
  const text = await client.getStringValue('welcome-text', 'Hello');
  const limit = await client.getNumberValue('api-limit', 100);
  const config = await client.getObjectValue('ui-config', { theme: 'light' });

  if (showNewMessage) {
    console.log('Welcome to the new experience!');
  }
  console.log({ text, limit, config });
}

run();
```

### 4. Update the evaluation context

Provide user attributes via the evaluation context to enable user targeting of your feature flags.

```javascript
import { OpenFeature } from '@openfeature/web-sdk';

async function onLogin(userId, email) {
  await OpenFeature.setContext({ targetingKey: userId, email, authenticated: true });
}

async function onLogout() {
  await OpenFeature.setContext({ targetingKey: `anon-${Date.now()}`, anonymous: true });
}
```

## Optional advanced usage

### Multi-Provider (combine multiple providers)

If you want a single OpenFeature client that aggregates multiple providers, use the Multi-Provider. Compose providers in precedence order and pick a strategy (e.g., FirstMatch) to decide which provider's result is used.

- Spec: [Multi-Provider](https://openfeature.dev/specification/appendix-a/#multi-provider)
- Web package: `@openfeature/multi-provider-web` (see repo for examples)

Install:

```bash
# npm
npm install --save @openfeature/multi-provider-web

# yarn
yarn add @openfeature/multi-provider-web

# pnpm
pnpm add @openfeature/multi-provider-web
```

Example:

```javascript
import { OpenFeature, InMemoryProvider } from '@openfeature/web-sdk';
import { MultiProvider, FirstMatchStrategy } from '@openfeature/multi-provider-web';

const flagConfig = { /* ...same as above... */ };

const multiProvider = new MultiProvider(
  [
    { provider: new InMemoryProvider(flagConfig), name: 'in-memory' },
    // { provider: new SomeOtherProvider({ ... }), name: 'vendor' },
  ],
  new FirstMatchStrategy()
);

// Optionally await readiness: await OpenFeature.setProviderAndWait(multiProvider);
OpenFeature.setProvider(multiProvider);
```

### Logging

Override default console logging by providing a custom logger globally or per client.

```javascript
import { OpenFeature } from '@openfeature/web-sdk';

// Any object implementing the Logger interface is supported; console is acceptable
const logger = console;

// Set a global logger (applies to all clients unless overridden)
OpenFeature.setLogger(logger);

// Or set a client-specific logger
const client = OpenFeature.getClient();
client.setLogger(logger);
```

Reference: [Logging (OpenFeature Web SDK)](https://openfeature.dev/docs/reference/technologies/client/web/#logging)

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics. Evaluate a flag, then record relevant events using `client.track`.

```javascript
import { OpenFeature } from '@openfeature/web-sdk';

const client = OpenFeature.getClient();

// Evaluate a flag
const enabled = await client.getBooleanValue('new-feature', false);

// Use the feature, then track an event related to its usage
if (enabled) {
  useNewFeature();
  client.track('new-feature-used');
}

// Optionally include properties
client.track('cta-clicked', { cta: 'signup' });
```

Reference: [Tracking (OpenFeature Web SDK)](https://openfeature.dev/docs/reference/technologies/client/web/#tracking)

### Shutdown

Gracefully clean up all registered providers when your app is torn down. Call `OpenFeature.close()` during your app’s shutdown sequence.

Reference: [Shutdown (OpenFeature Web SDK)](https://openfeature.dev/docs/reference/technologies/client/web/#shutdown)

## Troubleshooting

- **Provider not ready / values are defaults**: Ensure you set the provider early in app startup and, if needed, `await OpenFeature.setProviderAndWait(...)` before evaluations.
- **Context not applied**: Ensure you call `OpenFeature.setContext(...)` with a `targetingKey` before evaluations that rely on targeting.
- **Imports**: Import from `@openfeature/web-sdk` for web/browser apps.
- **Bundling issues**: Ensure your bundler supports ESM.

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example `InMemoryProvider`.
- Add more flags and wire UI to feature decisions.
- Consider using the Multi-Provider to aggregate multiple sources.

## Helpful resources

- OpenFeature Web SDK docs: [OpenFeature Web SDK](https://openfeature.dev/docs/reference/technologies/client/web)

## Support

- Check the documentation linked above
- Ask questions in the OpenFeature community
