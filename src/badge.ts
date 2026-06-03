import { getActivitySummary } from "./activity-stats";

export const BADGE_BACKGROUND_COLOR = "#DC2626";

export function formatBadgeCount(blocks: number): string {
  if (blocks <= 0) {
    return "";
  }

  if (blocks > 999) {
    return "999+";
  }

  return String(blocks);
}

type ActionApi = Pick<
  typeof chrome.action,
  "setBadgeBackgroundColor" | "setBadgeText"
>;

function setBadgeText(
  action: ActionApi,
  details: chrome.action.BadgeTextDetails
): Promise<void> {
  const result = action.setBadgeText(details);

  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve) => {
    action.setBadgeText(details, () => {
      resolve();
    });
  });
}

function setBadgeBackgroundColor(
  action: ActionApi,
  details: chrome.action.BadgeColorDetails
): Promise<void> {
  const result = action.setBadgeBackgroundColor(details);

  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve) => {
    action.setBadgeBackgroundColor(details, () => {
      resolve();
    });
  });
}

export async function updateActionBadge(action: ActionApi): Promise<void> {
  const summary = await getActivitySummary();
  const text = formatBadgeCount(summary.blocks);

  await setBadgeText(action, { text });

  if (text) {
    await setBadgeBackgroundColor(action, { color: BADGE_BACKGROUND_COLOR });
  }
}
