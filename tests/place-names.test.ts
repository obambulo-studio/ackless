import { describe, expect, it } from "vitest";

import { preserveCase, replacePlaceNamesInText } from "../src/place-names";

describe("place-names", () => {
  it("replaces known place tokens conservatively", () => {
    expect(replacePlaceNamesInText("Visit Naarm today")).toContain("Melbourne");
    expect(replacePlaceNamesInText("We went to K'gari.")).toContain(
      "Fraser Island"
    );
  });

  it("preserves coarse casing hints", () => {
    expect(preserveCase("melbourne", "NAARM")).toBe("MELBOURNE");
    expect(preserveCase("Melbourne", "naarm")).toBe("melbourne");
    expect(preserveCase("Melbourne", "Naarm")).toBe("Melbourne");
  });
});
