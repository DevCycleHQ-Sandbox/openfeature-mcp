# OpenFeature iOS SDK Installation Prompt

You are helping to install and configure the OpenFeature iOS SDK for client-side Swift applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will demonstrate provider wiring with a placeholder provider. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Server-side apps (use a server SDK like Node.js, Go, Java, .NET, etc.)
- Android (use the Kotlin SDK)

## Required Information

Before proceeding, confirm:

- [ ] Apple platform targets: iOS 14+, macOS 11+, watchOS 7+, tvOS 14+
- [ ] Swift 5.5+ and Xcode with SPM or CocoaPods
- [ ] Where to initialize (e.g., `AppDelegate`, `SceneDelegate`, or app bootstrap)
- [ ] Do you want to install any provider(s) alongside the OpenFeature iOS SDK? If not provided, this guide will use a placeholder provider.

References:

- OpenFeature iOS (Swift) SDK docs: [OpenFeature iOS SDK](https://openfeature.dev/docs/reference/technologies/client/swift)

## Installation Steps

### 1. Install the OpenFeature iOS SDK

Swift Package Manager (SPM): in `Package.swift` add the dependency and product.

```swift
// Package.swift
dependencies: [
  .package(url: "https://github.com/open-feature/swift-sdk.git", from: "0.4.0")
]

// target
.product(name: "OpenFeature", package: "swift-sdk"),
```

Or add via Xcode: File > Add Packages... and use `https://github.com/open-feature/swift-sdk.git`.

CocoaPods:

```ruby
pod 'OpenFeature', '~> 0.3.0'
```

Then `pod install`.

### 2. Set up OpenFeature with a provider

Initialize OpenFeature early in app startup and set a provider. Replace `CustomProvider()` with a real provider from the OpenFeature ecosystem when ready.

```swift
import OpenFeature

@main
struct MyApp: App {
  init() {
    Task {
      // Prefer waiting for readiness at startup
      let provider = CustomProvider() // replace with a real provider
      await OpenFeatureAPI.shared.setProviderAndWait(provider: provider)

      // Create a client for evaluations
      let client = OpenFeatureAPI.shared.getClient("my-app")

      // Example evaluation without additional context
      _ = client.getBooleanValue(key: "new-message", defaultValue: false)
    }
  }

  var body: some Scene {
    WindowGroup { ContentView() }
  }
}
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```swift
import OpenFeature

// Set global (API) context (e.g., environment/region)
let ctx = ImmutableContext(
  targetingKey: nil,
  structure: ImmutableStructure(attributes: [
    "region": Value.string("us-east-1")
  ])
)
OpenFeatureAPI.shared.setEvaluationContext(evaluationContext: ctx)
```

### 4. Evaluate flags with the client

Get the client and evaluate feature flag values.

```swift
import OpenFeature

let client = OpenFeatureAPI.shared.getClient("my-app")

let enabled = client.getBooleanValue(key: "new-message", defaultValue: false)
let text = client.getStringValue(key: "welcome-text", defaultValue: "Hello")
let number = client.getNumberValue(key: "api-limit", defaultValue: 100)
let obj = client.getObjectValue(key: "ui-config", defaultValue: Value.string("{\"theme\":\"light\"}"))
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Hooks

Attach hooks globally or per client to run code before/after evaluations.

```swift
import OpenFeature

OpenFeatureAPI.shared.addHooks(hooks: ExampleHook())

let client = OpenFeatureAPI.shared.getClient()
client.addHooks(ExampleHook())
```

Reference: [Hooks (OpenFeature iOS SDK)](https://openfeature.dev/docs/reference/technologies/client/swift#hooks)

### Eventing

Observe provider events (e.g., readiness or configuration changes).

```swift
import OpenFeature
import Combine

var cancellables = Set<AnyCancellable>()

OpenFeatureAPI.shared.observe().sink { event in
  switch event {
  case .ready:
    // provider ready
    break
  default:
    break
  }
}.store(in: &cancellables)
```

Reference: [Eventing (OpenFeature iOS SDK)](https://openfeature.dev/docs/reference/technologies/client/swift#eventing)

## Troubleshooting

- **Apple platform versions**: Ensure minimum targets (iOS 14+/macOS 11+/watchOS 7+/tvOS 14+).
- **Provider not ready / values are defaults**: Use `await setProviderAndWait(...)` and evaluate flags after readiness.
- **Context not applied**: Set a global evaluation context via `setEvaluationContext(...)` before evaluations relying on targeting.
- **SPM/Pods issues**: Verify package URL/version, or run `pod repo update` and `pod install`.

## Helpful resources

- OpenFeature iOS (Swift) SDK docs: [OpenFeature iOS SDK](https://openfeature.dev/docs/reference/technologies/client/swift)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the placeholder provider and swap later.
- Add flags with `client.get*Value` methods and wire app logic to feature decisions.
- Consider using hooks and event observation for extensibility and reactivity.


