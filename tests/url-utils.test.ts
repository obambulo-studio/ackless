import { describe, expect, it } from "vitest";

import { parseHttpUrl } from "../src/url-utils";

describe("parseHttpUrl", () => {
  it("accepts http and https origins only", () => {
    expect(parseHttpUrl("https://example.com/path?q=1")?.hostname).toBe(
      "example.com"
    );
    expect(parseHttpUrl("http://localhost:8080")).not.toBeNull();
    expect(parseHttpUrl("file:///tmp/x")).toBeNull();
    expect(parseHttpUrl("ftp://example.com")).toBeNull();
    expect(parseHttpUrl("not a url")).toBeNull();
  });
});
