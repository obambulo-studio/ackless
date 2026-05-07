import { MESSAGE_GET_PAGE_STATS } from "./shared";

export function isPageStatsRequestMessage(
  message: unknown
): message is { type: typeof MESSAGE_GET_PAGE_STATS } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === MESSAGE_GET_PAGE_STATS
  );
}

export function normalizePageStatsResponse(raw?: unknown): {
  pageBlockedCount: number;
} {
  if (typeof raw !== "object" || raw === null || !("pageBlockedCount" in raw)) {
    return { pageBlockedCount: 0 };
  }

  const value = (raw as { pageBlockedCount: unknown }).pageBlockedCount;
  return {
    pageBlockedCount:
      typeof value === "number" && Number.isFinite(value) ? value : 0,
  };
}
