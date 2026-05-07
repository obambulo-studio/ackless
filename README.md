# Ackless

Ackless is an open-source browser extension for Chrome, Firefox, and other WebExtensions-compatible browsers. It hides common Australian `Welcome to Country` and `Acknowledgement of Country` blocks on Australian websites and can rename selected Aboriginal place names to common Australian place names.

## Why

Australians do not need to be “welcomed” to their own country, nor reminded on every page load to acknowledge Traditional Owners—we are already citizens, neighbours, and daily users of the same public life. Whatever you think of acknowledgement in other contexts, the same repeating banners, modals, and footers across Australian sites add little beyond interruption. For many people they feel like empty performance: virtue signalling that annoys more than it informs.

The project is intentionally small: no telemetry, no remote rules, no bundled analytics. TypeScript sources compile and bundle into `dist/` for loading and packaging.

## Status

This is an early prototype. It uses conservative text matching and DOM hiding rules, so expect false positives and false negatives while the ruleset matures.

## What It Does

- Runs on `.au` pages, pages marked as `en-AU`, and extra sites you enable from the popup.
- Looks for common acknowledgement phrases, including `Welcome to Country`, `Acknowledgement of Country`, `Traditional Owners`, and related wording.
- Hides the closest matching banner, modal, section, paragraph, or acknowledgement block.
- Renames a small, auditable list of place names, such as `Uluṟu` to `Ayers Rock` and `K'gari` to `Fraser Island`.
- Tracks local counts for acknowledgement blocks hidden on the current page and in total.
- Watches for late-loaded content and hides matching blocks after the page changes.
- Provides a popup toggle to enable or disable the extension, plus an option to enable matching on the current non-`.au` site.

## What It Does Not Do

- It does not collect analytics.
- It does not send visited URLs anywhere.
- It does not use remote filtering lists.
- It does not use remote place-name mappings.
- It does not sync hidden-block counts to any server.
- It does not target non-Australian websites unless you explicitly enable the current site.

## Install without the browser stores

Store listings mean review queues and policy checks. For a small open-source extension, you can ship builds yourself and keep the install path short.

### Chrome, Edge, Brave, and other Chromium browsers

1. Download and unzip a release archive (or clone this repo and run `bun install && bun run build`). Use the **`dist`** folder from the build output as the unpacked extension root (it contains `manifest.json`).
2. Open `chrome://extensions` (or `edge://extensions`, and so on).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the folder that contains `manifest.json`.

Users only enable Developer mode once. After that, updates are “replace the folder” or load again from a fresh unzip. For teams, **managed installation** via enterprise policy is another option if you control devices.

### Firefox

- **Temporary load** (`about:debugging` → _Load Temporary Add-on_) is fine for development only; the add-on disappears when Firefox closes.
- For **normal Firefox**, Mozilla requires extensions to be **signed**. You do not have to list on [addons.mozilla.org](https://addons.mozilla.org): you can request signing for **self-distribution**, get back a signed `.xpi`, and host it on GitHub Releases (or your site). Users install via _about:addons_ → gear menu → _Install Add-on From File…_, or you link to the file if your hosting policy allows. See Mozilla’s docs for [signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

So the low-friction pattern for both engines is: **GitHub Releases** with a Chrome zip (unpacked bundle) and a **signed** Firefox `.xpi`, plus the short steps above in the release notes.

## Install for development

Run `bun install` then `bun run build` once so `dist/` contains the packaged extension.

### Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the **`dist`** folder from this repo.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select **`dist/manifest.json`**.

## Package

This repo uses [Bun](https://bun.sh) for installs and scripts (`package.json` / `bun.lock`). [Ultracite](https://www.ultracite.ai/) drives lint + formatting via Oxlint/Oxfmt (`oxlint.config.ts`, `oxfmt.config.ts`). Install dependencies once:

```sh
bun install
```

Auto-fix lint + formatting issues:

```sh
bun run format
```

Validate (Ultracite / lint / format, TypeScript check, unit tests, production build, `web-ext lint`):

```sh
bun run check
```

Run tests alone:

```sh
bun run test
```

Build distributable archives (these wrap the **`dist/` output** — always run `bun run build` first):

```sh
bun run build:chrome
bun run build:firefox
```

### Releases

GitHub (or other) release artifacts **must be produced from `dist/`**: either attach the outputs of `bun run build:chrome` / `bun run build:firefox`, or zip the `dist/` folder after `bun run build`. Do **not** publish the raw TypeScript `src/` tree as an installable extension; browsers need compiled JS and the packaged manifest paths under `dist/`.

## Contributing Rules

Good issues include the affected URL, browser, what was hidden, and what should have happened. Please do not paste private account pages, session cookies, or screenshots containing personal information.

When adding new match rules, prefer specific phrases over broad political or cultural terms. The goal is to hide acknowledgement UI blocks, not unrelated page content.

When adding place-name replacements, keep them specific and publicly reviewable. Avoid broad word replacements that could change unrelated text.

## License

MIT
