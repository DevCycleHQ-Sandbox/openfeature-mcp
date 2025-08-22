# OpenFeature Ruby SDK Installation Prompt

You are helping to install and configure the OpenFeature Ruby SDK for server-side Ruby applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will use an example in-memory provider to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Browser-based apps (use client SDKs instead)
- Mobile apps (Android/iOS)

## Required Information

Before proceeding, confirm:

- [ ] Ruby 3.1+ is installed (3.1.4/3.2.3/3.3.0 supported)
- [ ] Your dependency manager (bundler or RubyGems)
- [ ] Which file is your application entry point (e.g., `config/application.rb`, `app.rb`)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature Ruby SDK? If not provided, this guide will use an example in-memory provider.

References:

- OpenFeature Ruby SDK docs: [OpenFeature Ruby SDK](https://openfeature.dev/docs/reference/technologies/server/ruby)

## Installation Steps

### 1. Install the OpenFeature Ruby SDK

Install the gem and add it to your Gemfile.

```bash
bundle add openfeature-sdk
```

Or, if not using bundler:

```bash
gem install openfeature-sdk
```

### 2. Set up OpenFeature with the example in-memory provider

Initialize OpenFeature early in application startup and set the example in-memory provider.

```ruby
require 'open_feature/sdk'

OpenFeature::SDK.configure do |config|
  # Replace with a real provider from: https://openfeature.dev/ecosystem/
  config.set_provider(
    OpenFeature::SDK::Provider::InMemoryProvider.new({
      'new-message' => true,
    })
  )
end

client = OpenFeature::SDK.build_client('my-app')

# Example evaluation without additional context
enabled = client.fetch_boolean_value(flag_key: 'new-message', default_value: false)
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```ruby
require 'open_feature/sdk'

# Set global (API) context
OpenFeature::SDK.configure do |config|
  config.evaluation_context = OpenFeature::SDK::EvaluationContext.new(
    'region' => 'us-east-1'
  )
end

# Set client-level context
client = OpenFeature::SDK.build_client(
  'my-app',
  evaluation_context: OpenFeature::SDK::EvaluationContext.new(
    'version' => '1.4.6'
  )
)

# Create a per-invocation/request context (recommended)
request_context = OpenFeature::SDK::EvaluationContext.new(
  'email' => 'user@example.com',
  'ip' => '203.0.113.1'
)

# Use the request context in an evaluation
flag_value = client.fetch_boolean_value(
  flag_key: 'some-flag',
  default_value: false,
  evaluation_context: request_context
)
```

### 4. Evaluate flags with the client

Create a client and evaluate feature flag values.

```ruby
require 'open_feature/sdk'

client = OpenFeature::SDK.build_client('my-app')

# Without additional context
enabled = client.fetch_boolean_value(flag_key: 'new-message', default_value: false)

# With per-request context (recommended)
ctx = OpenFeature::SDK::EvaluationContext.new('email' => 'user@example.com')

text = client.fetch_string_value(flag_key: 'welcome-text', default_value: 'Hello', evaluation_context: ctx)
limit = client.fetch_number_value(flag_key: 'api-limit', default_value: 100, evaluation_context: ctx)

# Object/JSON value (pass serialized JSON or a hash depending on provider)
require 'json'
config = client.fetch_object_value(
  flag_key: 'ui-config',
  default_value: JSON.dump({ theme: 'light' }),
  evaluation_context: ctx
)
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Domains

Bind clients to providers by domain.

```ruby
OpenFeature::SDK.configure do |config|
  config.set_provider(OpenFeature::SDK::Provider::InMemoryProvider.new({}), domain: 'legacy_flags')
end

legacy_client = OpenFeature::SDK.build_client('legacy-app', domain: 'legacy_flags')
```

Reference: [Domains (OpenFeature Ruby SDK)](https://openfeature.dev/docs/reference/technologies/server/ruby#domains)

## Troubleshooting

- **Ruby version**: Ensure a supported Ruby version (3.1.4/3.2.3/3.3.0) per SDK requirements.
- **Provider not set / values are defaults**: Configure a provider in `OpenFeature::SDK.configure` before evaluations.
- **Context not applied**: Pass an `EvaluationContext` to `fetch_*_value` or configure client/global context as shown.
- **Bundler/RubyGems issues**: Run `bundle install`, verify your `Gemfile`, or `gem list | grep openfeature-sdk` to confirm installation.

## Helpful resources

- OpenFeature Ruby SDK docs: [OpenFeature Ruby SDK](https://openfeature.dev/docs/reference/technologies/server/ruby)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example in-memory provider.
- Add flags with `client.fetch_<type>_value` methods and wire business logic to feature decisions.
