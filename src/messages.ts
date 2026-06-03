import {
  MESSAGE_CLEAR_ACTIVITY,
  MESSAGE_GET_PAGE_STATS,
  MESSAGE_RECORD_BLOCKS,
  MESSAGE_RECORD_RENAMES,
} from "./shared";

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

export function isRecordBlocksMessage(
  message: unknown
): message is {
  type: typeof MESSAGE_RECORD_BLOCKS;
  host: string;
  blocks: Array<{ excerpt: string }>;
} {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === MESSAGE_RECORD_BLOCKS &&
    "host" in message &&
    typeof message.host === "string" &&
    "blocks" in message &&
    Array.isArray(message.blocks) &&
    message.blocks.every(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "excerpt" in block &&
        typeof block.excerpt === "string"
    )
  );
}

export function isRecordRenamesMessage(
  message: unknown
): message is {
  type: typeof MESSAGE_RECORD_RENAMES;
  host: string;
  matches: Array<{ from: string; to: string; count: number }>;
} {
  if (
    typeof message !== "object" ||
    message === null ||
    !("type" in message) ||
    message.type !== MESSAGE_RECORD_RENAMES ||
    !("host" in message) ||
    typeof message.host !== "string" ||
    !("matches" in message) ||
    !Array.isArray(message.matches)
  ) {
    return false;
  }

  return message.matches.every(
    (match) =>
      typeof match === "object" &&
      match !== null &&
      typeof match.from === "string" &&
      typeof match.to === "string" &&
      typeof match.count === "number" &&
      Number.isFinite(match.count)
  );
}

export function isClearActivityMessage(
  message: unknown
): message is { type: typeof MESSAGE_CLEAR_ACTIVITY } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === MESSAGE_CLEAR_ACTIVITY
  );
}

export interface PageStatsResponse {
  pageBlockedCount: number;
  pageRenameCount: number;
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizePageStatsResponse(raw?: unknown): PageStatsResponse {
  if (typeof raw !== "object" || raw === null) {
    return { pageBlockedCount: 0, pageRenameCount: 0 };
  }

  const payload = raw as {
    pageBlockedCount?: unknown;
    pageRenameCount?: unknown;
  };

  return {
    pageBlockedCount: normalizeCount(payload.pageBlockedCount),
    pageRenameCount: normalizeCount(payload.pageRenameCount),
  };
}
