export const STORAGE_KEY = "acklessAuEnabled" as const;
export const BLOCKED_COUNT_KEY = "acklessAuBlockedCount" as const;
export const CUSTOM_HOSTS_KEY = "acklessAuCustomHosts" as const;
export const MESSAGE_GET_PAGE_STATS = "ACKLESS_GET_PAGE_STATS" as const;
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
