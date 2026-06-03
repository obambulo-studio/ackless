import { describe, expect, it } from "vitest";

import { formatBadgeCount } from "../src/badge";

describe("formatBadgeCount", () => {
  it("returns empty text when nothing was hidden", () => {
    expect(formatBadgeCount(0)).toBe("");
  });

  it("shows the exact count under 1000", () => {
    expect(formatBadgeCount(1)).toBe("1");
    expect(formatBadgeCount(42)).toBe("42");
    expect(formatBadgeCount(999)).toBe("999");
  });

  it("caps large counts like ad blockers", () => {
    expect(formatBadgeCount(1000)).toBe("999+");
    expect(formatBadgeCount(5000)).toBe("999+");
  });
});
