# OpenFeature Go SDK Installation Prompt

You are helping to install and configure the OpenFeature Go SDK for server-side Go applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will use an example in-memory provider to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Browser-based apps (use client SDKs instead)
- Mobile apps (Android/iOS)

## Required Information

Before proceeding, confirm:

- [ ] Go 1.23+ is installed
- [ ] Go modules are enabled
- [ ] Which file is your application entry point (e.g., `cmd/server/main.go`)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature Go SDK? If not provided, this guide will use an example in-memory provider.

References:

- OpenFeature Go SDK docs: [OpenFeature Go SDK](https://openfeature.dev/docs/reference/technologies/server/go)

## Installation Steps

### 1. Install the OpenFeature Go SDK

Install the Go SDK module.

```bash
go get github.com/open-feature/go-sdk
```

### 2. Set up OpenFeature with the example in-memory provider

Initialize OpenFeature early in application startup and set the example in-memory provider.

```go
package main

import (
    "context"

    "github.com/open-feature/go-sdk/openfeature"
    "github.com/open-feature/go-sdk/openfeature/memprovider"
)

func main() {
    flagConfig := map[string]memprovider.InMemoryFlag{
        "new-message": {
            State:          memprovider.Enabled,
            Variants:       map[string]any{"on": true, "off": false},
            DefaultVariant: "on",
        },
    }

    // Replace with a real provider from: https://openfeature.dev/ecosystem/
    provider := memprovider.NewInMemoryProvider(flagConfig)

    // Prefer waiting for readiness at startup
    if err := openfeature.SetProviderAndWait(provider); err != nil {
        panic(err)
    }

    // Create a client for evaluations
    client := openfeature.NewClient("my-app")

    // Example evaluation without additional context
    _, _ = client.BooleanValue(context.Background(), "new-message", false, openfeature.EvaluationContext{})
}
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```go
import (
    "github.com/open-feature/go-sdk/openfeature"
)

// Set global context (e.g., environment/region)
openfeature.SetEvaluationContext(openfeature.NewTargetlessEvaluationContext(map[string]any{
    "region": "us-east-1",
}))

// Set client-level context
client := openfeature.NewClient("my-app")
client.SetEvaluationContext(openfeature.NewTargetlessEvaluationContext(map[string]any{
    "version": "1.4.6",
}))

// Create a per-invocation context (recommended)
evalCtx := openfeature.NewEvaluationContext(
    "user-123", // targetingKey
    map[string]any{
        "email": "user@example.com",
        "ip":    "203.0.113.1",
    },
)
```

### 4. Evaluate flags with the client

Create a client and evaluate feature flag values.

```go
import (
    "context"
    "github.com/open-feature/go-sdk/openfeature"
)

client := openfeature.NewClient("my-app")

// Without additional context
enabled, err := client.BooleanValue(
    context.Background(),
    "new-message",
    false,
    openfeature.EvaluationContext{},
)

// With per-request context (recommended)
requestCtx := openfeature.NewEvaluationContext(
    "user-123",
    map[string]any{
        "email": "user@example.com",
    },
)

text, _ := client.StringValue(context.Background(), "welcome-text", "Hello", requestCtx)
limit, _ := client.FloatValue(context.Background(), "api-limit", 100.0, requestCtx)
config, _ := client.ObjectValue(context.Background(), "ui-config", map[string]any{"theme": "light"}, requestCtx)
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Logging

Attach a logging hook to emit detailed evaluation logs using slog.

```go
import (
    "log/slog"
    "os"

    "github.com/open-feature/go-sdk/openfeature"
    "github.com/open-feature/go-sdk/openfeature/hooks"
    "github.com/open-feature/go-sdk/openfeature/memprovider"
)

// Register an in-memory provider (empty flags are fine)
_ = openfeature.SetProviderAndWait(memprovider.NewInMemoryProvider(map[string]memprovider.InMemoryFlag{}))

handler := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug})
logger := slog.New(handler)

loggingHook := hooks.NewLoggingHook(false, logger)
openfeature.AddHooks(loggingHook)
```

Reference: [Logging (OpenFeature Go SDK)](https://openfeature.dev/docs/reference/technologies/server/go#logging)

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics.

```go
import (
    "context"
    "github.com/open-feature/go-sdk/openfeature"
)

client := openfeature.NewClient("my-app")

// Evaluate a flag, then track an event related to its usage
enabled, _ := client.BooleanValue(context.Background(), "new-feature", false, openfeature.EvaluationContext{})
if enabled {
    client.Track(
        context.Background(),
        "new-feature-used",
        openfeature.EvaluationContext{},
        openfeature.NewTrackingEventDetails(1).Add("source", "example"),
    )
}
```

Reference: [Tracking (OpenFeature Go SDK)](https://openfeature.dev/docs/reference/technologies/server/go#tracking)

### Shutdown

Gracefully clean up all registered providers on application shutdown.

```go
import "github.com/open-feature/go-sdk/openfeature"

openfeature.Shutdown()
```

Reference: [Shutdown (OpenFeature Go SDK)](https://openfeature.dev/docs/reference/technologies/server/go#shutdown)

### Transaction Context Propagation

Set and propagate transaction-specific evaluation context (e.g., within an HTTP request) so it is applied automatically during evaluations.

```go
import (
    "context"
    "github.com/open-feature/go-sdk/openfeature"
)

// Set the transaction context
ctx := openfeature.WithTransactionContext(context.Background(), openfeature.EvaluationContext{})

// Retrieve or merge as needed
_ = openfeature.TransactionContext(ctx)
tCtx := openfeature.MergeTransactionContext(ctx, openfeature.EvaluationContext{})

// Use the transaction context in an evaluation
_, _ = openfeature.NewClient("my-app").BooleanValue(tCtx, "new-message", false, openfeature.EvaluationContext{})
```

Reference: [Transaction Context Propagation (OpenFeature Go SDK)](https://openfeature.dev/docs/reference/technologies/server/go#transaction-context-propagation)

## Troubleshooting

- **Go version**: Ensure Go 1.23+ is used per the SDK requirements.
- **Provider not ready / values are defaults**: Call `openfeature.SetProviderAndWait(...)` at startup and evaluate flags after initialization.
- **Context not applied**: Pass an evaluation context with a `targetingKey` for per-request evaluations; use `openfeature.SetEvaluationContext(...)` for global values.
- **Module issues**: Run `go mod tidy` to resolve dependency metadata and imports.

## Helpful resources

- OpenFeature Go SDK docs: [OpenFeature Go SDK](https://openfeature.dev/docs/reference/technologies/server/go)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example in-memory provider.
- Add flags with `client.<Type>` methods and wire business logic to feature decisions.
