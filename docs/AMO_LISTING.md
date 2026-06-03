# AMO listing copy (draft)

Paste and adapt these fields on [addons.mozilla.org](https://addons.mozilla.org). Replace `YOUR_ADDON_ID` in `manifest.json` before submission.

---

## Name

**Ackless**

(If Mozilla asks for Firefox naming: **Ackless for Firefox** — only if you use “Firefox” in the title.)

---

## Tagline / Summary (short, ~250 chars)

Hide repetitive Welcome to Country and Acknowledgement of Country blocks on Australian sites. Optional place-name display preferences. Local 24-hour activity log only—nothing sent to a server.

---

## Description (full listing)

Ackless reduces interruption from common **Welcome to Country** and **Acknowledgement of Country** UI on Australian websites: banners, modals, footers, and similar blocks that repeat on every visit.

### What it does

- On **`.au` websites** (and pages you explicitly enable), scans page text for acknowledgement-style wording and hides the matching block.
- May **close acknowledgement modals** using safe in-page controls (e.g. “Continue”, “Close”) when that dismisses the dialog.
- Can replace a **small, fixed list** of Aboriginal place names in visible text with alternative names you may be more familiar with (see `src/place-names.ts` in the source repository). This is optional in effect only when those words appear on the page.
- Watches for content loaded after the initial page load and hides new matching blocks.
- Shows a **toolbar badge** with how many blocks were hidden in the last 24 hours (all sites combined).

### Activity log (local only)

- Keeps a **24-hour activity log on your device**: hostnames, short text excerpts of hidden blocks, and rename counts.
- Open **View activity** from the popup for details, JSON export, or **Clear all**.
- **No analytics**, **no cloud sync**, **no remote rule lists**.
- **Private browsing**: stats are not saved in incognito/private windows (hiding may still run).

### Sites outside `.au`

Ackless does **not** run on arbitrary international sites by default. Use **Enable on this site** in the popup to opt in for the current hostname (for example `en-AU` content on a `.com` domain).

### Limitations

Early release: matching is conservative but not perfect. You may see occasional false positives or missed blocks. Report examples on the project issue tracker.

### Permissions

| Permission | Why |
|------------|-----|
| `storage` | Enable/disable toggle, custom site list, local activity log |
| `activeTab` | Read the active tab’s host when you use the popup |
| `tabs` | Reuse or focus the Activity page tab |
| `scripting` | Register content scripts on hosts you opt into |

### Data collection

**No data is transmitted off your device.** Firefox’s built-in disclosure shows **no optional or required collection** (`data_collection_permissions`: `none`). Requires **Firefox 140+**.

### Open source

MIT licensed. Source and build instructions are published with the project; see `SOURCE_SUBMISSION.md` for reviewer build steps.

---

## Privacy policy URL

If you do not host a separate policy page, use your repository README **Mozilla add-on policies** section or a short `PRIVACY.md` on GitHub. AMO may accept a link to documented practices; a dedicated page is clearer for users.

Suggested one-liner for a minimal `PRIVACY.md`:

> Ackless stores settings and a 24-hour activity log locally in the browser. It does not transmit personal or browsing data to the developer or third parties.

---

## Notes for reviewers (version upload field)

```
Build: bun install --frozen-lockfile && bun run build (see SOURCE_SUBMISSION.md).
Bun 1.3.13 required; not in Mozilla default image.

No login required. Test on any public .au site with an acknowledgement banner.

gecko.id must be set to our developer ID before release (replace ackless@example.com).

Primary function: hide acknowledgement UI on .au sites; optional fixed place-name
text replacements. Non-.au hosts only after user clicks "Enable on this site".
Activity log is local-only; disabled in private browsing.
```

---

## Screenshots (suggestions)

1. Popup with toggle and activity summary  
2. Before/after on a sample `.au` page (use repo `screenshots/` if appropriate)  
3. Activity page overview  

---

## Categories

- **Other** or **Web Development** (if available) — there is no “content filtering” subcategory; pick the closest fit.

---

## Pre-submission checklist

- [ ] `browser_specific_settings.gecko.id` updated from `ackless@example.com`
- [ ] Signed XPI built from `bun run build:firefox`
- [ ] Source zip attached (`bun run package:amo-source`)
- [ ] `SOURCE_SUBMISSION.md` included in source archive
- [ ] Listing description matches actual behaviour
- [ ] Screenshots show real extension UI
