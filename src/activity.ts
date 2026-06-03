import {
  ACTIVITY_KEY,
  downloadActivityExport,
  getActivityData,
  getActivitySummary,
  type ActivityEvent,
  type ActivitySummary,
  type RenamePairSummary,
} from "./activity-stats";
import {
  MESSAGE_CLEAR_ACTIVITY,
  getApi,
  sendRuntimeMessage,
} from "./shared";

const countFormatter = new Intl.NumberFormat();
const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

interface ActivityUi {
  totalBlocks: HTMLElement;
  totalRenames: HTMLElement;
  blocksList: HTMLUListElement;
  renamesTableBody: HTMLTableSectionElement;
  exportButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  statusText: HTMLElement;
}

function resolveActivityUi(): ActivityUi | null {
  const totalBlocks = document.querySelector("#total-blocks");
  const totalRenames = document.querySelector("#total-renames");
  const blocksList = document.querySelector("#blocks-list");
  const renamesTableBody = document.querySelector("#renames-table-body");
  const exportButton = document.querySelector("#export-activity");
  const clearButton = document.querySelector("#clear-activity");
  const statusText = document.querySelector("#status");

  if (!(totalBlocks instanceof HTMLElement)) {
    return null;
  }
  if (!(totalRenames instanceof HTMLElement)) {
    return null;
  }
  if (!(blocksList instanceof HTMLUListElement)) {
    return null;
  }
  if (!(renamesTableBody instanceof HTMLTableSectionElement)) {
    return null;
  }
  if (!(exportButton instanceof HTMLButtonElement)) {
    return null;
  }
  if (!(clearButton instanceof HTMLButtonElement)) {
    return null;
  }
  if (!(statusText instanceof HTMLElement)) {
    return null;
  }

  return {
    blocksList,
    clearButton,
    exportButton,
    renamesTableBody,
    statusText,
    totalBlocks,
    totalRenames,
  };
}

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function formatRelativeTime(timestamp: number): string {
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return relativeTimeFormatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return relativeTimeFormatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return relativeTimeFormatter.format(deltaDays, "day");
}

function renderOverview(ui: ActivityUi, summary: ActivitySummary): void {
  ui.totalBlocks.textContent = formatCount(summary.blocks);
  ui.totalRenames.textContent = formatCount(summary.renames);
}

function renderBlocksList(ui: ActivityUi, summary: ActivitySummary): void {
  ui.blocksList.replaceChildren();

  if (summary.blockEvents.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "recent-list__empty";
    emptyItem.textContent = "Nothing hidden in the last 24 hours.";
    ui.blocksList.append(emptyItem);
    return;
  }

  for (const event of summary.blockEvents) {
    ui.blocksList.append(createBlockItem(event));
  }
}

function createBlockItem(event: ActivityEvent): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "recent-list__item recent-list__item--block";

  const detail = document.createElement("div");
  detail.className = "recent-list__detail";

  const excerpt = document.createElement("span");
  excerpt.className = "recent-list__excerpt";
  excerpt.textContent = event.excerpt || "Acknowledgement hidden";

  const host = document.createElement("span");
  host.className = "recent-list__host";
  host.textContent = event.host;

  detail.append(excerpt, host);

  const time = document.createElement("span");
  time.className = "recent-list__time";
  time.textContent = formatRelativeTime(event.timestamp);

  item.append(detail, time);
  return item;
}

function renderRenamesTable(ui: ActivityUi, summary: ActivitySummary): void {
  ui.renamesTableBody.replaceChildren();

  if (summary.renamePairs.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty-cell";
    cell.textContent = "No renames in the last 24 hours.";
    row.append(cell);
    ui.renamesTableBody.append(row);
    return;
  }

  for (const pair of summary.renamePairs) {
    ui.renamesTableBody.append(createRenameRow(pair));
  }
}

function createRenameRow(pair: RenamePairSummary): HTMLTableRowElement {
  const row = document.createElement("tr");

  const fromCell = document.createElement("td");
  fromCell.textContent = pair.from;

  const toCell = document.createElement("td");
  toCell.textContent = pair.to;

  const countCell = document.createElement("td");
  countCell.textContent = formatCount(pair.count);

  row.append(fromCell, toCell, countCell);
  return row;
}

function renderActivity(ui: ActivityUi, summary: ActivitySummary): void {
  renderOverview(ui, summary);
  renderBlocksList(ui, summary);
  renderRenamesTable(ui, summary);
}

function bindActivity(ui: ActivityUi): void {
  async function loadActivity(): Promise<void> {
    const summary = await getActivitySummary();
    renderActivity(ui, summary);
  }

  ui.exportButton.addEventListener("click", () => {
    void (async () => {
      const data = await getActivityData();
      downloadActivityExport(data);
      ui.statusText.textContent = "Activity exported.";
    })();
  });

  ui.clearButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Clear all Ackless activity from the last 24 hours?"
    );
    if (!confirmed) {
      return;
    }

    void (async () => {
      await sendRuntimeMessage({ type: MESSAGE_CLEAR_ACTIVITY });
      await loadActivity();
      ui.statusText.textContent = "Activity cleared.";
    })();
  });

  const api = getApi();
  api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && ACTIVITY_KEY in changes) {
      void loadActivity();
    }
  });

  void loadActivity();
}

const ui = resolveActivityUi();
if (ui) {
  bindActivity(ui);
}
