/**
 * Registers content scripts for hosts the user added via "Enable on this site".
 * Australian and local dev hosts are covered by manifest content_scripts matches.
 */
import { CUSTOM_HOSTS_KEY, getStorage, normalizeHost } from "./shared";

const SCRIPT_PATH = "src/content.js";

function api(): typeof chrome {
  return (typeof browser !== "undefined" ? browser : chrome) as typeof chrome;
}

function scriptIdForHost(host: string, index: number): string {
  const safe = normalizeHost(host).replaceAll(/[^a-z0-9]/g, "-").slice(0, 48);
  return `ackless-custom-${index}-${safe}`;
}

/** Hosts already injected via static manifest matches (see manifest.json). */
function isAuOrLocalHost(host: string): boolean {
  const h = normalizeHost(host);
  if (h === "localhost" || h === "127.0.0.1") {
    return true;
  }

  return h.endsWith(".au") || h === "au";
}

function matchPatternsForHost(host: string): string[] {
  const h = normalizeHost(host);

  return [
    `https://${h}/*`,
    `http://${h}/*`,
    `https://*.${h}/*`,
    `http://*.${h}/*`,
  ];
}

async function refreshCustomHostScripts(): Promise<void> {
  const scripting = api().scripting;

  const { [CUSTOM_HOSTS_KEY]: rawHosts = [] } = await getStorage("sync", {
    [CUSTOM_HOSTS_KEY]: [] as string[],
  });
  const hosts = rawHosts.map(normalizeHost).filter(Boolean);
  const needsRegistration = hosts.filter((h) => !isAuOrLocalHost(h));

  const existing = await scripting.getRegisteredContentScripts();
  const staleIds = existing
    .map((spec) => spec.id)
    .filter((id) => id.startsWith("ackless-custom-"));

  if (staleIds.length > 0) {
    await scripting.unregisterContentScripts({ ids: staleIds });
  }

  if (needsRegistration.length === 0) {
    return;
  }

  await scripting.registerContentScripts(
    needsRegistration.map((host, index) => ({
      id: scriptIdForHost(host, index),
      js: [SCRIPT_PATH],
      matches: matchPatternsForHost(host),
      runAt: "document_idle" as const,
    }))
  );
}

api().runtime.onInstalled.addListener(() => {
  void refreshCustomHostScripts();
});

api().runtime.onStartup.addListener(() => {
  void refreshCustomHostScripts();
});

api().storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !(CUSTOM_HOSTS_KEY in changes)) {
    return;
  }

  void refreshCustomHostScripts();
});
