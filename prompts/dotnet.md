# OpenFeature .NET SDK Installation Prompt

You are helping to install and configure the OpenFeature .NET SDK for server-side .NET applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will use an example in-memory provider to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Browser-based apps (use client SDKs instead)
- Mobile apps (Android/iOS)

## Required Information

Before proceeding, confirm:

- [ ] .NET 8+ is installed (or .NET Framework 4.6.2+)
- [ ] Your project type (Console, ASP.NET Core, etc.) and entry point
- [ ] Do you want to install any provider(s) alongside the OpenFeature .NET SDK? If not provided, this guide will use an example in-memory provider.

References:

- OpenFeature .NET SDK docs: [OpenFeature .NET SDK](https://openfeature.dev/docs/reference/technologies/server/dotnet)

## Installation Steps

### 1. Install the OpenFeature .NET SDK

Initialize a project (if needed) and add the package.

```bash
dotnet new console
dotnet add package OpenFeature
```

### 2. Set up OpenFeature with the example in-memory provider

Initialize OpenFeature early in application startup and set the example in-memory provider. Replace with a real provider from the OpenFeature ecosystem when ready.

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using OpenFeature;
using OpenFeature.Model;

public class Program
{
  public static async Task Main()
  {
    try
    {
      // Example in-memory flag configuration
      var variants = new Dictionary<string, bool> {
        { "on", true },
        { "off", false }
      };

      var flags = new Dictionary<string, Flag<bool>> {
        { "new-message", new Flag<bool>(variants, "on") }
      };

      var provider = new InMemoryProvider(flags);

      // Replace with a real provider from: https://openfeature.dev/ecosystem/
      await Api.Instance.SetProviderAsync(provider);
    }
    catch (Exception ex)
    {
      // Handle initialization failure
      Console.Error.WriteLine(ex);
      return;
    }

    // Create a client for evaluations
    var client = Api.Instance.GetClient("my-app");

    // Example evaluation without additional context
    bool enabled = await client.GetBooleanValueAsync("new-message", false);
  }
}
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```csharp
using OpenFeature;
using OpenFeature.Model;

// Set global context (e.g., environment/region)
var apiCtx = EvaluationContext.Builder()
  .Set("region", "us-east-1")
  .Build();
Api.Instance.SetContext(apiCtx);

// Set client-level context
var client = Api.Instance.GetClient("my-app");
var clientCtx = EvaluationContext.Builder()
  .Set("version", "1.4.6")
  .Build();
client.SetContext(clientCtx);

// Create a per-invocation/request context (recommended)
var requestCtx = EvaluationContext.Builder()
  .Set("targetingKey", "user-123")
  .Set("email", "user@example.com")
  .Set("ip", "203.0.113.1")
  .Build();
bool flagValue = await client.GetBooleanValueAsync("some-flag", false, requestCtx);
```

### 4. Evaluate flags with the client

Create a client and evaluate feature flag values.

```csharp
using OpenFeature;
using OpenFeature.Model;
using System.Collections.Generic;

var client = Api.Instance.GetClient("my-app");

// Without additional context
bool enabled = await client.GetBooleanValueAsync("new-message", false);

// With per-request context (recommended)
string userId = "user-123";
var ctx = EvaluationContext.Builder()
  .Set("targetingKey", userId)
  .Set("email", "user@example.com")
  .Build();

string text = await client.GetStringValueAsync("welcome-text", "Hello", ctx);
int limit = await client.GetIntegerValueAsync("api-limit", 100, ctx);

// Object value (Structure)
var defaultStructure = new Structure(new Dictionary<string, Value>
{
  { "theme", new Value("light") }
});
Structure config = await client.GetObjectValueAsync("ui-config", defaultStructure, ctx);
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Dependency Injection (ASP.NET Core)

Register OpenFeature in the service container and configure an in-memory provider.

```csharp
// Program.cs (.NET 8)
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenFeature(options =>
{
  options.AddInMemoryProvider();
});

var app = builder.Build();
app.Run();
```

Reference: [Dependency Injection (OpenFeature .NET SDK)](https://openfeature.dev/docs/reference/technologies/server/dotnet#dependency-injection)

### Multi-Provider (combine multiple providers)

If you want a single OpenFeature client that aggregates multiple providers, use the multi-provider capabilities. Configure providers in precedence order and choose a strategy to select results.

Reference: [Multi-Provider (OpenFeature .NET SDK)](https://openfeature.dev/docs/reference/technologies/server/dotnet#multi-provider)

### Logging

Attach a logging hook (Microsoft.Extensions.Logging) to log detailed evaluation information.

```csharp
using Microsoft.Extensions.Logging;
using OpenFeature;
using OpenFeature.Hooks;

using var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
var logger = loggerFactory.CreateLogger("Program");

var client = Api.Instance.GetClient();
client.AddHooks(new LoggingHook(logger));
```

Reference: [Logging (OpenFeature .NET SDK)](https://openfeature.dev/docs/reference/technologies/server/dotnet#logging)

### Shutdown

Gracefully clean up all registered providers on application shutdown.

```csharp
using OpenFeature;

Api.Instance.Shutdown();
```

Reference: [Shutdown (OpenFeature .NET SDK)](https://openfeature.dev/docs/reference/technologies/server/dotnet#shutdown)

## Troubleshooting

- **.NET version**: Ensure .NET 8+ (or .NET Framework 4.6.2+) per SDK requirements.
- **Provider not ready / values are defaults**: Await `SetProviderAsync(...)` at startup and evaluate flags after initialization.
- **Context not applied**: Pass an `EvaluationContext` with a `targetingKey` for per-request evaluations; use global/client setters for shared values.
- **NuGet issues**: Clear cache (`dotnet nuget locals all --clear`) and ensure package sources and versions are compatible.

## Helpful resources

- OpenFeature .NET SDK docs: [OpenFeature .NET SDK](https://openfeature.dev/docs/reference/technologies/server/dotnet)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example in-memory provider.
- Add flags with `client.Get<Type>ValueAsync` methods and wire business logic to feature decisions.
- Consider using dependency injection and multi-provider for advanced scenarios.
