# Contributing

Thanks for helping improve Ackless.

## Useful Reports

Please include:

- The public URL where the extension behaved incorrectly.
- The browser and version.
- Whether the issue is a false positive or false negative.
- The exact visible text that should or should not be hidden.

Avoid sharing private pages, cookies, access tokens, or screenshots with personal information.

## Rule Changes

The content script should stay simple and auditable. Prefer:

- Small phrase additions with public examples.
- Specific place-name replacements with public examples.
- Site-specific handling only when generic matching is unsafe.
- Conservative hiding targets that avoid forms, media, and main page tools.

Avoid:

- Remote code or remote rule execution.
- Telemetry.
- Broad terms likely to hide unrelated content.
- Place-name replacements that affect common words or personal names.
- Obfuscated code.
