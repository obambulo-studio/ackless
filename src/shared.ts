export const STORAGE_KEY = "acklessAuEnabled" as const;
export const BLOCKED_COUNT_KEY = "acklessAuBlockedCount" as const;
export const CUSTOM_HOSTS_KEY = "acklessAuCustomHosts" as const;
export const MESSAGE_GET_PAGE_STATS = "ACKLESS_GET_PAGE_STATS" as const;
export const MESSAGE_RECORD_BLOCKS = "ACKLESS_RECORD_BLOCKS" as const;
export const MESSAGE_RECORD_RENAMES = "ACKLESS_RECORD_RENAMES" as const;
export const MESSAGE_CLEAR_ACTIVITY = "ACKLESS_CLEAR_ACTIVITY" as const;
export const ACTIVITY_PAGE_PATH = "src/activity.html" as const;
export const EXPECTED_MESSAGE_ERROR_PATTERN =
  /receiving end does not exist|could not establish connection|no tab with id|cannot access/i;

/** Narrow surface Ackless uses so Firefox `browser` does not need to equal Chromium typings. */
export type AcklessExtensionApi = Pick<
  typeof chrome,
  "storage" | "runtime" | "tabs"
>;

export function getApi(): AcklessExtensionApi {
  return (
    typeof browser !== "undefined" ? browser : chrome
  ) as AcklessExtensionApi;
}

/** True when this extension context is running in a private/incognito window. */
export function isPrivateBrowsingContext(): boolean {
  if (typeof browser !== "undefined" && browser.extension) {
    return Boolean(browser.extension.inIncognitoContext);
  }

  if (typeof chrome !== "undefined" && chrome.extension) {
    return Boolean(chrome.extension.inIncognitoContext);
  }

  return false;
}

/** Activity logs must not persist in private browsing (Mozilla add-on policy). */
export function shouldPersistActivity(): boolean {
  return !isPrivateBrowsingContext();
}

export function getStorage<T extends Record<string, unknown>>(
  area: chrome.storage.AreaName,
  defaults: T
): Promise<{ [K in keyof T]: T[K] }> {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const storageArea = api.storage[area];

  if (typeof browser !== "undefined") {
    return storageArea.get(defaults) as Promise<{ [K in keyof T]: T[K] }>;
  }

  return new Promise<{ [K in keyof T]: T[K] }>((resolve) => {
    storageArea.get(defaults, (result) => {
      resolve(result as { [K in keyof T]: T[K] });
    });
  });
}

export function setStorage(
  area: chrome.storage.AreaName,
  values: Record<string, unknown>
): Promise<void> {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const storageArea = api.storage[area];

  if (typeof browser !== "undefined") {
    return storageArea.set(values);
  }

  return new Promise<void>((resolve) => {
    storageArea.set(values, () => {
      resolve();
    });
  });
}

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
}

export function getActivityHost(
  location: Pick<Location, "hostname" | "protocol"> = {
    hostname:
      typeof globalThis.location === "object" && globalThis.location
        ? globalThis.location.hostname
        : "",
    protocol:
      typeof globalThis.location === "object" && globalThis.location
        ? globalThis.location.protocol
        : "https:",
  }
): string {
  const host = normalizeHost(location.hostname);
  if (host) {
    return host;
  }

  if (location.protocol === "file:") {
    return "local-file";
  }

  return "unknown-host";
}

export async function sendRuntimeMessage<T = unknown>(
  message: unknown
): Promise<T> {
  const api = getApi();
  const result = api.runtime.sendMessage(message);

  if (result && typeof result.then === "function") {
    return result as Promise<T>;
  }

  return new Promise<T>((resolve, reject) => {
    api.runtime.sendMessage(message, (response: T) => {
      const error = api.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response);
    });
  });
}
