# OpenFeature Java SDK Installation Prompt

You are helping to install and configure the OpenFeature Java SDK for server-side Java applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will use an example in-memory provider to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Browser-based apps (use client SDKs instead)
- Android/mobile apps

## Required Information

Before proceeding, confirm:

- [ ] Java 11+ is installed
- [ ] Your build tool (Maven or Gradle)
- [ ] Which file/module is your application entry point (e.g., `src/main/java/.../Main.java`, Spring Boot app)
- [ ] Do you want to install any provider(s) alongside the OpenFeature Java SDK? If not provided, this guide will use an example in-memory provider.

References:

- OpenFeature Java SDK docs: [OpenFeature Java SDK](https://openfeature.dev/docs/reference/technologies/server/java)

## Installation Steps

### 1. Add the OpenFeature Java SDK dependency

Add the SDK dependency to your project.

Maven:

```xml
<dependency>
  <groupId>dev.openfeature</groupId>
  <artifactId>sdk</artifactId>
  <version>1.17.0</version>
</dependency>
```

Gradle:

```groovy
dependencies {
  implementation 'dev.openfeature:sdk:1.17.0'
}
```

### 2. Set up OpenFeature with the example in-memory provider

Initialize OpenFeature early in application startup and set the example in-memory provider. Replace with a real provider from the OpenFeature ecosystem when ready.

```java
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.Flag;
import dev.openfeature.sdk.OpenFeatureAPI;
// If needed, add the in-memory provider dependency and import it accordingly.
import dev.openfeature.sdk.providers.memory.InMemoryProvider; 

import java.util.HashMap;
import java.util.Map;

public class Main {
  public static void main(String[] args) {
    // InMemoryProvider as example provider
    Map<String, Flag<?>> flags = new HashMap<>();
    flags.put("new-message", Flag.builder()
        .variant("on", true)
        .variant("off", false)
        .defaultVariant("on")
        .build());
    InMemoryProvider provider = new InMemoryProvider(flags);

    OpenFeatureAPI api = OpenFeatureAPI.getInstance();
    try {
      api.setProviderAndWait(provider);
    } catch (Exception e) {
      throw new RuntimeException("Failed to initialize provider", e);
    }

    Client client = api.getClient("my-app");

    boolean enabled = client.getBooleanValue("new-message", false);
  }
}
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```java
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.EvaluationContext;
import dev.openfeature.sdk.ImmutableContext;
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.sdk.Value;

import java.util.HashMap;
import java.util.Map;

OpenFeatureAPI api = OpenFeatureAPI.getInstance();

// Set global context (e.g., environment/region)
Map<String, Value> apiAttrs = new HashMap<>();
apiAttrs.put("region", new Value("us-east-1"));
api.setEvaluationContext(new ImmutableContext(apiAttrs));

// Set client-level context
Map<String, Value> clientAttrs = new HashMap<>();
clientAttrs.put("version", new Value("1.4.6"));
Client client = api.getClient("my-app");
client.setEvaluationContext(new ImmutableContext(clientAttrs));

// Create a per-invocation/request context (recommended)
Map<String, Value> reqAttrs = new HashMap<>();
reqAttrs.put("email", new Value("user@example.com"));
reqAttrs.put("ip", new Value("203.0.113.1"));
String targetingKey = "user-123"; // unique user or session identifier
EvaluationContext requestCtx = new ImmutableContext(targetingKey, reqAttrs);
```

### 4. Evaluate flags with the client

Create a client and evaluate feature flag values.

```java
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.sdk.Structure;
import dev.openfeature.sdk.Value;

Client client = OpenFeatureAPI.getInstance().getClient("my-app");

// Without additional context
boolean enabled = client.getBooleanValue("new-message", false);

// With per-request context (recommended)
String userId = "user-123";
Map<String, Value> attrs = new HashMap<>();
attrs.put("email", new Value("user@example.com"));
EvaluationContext ctx = new ImmutableContext(userId, attrs);

String text = client.getStringValue("welcome-text", "Hello", ctx);
int limit = client.getIntegerValue("api-limit", 100, ctx);

// Object value (Structure)
Map<String, Value> defaultMap = new HashMap<>();
defaultMap.put("theme", new Value("light"));
Structure defaultValue = new Structure(defaultMap);
Value obj = client.getObjectValue("ui-config", defaultValue, ctx);
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Logging

Attach a `LoggingHook` (SLF4J) to log detailed evaluation information at debug level.

```java
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.contrib.hooks.logging.LoggingHook; // package may vary

OpenFeatureAPI api = OpenFeatureAPI.getInstance();
api.addHooks(new LoggingHook());
```

Reference: [Logging (OpenFeature Java SDK)](https://openfeature.dev/docs/reference/technologies/server/java#logging)

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics.

```java
import dev.openfeature.sdk.MutableTrackingEventDetails;
import dev.openfeature.sdk.OpenFeatureAPI;

OpenFeatureAPI api = OpenFeatureAPI.getInstance();
api.getClient().track("visited-promo-page", new MutableTrackingEventDetails(99.77).add("currency", "USD"));
```

Reference: [Tracking (OpenFeature Java SDK)](https://openfeature.dev/docs/reference/technologies/server/java#tracking)

### Shutdown

Gracefully clean up all registered providers on application shutdown.

```java
import dev.openfeature.sdk.OpenFeatureAPI;

OpenFeatureAPI.getInstance().shutdown();
```

Reference: [Shutdown (OpenFeature Java SDK)](https://openfeature.dev/docs/reference/technologies/server/java#shutdown)

### Transaction Context Propagation

Set and propagate transaction-specific evaluation context so it is applied automatically during evaluations.

```java
import dev.openfeature.sdk.*;
import dev.openfeature.sdk.contrib.transaction.ThreadLocalTransactionContextPropagator; // example propagator

// Register a ThreadLocal transaction context propagator
OpenFeatureAPI.getInstance().setTransactionContextPropagator(new ThreadLocalTransactionContextPropagator());

// Add userId (or other data) to the transaction context
Map<String, Value> txAttrs = new HashMap<>();
txAttrs.put("userId", new Value("user-123"));
EvaluationContext txCtx = new ImmutableContext(txAttrs);
OpenFeatureAPI.getInstance().setTransactionContext(txCtx);
```

Reference: [Transaction Context Propagation (OpenFeature Java SDK)](https://openfeature.dev/docs/reference/technologies/server/java#transaction-context-propagation)

## Troubleshooting

- **Java version**: Ensure Java 11+ is used per the SDK requirements.
- **Provider not ready / values are defaults**: Call `setProviderAndWait(...)` at startup and evaluate flags after initialization.
- **Context not applied**: Pass an `EvaluationContext` with a targeting key for per-request evaluations; use global/client context setters for shared values.
- **Build/dependency issues**: Verify repository access, sync dependencies, and ensure versions are compatible (e.g., Maven/Gradle refresh).

## Helpful resources

- OpenFeature Java SDK docs: [OpenFeature Java SDK](https://openfeature.dev/docs/reference/technologies/server/java)
- OpenFeature ecosystem providers: [Ecosystem](https://openfeature.dev/ecosystem/)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example in-memory provider.
- Add flags with `client.get<Type>Value` methods and wire business logic to feature decisions.
