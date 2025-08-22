# OpenFeature NestJS SDK Installation Prompt

You are helping to install and configure the OpenFeature NestJS SDK for server-side NestJS applications. This guide focuses on installing and wiring up the OpenFeature SDK via the NestJS integration. If no provider is specified, default to the simple `InMemoryProvider` to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Plain Node.js applications (use `nodejs.md` instead)
- Client-side applications (use `javascript.md` or `react.md`)
- Non-NestJS server frameworks (use `nodejs.md` instead)

## Required Information

Before proceeding, confirm:

- [ ] Node.js 20+ is installed
- [ ] NestJS 8+ is used in this project
- [ ] Your package manager (npm, yarn, pnpm)
- [ ] Do you want to install any provider(s) alongside the OpenFeature NestJS SDK? If not provided, this guide will use an example `InMemoryProvider`.
- [ ] Do you want to combine multiple providers into a single client? If yes, plan to use the Multi-Provider (see Advanced section) and install `@openfeature/multi-provider`.

References:

- OpenFeature NestJS SDK docs: [OpenFeature NestJS SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/nestjs)

## Installation Steps

### 1. Install the OpenFeature NestJS SDK

Install the NestJS integration for the OpenFeature Server SDK.

```bash
# npm
npm install --save @openfeature/nestjs-sdk

# yarn (install peer deps explicitly)
yarn add @openfeature/nestjs-sdk @openfeature/server-sdk @openfeature/core

# pnpm (install peer deps explicitly)
pnpm add @openfeature/nestjs-sdk @openfeature/server-sdk @openfeature/core
```

Peer dependencies (already present in most NestJS apps): `@nestjs/common`, `@nestjs/core`, and `rxjs`.

### 2. Set up OpenFeature with the example InMemoryProvider

Register the OpenFeature module in your root `AppModule` and configure an example in-memory flag to verify the wiring.

```typescript
import { Module } from '@nestjs/common';
import { OpenFeatureModule, InMemoryProvider } from '@openfeature/nestjs-sdk';

@Module({
  imports: [
    OpenFeatureModule.forRoot({
      defaultProvider: new InMemoryProvider({
        'new-message': {
          disabled: false,
          variants: { on: true, off: false },
          defaultVariant: 'on',
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Provide evaluation context (request-scoped)

Configure a request-scoped evaluation context so targeting works per user/request. Use the `contextFactory` option.

```typescript
import { Module } from '@nestjs/common';
import { OpenFeatureModule, InMemoryProvider } from '@openfeature/nestjs-sdk';
import type { Request } from 'express';

@Module({
  imports: [
    OpenFeatureModule.forRoot({
      defaultProvider: new InMemoryProvider({}),
      contextFactory: (req: Request) => ({
        targetingKey: (req.headers['x-user-id'] as string) ?? 'anonymous',
        email: req.headers['x-user-email'] as string | undefined,
        ipAddress: req.ip,
      }),
      // useGlobalInterceptor: true, // default enables context for all routes
    }),
  ],
})
export class AppModule {}
```

### 4. Evaluate flags in controllers/services

Inject a client using NestJS DI and evaluate feature flags.

```typescript
import { Injectable } from '@nestjs/common';
import { OpenFeatureClient, Client } from '@openfeature/nestjs-sdk';

@Injectable()
export class FeatureFlagsService {
  constructor(@OpenFeatureClient() private readonly client: Client) {}

  async isNewMessageEnabled(): Promise<boolean> {
    return this.client.getBooleanValue('new-message', false);
  }
}
```

Or inject evaluation details into route handlers using decorators.

```typescript
import { Controller, Get } from '@nestjs/common';
import { BooleanFeatureFlag, EvaluationDetails } from '@openfeature/nestjs-sdk';
import { map, Observable } from 'rxjs';

@Controller('features')
export class FeaturesController {
  @Get('welcome')
  async welcome(
    @BooleanFeatureFlag({ flagKey: 'new-message', defaultValue: false })
    feature: Observable<EvaluationDetails<boolean>>,
  ) {
    return feature.pipe(map((d) => (d.value ? 'Welcome to the new experience!' : 'Welcome!')));
  }
}
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Multi-Provider (combine multiple providers)

If you want a single OpenFeature client that aggregates multiple providers, use the Multi-Provider. Compose providers in precedence order, then set it as the default provider in the NestJS module.

```typescript
import { Module } from '@nestjs/common';
import { OpenFeatureModule } from '@openfeature/nestjs-sdk';
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';
import { MultiProvider, FirstMatchStrategy } from '@openfeature/multi-provider';

const multiProvider = new MultiProvider(
  [
    { provider: new InMemoryProvider({ /*...flags...*/ }), name: 'in-memory' },
    // { provider: new SomeOtherProvider({ ... }), name: 'vendor' },
  ],
  new FirstMatchStrategy(),
);

@Module({
  imports: [
    OpenFeatureModule.forRoot({
      defaultProvider: multiProvider,
    }),
  ],
})
export class AppModule {}
```

### Logging

Override default console logging by providing a custom logger globally or per client.

```typescript
import { OpenFeature } from '@openfeature/server-sdk';

const logger = console;
OpenFeature.setLogger(logger);

// Or per-client
const client = OpenFeature.getClient();
client.setLogger(logger);
```

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics.

```typescript
import { Injectable } from '@nestjs/common';
import { OpenFeatureClient, Client } from '@openfeature/nestjs-sdk';

@Injectable()
export class TrackingService {
  constructor(@OpenFeatureClient() private readonly client: Client) {}

  async trackUsage(): Promise<void> {
    const enabled = await this.client.getBooleanValue('new-feature', false);
    if (enabled) {
      // ... use feature
      this.client.track('new-feature-used');
    }
    this.client.track('checkout-started', { cartValue: 123.45, currency: 'USD' });
  }
}
```

### Shutdown

Gracefully clean up all registered providers on application shutdown (e.g., in a NestJS lifecycle hook).

```typescript
import { OpenFeature } from '@openfeature/server-sdk';

await OpenFeature.close();
```

## Troubleshooting

- **Node.js version**: Ensure Node.js 20+ is used per the SDK requirements.
- **Provider not ready / values are defaults**: Configure the provider during module initialization and evaluate flags after module setup completes.
- **Context not applied**: Provide a `contextFactory` (with a `targetingKey`) or pass an explicit evaluation context when calling `get*Value` methods.
- **Peer dependency with yarn/pnpm**: Install `@openfeature/core` alongside `@openfeature/server-sdk` when using yarn or pnpm.

## Helpful resources

- OpenFeature NestJS SDK docs: [OpenFeature NestJS SDK](https://openfeature.dev/docs/reference/technologies/server/javascript/nestjs)
- Multi-Provider spec: [Multi-Provider](https://openfeature.dev/specification/appendix-a/#multi-provider)
- Multi-Provider (server) contrib: [js-sdk-contrib multi-provider](https://github.com/open-feature/js-sdk-contrib/tree/main/libs/providers/multi-provider)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example `InMemoryProvider`.
- Add flags with `client.get<type>Value` methods or route handlers using decorators and wire business logic to feature decisions.
- Consider using the Multi-Provider to aggregate multiple providers.
- Consider tracking events with `client.track`.
