# Privacy — Ackless

**Last updated:** 2026-06-03

## Summary

Ackless does **not** transmit your data to the developer or to third-party servers. All features run in your browser.

## What is stored locally

| Data | Where | Retention |
|------|--------|-----------|
| On/off toggle | `storage.sync` | Until you change or uninstall |
| Custom site hostnames you enable | `storage.sync` | Until you remove or uninstall |
| Activity log (hidden block excerpts, hostnames, rename events) | `storage.local` | Rolling **24 hours**; you can clear anytime |

Activity is **not** written in **private/incognito** windows.

## What is not collected

- No analytics or telemetry
- No full page URLs in the activity log (hostnames only)
- No remote rule downloads
- No account or sign-in

## Export

You may export the activity log as JSON from the Activity page. That file stays on your device unless you choose to share it.

## Firefox disclosure

The extension declares `data_collection_permissions.required: ["none"]` for Firefox 140+, matching the behaviour above.

## Contact

Open an issue on the project repository linked from the add-on listing, or contact the developer email on the AMO listing.
