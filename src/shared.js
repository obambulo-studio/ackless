globalThis.AcklessShared = {
  STORAGE_KEY: "acklessAuEnabled",
  BLOCKED_COUNT_KEY: "acklessAuBlockedCount",
  CUSTOM_HOSTS_KEY: "acklessAuCustomHosts",
  MESSAGE_GET_PAGE_STATS: "ACKLESS_GET_PAGE_STATS",
  EXPECTED_MESSAGE_ERROR_PATTERN:
    /receiving end does not exist|could not establish connection|no tab with id|cannot access/i,

  getApi() {
    return typeof browser !== "undefined" ? browser : chrome;
  },

  getStorage(area, defaults) {
    const api = typeof browser !== "undefined" ? browser : chrome;
    const storageArea = api.storage[area];

    if (typeof browser !== "undefined") {
      return storageArea.get(defaults);
    }

    return new Promise((resolve) => {
      storageArea.get(defaults, resolve);
    });
  },

  setStorage(area, values) {
    const api = typeof browser !== "undefined" ? browser : chrome;
    const storageArea = api.storage[area];

    if (typeof browser !== "undefined") {
      return storageArea.set(values);
    }

    return new Promise((resolve) => {
      storageArea.set(values, resolve);
    });
  },

  normalizeHost(host) {
    return host.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  },
};
