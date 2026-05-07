# Ackless

Ackless is an open-source browser extension for Chrome, Firefox, and other WebExtensions-compatible browsers. It hides common Australian `Welcome to Country` and `Acknowledgement of Country` blocks on Australian websites and can rename selected Aboriginal place names to common Australian place names.

The project is intentionally small: no telemetry, no remote rules, no bundled analytics, and no build step required to inspect the source.

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

1. Download and unzip a release archive (or clone this repo).
2. Open `chrome://extensions` (or `edge://extensions`, and so on).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the folder that contains `manifest.json`.

Users only enable Developer mode once. After that, updates are “replace the folder” or load again from a fresh unzip. For teams, **managed installation** via enterprise policy is another option if you control devices.

### Firefox

- **Temporary load** (`about:debugging` → *Load Temporary Add-on*) is fine for development only; the add-on disappears when Firefox closes.
- For **normal Firefox**, Mozilla requires extensions to be **signed**. You do not have to list on [addons.mozilla.org](https://addons.mozilla.org): you can request signing for **self-distribution**, get back a signed `.xpi`, and host it on GitHub Releases (or your site). Users install via *about:addons* → gear menu → *Install Add-on From File…*, or you link to the file if your hosting policy allows. See Mozilla’s docs for [signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

So the low-friction pattern for both engines is: **GitHub Releases** with a Chrome zip (unpacked bundle) and a **signed** Firefox `.xpi`, plus the short steps above in the release notes.

## Install for development

### Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `manifest.json` from this folder.

## Package

Install dependencies once:

```sh
npm install
```

Lint the extension:

```sh
npm run check
```

Build distributable archives:

```sh
npm run build:chrome
npm run build:firefox
```

## Contributing Rules

Good issues include the affected URL, browser, what was hidden, and what should have happened. Please do not paste private account pages, session cookies, or screenshots containing personal information.

When adding new match rules, prefer specific phrases over broad political or cultural terms. The goal is to hide acknowledgement UI blocks, not unrelated page content.

When adding place-name replacements, keep them specific and publicly reviewable. Avoid broad word replacements that could change unrelated text.

## License

MIT
