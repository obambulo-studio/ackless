import { ACTIVITY_KEY, getActivitySummary } from "./activity-stats";
import {
  STORAGE_KEY,
  CUSTOM_HOSTS_KEY,
  ACTIVITY_PAGE_PATH,
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
  activitySummary: HTMLElement;
  viewActivityButton: HTMLButtonElement;
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
  const activitySummary = document.querySelector("#activity-summary");
  const viewActivityButton = document.querySelector("#view-activity");
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
  if (!(activitySummary instanceof HTMLElement)) {
    reportBootstrapFailure(
      statusSlot,
      "Ackless UI failed to load. Reinstall the extension."
    );
    return null;
  }
  if (!(viewActivityButton instanceof HTMLButtonElement)) {
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
    activitySummary,
    addCurrentSiteButton,
    statusText,
    toggle,
    toggleState,
    viewActivityButton,
  };
}

function bindPopup(ui: PopupUi): void {
  async function loadState(): Promise<void> {
    const syncState = await getStorage("sync", { [STORAGE_KEY]: true });
    const summary = await getActivitySummary();

    setEnabledState(syncState[STORAGE_KEY] !== false);
    ui.activitySummary.textContent = `${formatCount(summary.blocks)} hidden · ${formatCount(summary.renames)} renamed in last 24 hours`;
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

  function createTab(
    createProperties: chrome.tabs.CreateProperties
  ): Promise<chrome.tabs.Tab> {
    const result = api.tabs.create(createProperties);

    if (result && typeof result.then === "function") {
      return result;
    }

    return new Promise((resolve) => {
      api.tabs.create(createProperties, resolve);
    });
  }

  function updateTab(
    tabId: number,
    updateProperties: chrome.tabs.UpdateProperties
  ): Promise<chrome.tabs.Tab | undefined> {
    const result = api.tabs.update(tabId, updateProperties);

    if (result && typeof result.then === "function") {
      return result;
    }

    return new Promise((resolve) => {
      api.tabs.update(tabId, updateProperties, resolve);
    });
  }

  async function openActivityTab(): Promise<void> {
    const activityUrl = api.runtime.getURL(ACTIVITY_PAGE_PATH);
    const tabs = await queryTabs({});
    const existing = tabs.find((tab) => tab.url === activityUrl);

    if (existing?.id !== undefined) {
      await updateTab(existing.id, { active: true });
      return;
    }

    await createTab({ url: activityUrl });
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
  ui.viewActivityButton.addEventListener("click", () => {
    void openActivityTab();
  });
  ui.addCurrentSiteButton.addEventListener("click", () => {
    void addCurrentSite();
  });

  api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && ACTIVITY_KEY in changes) {
      void loadState();
    }
  });

  void loadState();
  void updateCurrentSiteButton();
}

const ui = resolvePopupUi();
if (ui) {
  bindPopup(ui);
}
