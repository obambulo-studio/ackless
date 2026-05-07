const {
  STORAGE_KEY,
  BLOCKED_COUNT_KEY,
  CUSTOM_HOSTS_KEY,
  MESSAGE_GET_PAGE_STATS,
  EXPECTED_MESSAGE_ERROR_PATTERN,
  getApi,
  getStorage,
  setStorage,
  normalizeHost
} = globalThis.AcklessShared;

const api = getApi();
const countFormatter = new Intl.NumberFormat();
const toggle = document.querySelector(".toggle");
const toggleState = document.querySelector(".toggle__state");
const blockedCount = document.querySelector("#blocked-count");
const pageBlockedCount = document.querySelector("#page-blocked-count");
const addCurrentSiteButton = document.querySelector("#add-current-site");
const statusText = document.querySelector("#status");

async function loadState() {
  const [syncState, localState] = await Promise.all([
    getStorage("sync", { [STORAGE_KEY]: true }),
    getStorage("local", { [BLOCKED_COUNT_KEY]: 0 })
  ]);

  setEnabledState(syncState[STORAGE_KEY] !== false);
  blockedCount.textContent = formatCount(localState[BLOCKED_COUNT_KEY]);

  const pageStats = await getCurrentPageStats();
  pageBlockedCount.textContent = formatCount(pageStats.pageBlockedCount);
}

async function saveState() {
  const nextEnabledState = toggle.getAttribute("aria-checked") !== "true";
  setEnabledState(nextEnabledState);
  await setStorage("sync", { [STORAGE_KEY]: nextEnabledState });
}

function setEnabledState(isEnabled) {
  toggle.setAttribute("aria-checked", String(isEnabled));
  toggle.setAttribute("aria-label", isEnabled ? "Enabled" : "Disabled");
  toggleState.textContent = isEnabled ? "On" : "Off";
}

function queryTabs(queryInfo) {
  const result = api.tabs.query(queryInfo);

  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve) => {
    api.tabs.query(queryInfo, resolve);
  });
}

function sendMessage(tabId, message) {
  const result = api.tabs.sendMessage(tabId, message);

  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve, reject) => {
    api.tabs.sendMessage(tabId, message, (response) => {
      const error = api.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

async function getCurrentPageStats() {
  try {
    const [activeTab] = await queryTabs({ active: true, currentWindow: true });
    if (!activeTab?.id) return { pageBlockedCount: 0 };

    return await sendMessage(activeTab.id, {
      type: MESSAGE_GET_PAGE_STATS
    });
  } catch (error) {
    if (!EXPECTED_MESSAGE_ERROR_PATTERN.test(error.message ?? "")) {
      statusText.textContent = "Page stats unavailable. Reload the page and try again.";
    }

    return { pageBlockedCount: 0 };
  }
}

function formatCount(value) {
  return countFormatter.format(value ?? 0);
}

async function addCurrentSite() {
  const [activeTab] = await queryTabs({ active: true, currentWindow: true });
  if (!activeTab?.url) return;

  const url = parseHttpUrl(activeTab.url);
  if (!url) return;

  const host = normalizeHost(url.hostname);
  if (!host) return;

  const result = await getStorage("sync", { [CUSTOM_HOSTS_KEY]: [] });
  const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

  if (!customHosts.includes(host)) {
    await setStorage("sync", {
      [CUSTOM_HOSTS_KEY]: [...customHosts, host]
    });
  }

  statusText.textContent = `Enabled on ${host}. Refresh this page.`;
  addCurrentSiteButton.disabled = true;
}

async function updateCurrentSiteButton() {
  try {
    const [activeTab] = await queryTabs({ active: true, currentWindow: true });
    if (!activeTab?.url) {
      addCurrentSiteButton.disabled = true;
      return;
    }

    const url = parseHttpUrl(activeTab.url);
    if (!url) {
      addCurrentSiteButton.disabled = true;
      return;
    }

    const host = normalizeHost(url.hostname);
    const result = await getStorage("sync", { [CUSTOM_HOSTS_KEY]: [] });
    const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

    addCurrentSiteButton.disabled =
      !host ||
      host.endsWith(".au") ||
      customHosts.some((customHost) => host === customHost || host.endsWith(`.${customHost}`));
  } catch {
    addCurrentSiteButton.disabled = true;
  }
}

function parseHttpUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? parsedUrl : null;
  } catch {
    return null;
  }
}

toggle.addEventListener("click", saveState);
addCurrentSiteButton.addEventListener("click", addCurrentSite);
loadState();
updateCurrentSiteButton();
