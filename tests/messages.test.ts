import { describe, expect, it } from "vitest";

import {
  isPageStatsRequestMessage,
  normalizePageStatsResponse,
} from "../src/messages";
import { MESSAGE_GET_PAGE_STATS } from "../src/shared";

describe("page stats messaging", () => {
  it("recognizes request payloads", () => {
    expect(isPageStatsRequestMessage({ type: MESSAGE_GET_PAGE_STATS })).toBe(
      true
    );
    expect(isPageStatsRequestMessage({ type: "other" })).toBe(false);
    expect(isPageStatsRequestMessage(null)).toBe(false);
  });

  it("normalizes response payloads defensively", () => {
    expect(
      normalizePageStatsResponse({ pageBlockedCount: 3, pageRenameCount: 2 })
    ).toEqual({
      pageBlockedCount: 3,
      pageRenameCount: 2,
    });
    expect(
      normalizePageStatsResponse({ pageBlockedCount: Number.NaN })
    ).toEqual({
      pageBlockedCount: 0,
      pageRenameCount: 0,
    });
    expect(normalizePageStatsResponse({ pageBlockedCount: "x" })).toEqual({
      pageBlockedCount: 0,
      pageRenameCount: 0,
    });
    expect(normalizePageStatsResponse()).toEqual({
      pageBlockedCount: 0,
      pageRenameCount: 0,
    });
  });
});
