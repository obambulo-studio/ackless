import { normalizePageStatsResponse } from "./messages";
import {
  STORAGE_KEY,
  BLOCKED_COUNT_KEY,
  CUSTOM_HOSTS_KEY,
  MESSAGE_GET_PAGE_STATS,
  EXPECTED_MESSAGE_ERROR_PATTERN,
  getApi,
  getStorage,
  setStorage,
  normalizeHost,
} from "./shared";
import { parseHttpUrl } from "./url-utils";

const api = getApi();
const countFormatter = new Intl.NumberFormat();

interface PopupUi {
  toggle: HTMLButtonElement;
  toggleState: HTMLElement;
  blockedCount: HTMLElement;
  pageBlockedCount: HTMLElement;
  addCurrentSiteButton: HTMLButtonElement;
  statusText: HTMLElement;
}

function reportBootstrapFailure(
  statusSlot: Element | null,
  message: string
): void {
  if (statusSlot instanceof HTMLElement) {
    statusSlot.textContent = message;
    return;
  }
  console.error(message);
}

function resolvePopupUi(): PopupUi | null {
  const statusSlot = document.querySelector("#status");

  const toggle = document.querySelector(".toggle");
  const toggleState = document.querySelector(".toggle__state");
  const blockedCount = document.querySelector("#blocked-count");
  const pageBlockedCount = document.querySelector("#page-blocked-count");
  const addCurrentSiteButton = document.querySelector("#add-current-site");
  const statusText = statusSlot;

  if (!(toggle instanceof HTMLButtonElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(toggleState instanceof HTMLElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(blockedCount instanceof HTMLElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(pageBlockedCount instanceof HTMLElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(addCurrentSiteButton instanceof HTMLButtonElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(statusText instanceof HTMLElement)) {
    console.error("Ackless UI failed to load. Reinstall the extension.");
    return null;
  }

  return {
    addCurrentSiteButton,
    blockedCount,
    pageBlockedCount,
    statusText,
    toggle,
    toggleState,
  };
}

function bindPopup(ui: PopupUi): void {
  async function loadState(): Promise<void> {
    const [syncState, localState] = await Promise.all([
      getStorage("sync", { [STORAGE_KEY]: true }),
      getStorage("local", { [BLOCKED_COUNT_KEY]: 0 }),
    ]);

    setEnabledState(syncState[STORAGE_KEY] !== false);
    ui.blockedCount.textContent = formatCount(localState[BLOCKED_COUNT_KEY]);

    const pageStats = await getCurrentPageStats();
    ui.pageBlockedCount.textContent = formatCount(pageStats.pageBlockedCount);
  }

  async function saveState(): Promise<void> {
    const nextEnabledState = ui.toggle.getAttribute("aria-checked") !== "true";
    setEnabledState(nextEnabledState);
    await setStorage("sync", { [STORAGE_KEY]: nextEnabledState });
  }

  function setEnabledState(isEnabled: boolean): void {
    ui.toggle.setAttribute("aria-checked", String(isEnabled));
    ui.toggle.setAttribute("aria-label", isEnabled ? "Enabled" : "Disabled");
    ui.toggleState.textContent = isEnabled ? "On" : "Off";
  }

  function queryTabs(
    queryInfo: chrome.tabs.QueryInfo
  ): Promise<chrome.tabs.Tab[]> {
    const result = api.tabs.query(queryInfo);

    if (result && typeof result.then === "function") {
      return result;
    }

    return new Promise((resolve) => {
      api.tabs.query(queryInfo, resolve);
    });
  }

  function sendMessage(tabId: number, message: unknown): Promise<unknown> {
    const result = api.tabs.sendMessage(tabId, message);

    if (result && typeof result.then === "function") {
      return result;
    }

    return new Promise((resolve, reject) => {
      api.tabs.sendMessage(tabId, message, (response: unknown) => {
        const error = api.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(response);
      });
    });
  }

  async function getCurrentPageStats(): Promise<{ pageBlockedCount: number }> {
    try {
      const [activeTab] = await queryTabs({
        active: true,
        currentWindow: true,
      });
      if (!activeTab?.id) {
        return { pageBlockedCount: 0 };
      }

      const raw = await sendMessage(activeTab.id, {
        type: MESSAGE_GET_PAGE_STATS,
      });
      return normalizePageStatsResponse(raw);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (!EXPECTED_MESSAGE_ERROR_PATTERN.test(msg)) {
        ui.statusText.textContent =
          "Page stats unavailable. Reload the page and try again.";
      }

      return { pageBlockedCount: 0 };
    }
  }

  function formatCount(value: number | undefined): string {
    return countFormatter.format(value ?? 0);
  }

  async function addCurrentSite(): Promise<void> {
    const [activeTab] = await queryTabs({ active: true, currentWindow: true });
    if (!activeTab?.url) {
      return;
    }

    const url = parseHttpUrl(activeTab.url);
    if (!url) {
      return;
    }

    const host = normalizeHost(url.hostname);
    if (!host) {
      return;
    }

    const result = await getStorage("sync", {
      [CUSTOM_HOSTS_KEY]: [] as string[],
    });
    const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

    if (!customHosts.includes(host)) {
      await setStorage("sync", {
        [CUSTOM_HOSTS_KEY]: [...customHosts, host],
      });
    }

    ui.statusText.textContent = `Enabled on ${host}. Refresh this page.`;
    ui.addCurrentSiteButton.disabled = true;
  }

  async function updateCurrentSiteButton(): Promise<void> {
    try {
      const [activeTab] = await queryTabs({
        active: true,
        currentWindow: true,
      });
      if (!activeTab?.url) {
        ui.addCurrentSiteButton.disabled = true;
        return;
      }

      const url = parseHttpUrl(activeTab.url);
      if (!url) {
        ui.addCurrentSiteButton.disabled = true;
        return;
      }

      const host = normalizeHost(url.hostname);
      const result = await getStorage("sync", {
        [CUSTOM_HOSTS_KEY]: [] as string[],
      });
      const customHosts = result[CUSTOM_HOSTS_KEY].map(normalizeHost);

      ui.addCurrentSiteButton.disabled =
        !host ||
        host.endsWith(".au") ||
        customHosts.some(
          (customHost: string) =>
            host === customHost || host.endsWith(`.${customHost}`)
        );
    } catch {
      ui.addCurrentSiteButton.disabled = true;
    }
  }

  ui.toggle.addEventListener("click", () => {
    void saveState();
  });
  ui.addCurrentSiteButton.addEventListener("click", () => {
    void addCurrentSite();
  });
  void loadState();
  void updateCurrentSiteButton();
}

const ui = resolvePopupUi();
if (ui) {
  bindPopup(ui);
}
