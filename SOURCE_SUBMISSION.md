# Source code submission (Mozilla AMO)

This file is for **add-on reviewers** reproducing the signed XPI from source. End-user documentation is in [README.md](README.md).

## Summary

Ackless is TypeScript compiled with **esbuild** into bundled IIFE files under `dist/`. There is no remote code, no obfuscation, and no web-based build step.

## Build environment used by the author

| Item | Version / notes |
|------|-----------------|
| OS | macOS (darwin); reviewers may use Ubuntu 24.04 per Mozilla default |
| CPU | arm64 (Apple Silicon); build is architecture-independent |
| **Bun** | **1.3.13** (see `packageManager` in `package.json`) — **required** for a lockfile-identical install |
| Node | Used only to run `scripts/build.mjs` (Node 20+; Mozilla default Node 24 is fine) |

Mozilla’s default reviewer image includes Node/npm but **not** Bun. Install Bun before building:

```sh
curl -fsSL https://bun.sh/install | bash
# ensure ~/.bun/bin is on PATH, then:
bun --version   # expect 1.3.13
```

## Reproduce the extension byte-for-byte

From the **repository root** (this directory), not from inside `dist/`:

```sh
bun install --frozen-lockfile
bun run build
```

Output to compare with the submitted XPI:

- `dist/manifest.json`
- `dist/icons/`
- `dist/src/*.js`, `dist/src/*.html`, `dist/src/*.css`

### Verify (optional)

```sh
bun run test
bunx web-ext lint --source-dir dist --ignore-files package.json bun.lock README.md LICENSE CONTRIBUTING.md test-page.html
```

Compare the built `dist/` tree to the unpacked signed add-on (same paths). Bundled JS should match except for any path-normalization differences in the zip.

### npm-only fallback (not preferred)

If Bun cannot be installed, this **may** produce an equivalent build but dependency versions are not locked the same way:

```sh
npm install
node scripts/build.mjs
```

Use the Bun path for review; report differences if the output does not match the XPI.

## What was built

| Source | Output |
|--------|--------|
| `src/content.ts` | `dist/src/content.js` |
| `src/background.ts` | `dist/src/background.js` |
| `src/popup.ts` | `dist/src/popup.js` |
| `src/activity.ts` | `dist/src/activity.js` |
| `manifest.json`, `icons/`, HTML/CSS | copied into `dist/` |

esbuild bundles dependencies inline (shared helpers are duplicated per entry by design).

## Third-party libraries

Runtime: **none** (only browser WebExtension APIs).

Build-time (devDependencies): esbuild, TypeScript, vitest, web-ext, ultracite/oxlint/oxfmt — all open source, installed from npm registry via `bun install`.

## Policies relevant to review

- **No data transmission**: `browser_specific_settings.gecko.data_collection_permissions.required` is `["none"]`.
- **Content scripts** run on `*://*.au/*` and localhost only; other hosts are registered only after the user clicks **Enable on this site** in the popup (`scripting.registerContentScripts`).
- **Private browsing**: activity stats are not persisted when `extension.inIncognitoContext` is true.
- **Primary behaviour**: hide acknowledgement UI and optionally replace a fixed list of place names in page text (`src/place-names.ts`).

## Testing notes for reviewers

No account is required. Suggested manual test:

1. Load temporary add-on or install signed build from `dist/`.
2. Open a public `.au` page with a visible acknowledgement (e.g. government or news sites).
3. Confirm banner/modal is hidden or collapsed; toggle off in popup and refresh to see original.
4. Open popup → **View activity** → confirm local log; **Clear all** resets badge.
5. On a non-`.au` site, confirm content script does **not** run until **Enable on this site** is used.

## Package source for upload

Create the AMO source archive (excludes `dist/` and `node_modules/`):

```sh
bun run package:amo-source
```

Upload the generated `dist/ackless-amo-source.zip` with each new AMO version.

## Contact

Use the developer email on the AMO listing or GitHub issues on the repository linked from the listing.
