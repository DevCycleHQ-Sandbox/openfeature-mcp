# OpenFeature Android (Kotlin) SDK Installation Prompt

You are helping to install and configure the OpenFeature Android (Kotlin) SDK for client-side applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will demonstrate provider wiring with a placeholder provider. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Server-side apps (use a server SDK like Node.js, Go, Java, .NET, etc.)
- iOS (use the Swift SDK)

## Required Information

Before proceeding, confirm:

- [ ] Android SDK 21+ and JDK 11+
- [ ] Your build system (Gradle Kotlin DSL or Groovy)
- [ ] Which file is your entry point or initialization location (e.g., `Application`, `MainActivity`, or DI setup)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature Kotlin SDK? If not provided, this guide will use a placeholder `MyProvider` to demonstrate wiring.

References:

- OpenFeature Android/Kotlin SDK docs: [OpenFeature Android SDK](https://openfeature.dev/docs/reference/technologies/client/kotlin)

## Installation Steps

### 1. Add the OpenFeature Kotlin SDK dependency

Gradle (Groovy):

```groovy
dependencies {
    api 'dev.openfeature:kotlin-sdk:0.6.2'
}
```

Gradle (Kotlin DSL):

```kotlin
dependencies {
    api("dev.openfeature:kotlin-sdk:0.6.2")
}
```

### 2. Set up OpenFeature with a provider

Initialize OpenFeature early in app startup and set a provider. Replace `MyProvider()` with a real provider from the OpenFeature ecosystem when ready.

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// Example only: replace with a real provider
class MyProvider : dev.openfeature.kotlin.sdk.providers.FeatureProvider {
  override val hooks = emptyList<dev.openfeature.kotlin.sdk.hooks.Hook<*>>()
  override val metadata = dev.openfeature.kotlin.sdk.Metadata("my-provider")
}

fun initializeOpenFeature(scope: CoroutineScope) {
  scope.launch(Dispatchers.Default) {
    // Prefer waiting for readiness at startup
    OpenFeatureAPI.setProviderAndWait(MyProvider())

    // Create a client for evaluations
    val client = OpenFeatureAPI.getClient("my-app")

    // Example evaluation without additional context
    val enabled = client.getBooleanValue("new-message", default = false)
  }
}
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI
import dev.openfeature.kotlin.sdk.EvaluationContext
import dev.openfeature.kotlin.sdk.ImmutableContext
import dev.openfeature.kotlin.sdk.Value

// Set global (API) context (e.g., environment/region)
val apiCtx: EvaluationContext = ImmutableContext(
  targetingKey = null,
  attributes = mutableMapOf(
    "region" to Value.String("us-east-1")
  )
)
OpenFeatureAPI.setEvaluationContext(apiCtx)

// Create a per-invocation/request context (recommended)
val requestCtx: EvaluationContext = ImmutableContext(
  targetingKey = "user-123",
  attributes = mutableMapOf(
    "email" to Value.String("user@example.com"),
    "ip" to Value.String("203.0.113.1")
  )
)
```

### 4. Evaluate flags with the client

Get the client and evaluate feature flag values.

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI

val client = OpenFeatureAPI.getClient("my-app")

// Without additional context
val enabled = client.getBooleanValue("new-message", default = false)

// With per-request context (recommended)
val text = client.getStringValue("welcome-text", default = "Hello", context = requestCtx)
val limit = client.getIntegerValue("api-limit", default = 100, context = requestCtx)
val config = client.getObjectValue("ui-config", default = Value.String("{\"theme\":\"light\"}"), context = requestCtx)
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Tracking

Associate user actions with feature flag evaluations to support experimentation and analytics.

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI
import dev.openfeature.kotlin.sdk.TrackingEventDetails
import dev.openfeature.kotlin.sdk.ImmutableStructure
import dev.openfeature.kotlin.sdk.Value

val client = OpenFeatureAPI.getClient()

client.track(
  "checkout",
  TrackingEventDetails(
    499.99,
    ImmutableStructure(
      mapOf(
        "numberOfItems" to Value.Integer(4),
        "timeInCheckout" to Value.String("PT3M20S")
      )
    )
  )
)
```

Reference: [Tracking (OpenFeature Android/Kotlin SDK)](https://openfeature.dev/docs/reference/technologies/client/kotlin#tracking)

### Eventing

Observe provider events (e.g., readiness or configuration changes).

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

fun observeProviderEvents(scope: CoroutineScope) {
  scope.launch(Dispatchers.Default) {
    OpenFeatureAPI.observe().collect {
      // handle provider events
    }
  }
}
```

Reference: [Eventing (OpenFeature Android/Kotlin SDK)](https://openfeature.dev/docs/reference/technologies/client/kotlin#eventing)

### Shutdown

Gracefully clean up the registered provider on application shutdown.

```kotlin
import dev.openfeature.kotlin.sdk.OpenFeatureAPI

OpenFeatureAPI.shutdown()
```

Reference: [Shutdown (OpenFeature Android/Kotlin SDK)](https://openfeature.dev/docs/reference/technologies/client/kotlin#shutdown)

## Troubleshooting

- **Android/KMP versions**: Ensure Android SDK 21+ and JDK 11+ (or supported KMP targets).
- **Provider not ready / values are defaults**: Use `OpenFeatureAPI.setProviderAndWait(...)` and evaluate flags after readiness.
- **Context not applied**: Pass an `EvaluationContext` with a `targetingKey` for per-request evaluations; use global context for shared values.
- **Coroutines**: Initialize in a background dispatcher and avoid evaluations before readiness.

## Helpful resources

- OpenFeature Android/Kotlin SDK docs: [OpenFeature Android SDK](https://openfeature.dev/docs/reference/technologies/client/kotlin)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the placeholder provider and swap later.
- Add flags with `client.get<Type>Value` methods and wire app logic to feature decisions.
