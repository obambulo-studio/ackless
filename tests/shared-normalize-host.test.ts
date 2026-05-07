import { describe, expect, it } from "vitest";

import { normalizeHost } from "../src/shared";

describe("normalizeHost", () => {
  it("trims, lowercases, and strips wildcard suffix dot-domain prefixes", () => {
    expect(normalizeHost("  NEWS.Example.COM. ")).toBe("news.example.com");
    expect(normalizeHost("*.EXAMPLE.org")).toBe("example.org");
    expect(normalizeHost("example.com.")).toBe("example.com");
  });
});
