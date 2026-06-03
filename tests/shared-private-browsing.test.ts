import { describe, expect, it } from "vitest";

import { shouldPersistActivity } from "../src/shared";

describe("private browsing activity policy", () => {
  it("allows activity persistence outside private browsing", () => {
    expect(shouldPersistActivity()).toBe(true);
  });
});
