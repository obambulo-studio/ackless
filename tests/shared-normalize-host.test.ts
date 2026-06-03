import { describe, expect, it } from "vitest";

import { getActivityHost, normalizeHost } from "../src/shared";

describe("normalizeHost", () => {
  it("trims, lowercases, and strips wildcard suffix dot-domain prefixes", () => {
    expect(normalizeHost("  NEWS.Example.COM. ")).toBe("news.example.com");
    expect(normalizeHost("*.EXAMPLE.org")).toBe("example.org");
    expect(normalizeHost("example.com.")).toBe("example.com");
  });
});

describe("getActivityHost", () => {
  it("uses the normalized hostname when present", () => {
    expect(
      getActivityHost({ hostname: "WWW.Example.COM", protocol: "https:" })
    ).toBe("www.example.com");
  });

  it("falls back for local file pages", () => {
    expect(getActivityHost({ hostname: "", protocol: "file:" })).toBe(
      "local-file"
    );
  });

  it("falls back when hostname is missing on non-file pages", () => {
    expect(getActivityHost({ hostname: "", protocol: "https:" })).toBe(
      "unknown-host"
    );
  });
});
