# OpenFeature Node.js SDK Installation Prompt

You are helping to install and configure the OpenFeature Node.js SDK for server-side JavaScript/TypeScript applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, use an example `InMemoryProvider` to get started.

**Do not use this for:**

- Browser-based apps (use `javascript.md` instead)
- React applications (use `react.md` instead)
- React Native
- other non-Node runtimes (like Bun / Cloudflare Workers / etc) may work, but are not officially supported

## Required Information

Before proceeding, confirm:

- [ ] Node.js 18+ is installed
- [ ] Your package manager (npm, yarn, pnpm)
- [ ] Which file is your server entry point (e.g., `src/server.ts`, `src/index.js`)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature Node.js SDK? If not provided, this guide will use an example `InMemoryProvider`.
- [ ] Do you want to combine multiple providers into a single client? If yes, plan to use the Multi-Provider (see Advanced section) and install `@openfeature/multi-provider`.

References:

- OpenFeature Node.js SDK docs: [OpenFeature Node.js SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/)

## Installation Steps

### 1. Install the OpenFeature Node.js SDK

Install the server SDK package for Node.js.

```bash
# npm
npm install --save @openfeature/server-sdk

# yarn (install peer dep explicitly)
yarn add @openfeature/server-sdk @openfeature/core

# pnpm (install peer dep explicitly)
pnpm add @openfeature/server-sdk @openfeature/core
```

### 2. Set up OpenFeature with the example InMemoryProvider

Initialize OpenFeature early in server startup and set the example in-memory provider.

```javascript
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

const flagConfig = {
  'new-message': {
    disabled: false,
    variants: {
      on: true,
      off: false,
    },
    defaultVariant: 'off',
    contextEvaluator: (context) => {
      if (context?.plan === 'premium') {
        return 'on';
      }
      return 'off';
    },
  },
};

const inMemoryProvider = new InMemoryProvider(flagConfig);

// Prefer awaiting readiness at startup
await OpenFeature.setProviderAndWait(inMemoryProvider);
```

### 3. Evaluate flags with the client

Create a client and evaluate feature flag values.

```javascript
import { OpenFeature } from '@openfeature/server-sdk';

const client = OpenFeature.getClient();

// Without context
const enabled = await client.getBooleanValue('new-message', false);

// With per-request context (recommended)
const requestContext = {
  targetingKey: req.user?.id || 'anonymous',
  email: req.user?.email,
};

const text = await client.getStringValue('welcome-text', 'Hello', requestContext);
const limit = await client.getNumberValue('api-limit', 100, requestContext);
const config = await client.getObjectValue('ui-config', { theme: 'light' }, requestContext);
```

### 4. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable user targeting of your feature flags.

```javascript
import { OpenFeature, AsyncLocalStorageTransactionContextPropagator } from '@openfeature/server-sdk';

// Set global context (e.g., environment/region)
OpenFeature.setContext({ region: process.env.REGION || 'us-east-1' });

// Optional: Enable transaction context propagation (Express-style)
OpenFeature.setTransactionContextPropagator(new AsyncLocalStorageTransactionContextPropagator());

app.use((req, res, next) => {
  const context = {
    targetingKey: req.user?.id || 'anonymous',
    email: req.user?.email,
    ipAddress: req.get?.('x-forwarded-for') || req.ip,
  };

  // Apply request-scoped context to subsequent flag evaluations
  OpenFeature.setTransactionContext(context, () => {
    next();
  });
});
```

## Optional advanced usage

### Multi-Provider (combine multiple providers)

If you want a single OpenFeature client that aggregates multiple providers, use the Multi-Provider. Compose providers in precedence order and pick a strategy (e.g., FirstMatch) to decide which provider's result is used.

- Spec: [Multi-Provider](https://openfeature.dev/specification/appendix-a/#multi-provider)
- Server package: `@openfeature/multi-provider` ([reference](https://github.com/open-feature/js-sdk-contrib/tree/main/libs/providers/multi-provider))

Install:

```bash
# npm
npm install --save @openfeature/multi-provider

# yarn
yarn add @openfeature/multi-provider

# pnpm
pnpm add @openfeature/multi-provider
```

Example:

```javascript
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';
import { MultiProvider, FirstMatchStrategy } from '@openfeature/multi-provider';

const multiProvider = new MultiProvider(
  [
    { provider: new InMemoryProvider({ /*...flags...*/ }), name: 'in-memory' },
    // { provider: new SomeOtherProvider({ ... }), name: 'vendor' },
  ],
  new FirstMatchStrategy()
);

await OpenFeature.setProviderAndWait(multiProvider);
```

### Logging

Override default console logging by providing a custom logger globally or per client.

```javascript
import { OpenFeature } from '@openfeature/server-sdk';
// If using TypeScript, you can type the logger: import type { Logger } from '@openfeature/server-sdk'

// Any object implementing the Logger interface is supported; console is acceptable
const logger = console;

// Set a global logger (applies to all clients unless overridden)
OpenFeature.setLogger(logger);

// Or set a client-specific logger
const client = OpenFeature.getClient();
client.setLogger(logger);
```

Reference: [Logging (OpenFeature Node.js SDK)](https://openfeature.dev/docs/reference/technologies/server/javascript/#logging)

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics. Evaluate a flag, then record relevant events using `client.track`.

```javascript
import { OpenFeature } from '@openfeature/server-sdk';

const client = OpenFeature.getClient();

// Evaluate a flag
const enabled = await client.getBooleanValue('new-feature', false);

// Use the feature, then track an event related to its usage
if (enabled) {
  useNewFeature();
  client.track('new-feature-used');
}

// Optionally include properties
client.track('checkout-started', { cartValue: 123.45, currency: 'USD' });
```

Reference: [Tracking (OpenFeature Node.js SDK)](https://openfeature.dev/docs/reference/technologies/server/javascript/#tracking)

### Shutdown

Gracefully clean up all registered providers on application shutdown. Call `OpenFeature.close()` during your shutdown sequence (e.g., on process signals or server close).

Reference: [Shutdown (OpenFeature Node.js SDK)](https://openfeature.dev/docs/reference/technologies/server/javascript/#shutdown)

## Troubleshooting

- **Node.js version**: Ensure Node.js 18+ is used per the SDK requirements.
- **Provider not ready / values are defaults**: Call `await OpenFeature.setProviderAndWait(...)` at startup and evaluate flags after initialization.
- **Context not applied**: Pass an evaluation context with a `targetingKey` for per-request evaluations; use `OpenFeature.setContext(...)` for global values.
- **Peer dependency with yarn/pnpm**: Install `@openfeature/core` alongside `@openfeature/server-sdk` when using yarn or pnpm.

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example `InMemoryProvider`.
- Add more flags and wire business logic to feature decisions.
- Consider using the Multi-Provider to aggregate multiple sources.

## Helpful resources

- OpenFeature Node.js SDK docs: [OpenFeature Node.js SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/)
- Multi-Provider spec: [Multi-Provider](https://openfeature.dev/specification/appendix-a/#multi-provider)
- Multi-Provider (server) contrib: [js-sdk-contrib multi-provider](https://github.com/open-feature/js-sdk-contrib/tree/main/libs/providers/multi-provider)

## Support

- Check the documentation linked above
- Ask questions in the OpenFeature community


