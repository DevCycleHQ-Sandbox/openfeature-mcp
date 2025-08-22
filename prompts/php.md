# OpenFeature PHP SDK Installation Prompt

You are helping to install and configure the OpenFeature PHP SDK for server-side PHP applications. This guide focuses on installing and wiring up the OpenFeature SDK. If no provider is specified, this guide will use an example `FlagdProvider` to get started. Do not install any feature flags as part of this process, the user can ask for you to do that later.

**Do not use this for:**

- Browser-based apps (use client SDKs instead)
- Mobile apps (Android/iOS)

## Required Information

Before proceeding, confirm:

- [ ] PHP 8.0+ is installed
- [ ] Composer is available
- [ ] Which file is your application entry point (e.g., `public/index.php`, a framework bootstrap, or a CLI script)?
- [ ] Do you want to install any provider(s) alongside the OpenFeature PHP SDK? If not provided, this guide will use an example `FlagdProvider`.

References:

- OpenFeature PHP SDK docs: [OpenFeature PHP SDK](https://openfeature.dev/docs/reference/technologies/server/php)

## Installation Steps

### 1. Install the OpenFeature PHP SDK

Install the SDK via Composer.

```bash
composer require open-feature/sdk
```

### 2. Set up OpenFeature with an example provider (Flagd)

Initialize OpenFeature early in application startup and set the example `FlagdProvider`. Replace with a real provider from the OpenFeature ecosystem when ready.

```php
<?php
use OpenFeature\OpenFeatureAPI;
use OpenFeature\Providers\Flagd\FlagdProvider;

require __DIR__ . '/vendor/autoload.php';

$api = OpenFeatureAPI::getInstance();

// Replace with provider from: https://openfeature.dev/ecosystem/
$api->setProvider(new FlagdProvider());

// Create a client for evaluations
$client = $api->getClient('my-app');

// Example evaluation without additional context
$enabled = $client->getBooleanValue('new-message', false);
```

### 3. Update the evaluation context

Provide user or environment attributes via the evaluation context to enable targeting of your feature flags.

```php
<?php
use OpenFeature\OpenFeatureAPI;
use OpenFeature\implementation\flags\EvaluationContext;

$api = OpenFeatureAPI::getInstance();
$client = $api->getClient('my-app');

// Set global context (e.g., environment/region)
$api->setEvaluationContext(new EvaluationContext('system', [
  'region' => 'us-east-1',
]));

// Set client-level context
$client->setEvaluationContext(new EvaluationContext('system', [
  'version' => '1.4.6',
]));

// Create a per-invocation/request context (recommended)
$requestCtx = new EvaluationContext('user-123', [
  'email' => 'user@example.com',
  'ip' => '203.0.113.1',
]);

// Use request context in an evaluation
$flagValue = $client->getBooleanValue('some-flag', false, $requestCtx);
```

### 4. Evaluate flags with the client

Create a client and evaluate feature flag values.

```php
<?php
use OpenFeature\OpenFeatureAPI;
use OpenFeature\implementation\flags\EvaluationContext;

$client = OpenFeatureAPI::getInstance()->getClient('my-app');

// Without additional context
$enabled = $client->getBooleanValue('new-message', false);

// With per-request context (recommended)
$ctx = new EvaluationContext('user-123', [ 'email' => 'user@example.com' ]);

$text = $client->getStringValue('welcome-text', 'Hello', $ctx);
$limit = $client->getIntegerValue('api-limit', 100, $ctx);

// Object/JSON value
$config = $client->getObjectValue('ui-config', [ 'theme' => 'light' ], $ctx);
```

## Optional advanced usage

Only implement the following optional sections if requested.

### Logging (PSR-3)

Configure a PSR-3 logger globally or per client.

```php
<?php
use OpenFeature\OpenFeatureAPI;

$api = OpenFeatureAPI::getInstance();
$api->setLogger($logger); // $logger implements Psr\Log\LoggerInterface

$client = $api->getClient('custom-logger');
$client->setLogger($logger); // override per-client if desired
```

Reference: [Logging (OpenFeature PHP SDK)](https://openfeature.dev/docs/reference/technologies/server/php#logging)

### Hooks

Register hooks at the global, client, or invocation level.

```php
<?php
use OpenFeature\OpenFeatureAPI;
use OpenFeature\implementation\flags\EvaluationContext;
use OpenFeature\implementation\flags\EvaluationOptions;

$api = OpenFeatureAPI::getInstance();
$client = $api->getClient('my-app');

// Global
$api->addHook(new ExampleGlobalHook());

// Client
$client->addHook(new ExampleClientHook());

// Invocation
$value = $client->getBooleanValue('boolFlag', false, new EvaluationContext('user-123'), new EvaluationOptions([ new ExampleInvocationHook() ]));
```

Reference: [Hooks (OpenFeature PHP SDK)](https://openfeature.dev/docs/reference/technologies/server/php#hooks)

## Troubleshooting

- **PHP version**: Ensure PHP 8.0+ is used per the SDK requirements.
- **Provider not set / values are defaults**: Call `$api->setProvider(...)` before evaluations.
- **Context not applied**: Pass an `EvaluationContext` with a targeting key (first parameter) for per-request evaluations; set global/client contexts for shared values.
- **Composer issues**: Run `composer install` / `composer update`, ensure autoloading is configured, and verify namespaces/imports.

## Helpful resources

- OpenFeature PHP SDK docs: [OpenFeature PHP SDK](https://openfeature.dev/docs/reference/technologies/server/php)

## Next steps

- If you want a real provider, specify which provider(s) to install now; otherwise continue with the example `FlagdProvider`.
- Add flags with `$client->get<Type>Value` methods and wire business logic to feature decisions.
- Consider configuring a PSR-3 logger and using hooks for observability.


