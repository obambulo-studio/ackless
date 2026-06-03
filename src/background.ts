/**
 * Service worker: serializes activity writes and registers content scripts for
 * custom hosts the user enabled from the popup.
 */
import {
  clearActivityData,
  recordBlocks,
  recordRenames,
} from "./activity-stats";
import { updateActionBadge } from "./badge";
import {
  isClearActivityMessage,
  isRecordBlocksMessage,
  isRecordRenamesMessage,
} from "./messages";
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

async function refreshBadge(): Promise<void> {
  await updateActionBadge(api().action);
}

function listenForActivityMessages(): void {
  api().runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (isRecordBlocksMessage(message)) {
      void recordBlocks(message.host, message.blocks)
        .then(async () => {
          await refreshBadge();
          sendResponse({ ok: true });
        })
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true;
    }

    if (isRecordRenamesMessage(message)) {
      void recordRenames(message.host, message.matches)
        .then(() => {
          sendResponse({ ok: true });
        })
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true;
    }

    if (isClearActivityMessage(message)) {
      void clearActivityData()
        .then(async () => {
          await refreshBadge();
          sendResponse({ ok: true });
        })
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      return true;
    }

    return false;
  });
}

listenForActivityMessages();

api().runtime.onInstalled.addListener(() => {
  void refreshCustomHostScripts();
  void refreshBadge();
});

api().runtime.onStartup.addListener(() => {
  void refreshCustomHostScripts();
  void refreshBadge();
});

api().storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !(CUSTOM_HOSTS_KEY in changes)) {
    return;
  }

  void refreshCustomHostScripts();
});
