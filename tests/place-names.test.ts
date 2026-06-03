import { describe, expect, it } from "vitest";

import {
  preserveCase,
  replacePlaceNamesInText,
  replacePlaceNamesInTextWithMatches,
} from "../src/place-names";

describe("place-names", () => {
  it("replaces known place tokens conservatively", () => {
    expect(replacePlaceNamesInText("Visit Naarm today")).toContain("Melbourne");
    expect(replacePlaceNamesInText("We went to K'gari.")).toContain(
      "Fraser Island"
    );
  });

  it("counts each replacement separately", () => {
    const result = replacePlaceNamesInTextWithMatches(
      "Naarm and nipaluna are cities"
    );

    expect(result.text).toBe("Melbourne and hobart are cities");
    expect(result.matches).toEqual([
      { from: "Naarm", to: "Melbourne", count: 1 },
      { from: "nipaluna", to: "Hobart", count: 1 },
    ]);
  });

  it("counts repeated tokens in the same string", () => {
    const result = replacePlaceNamesInTextWithMatches("Naarm, Naarm");

    expect(result.matches).toEqual([
      { from: "Naarm", to: "Melbourne", count: 2 },
    ]);
  });

  it("preserves coarse casing hints", () => {
    expect(preserveCase("melbourne", "NAARM")).toBe("MELBOURNE");
    expect(preserveCase("Melbourne", "naarm")).toBe("melbourne");
    expect(preserveCase("Melbourne", "Naarm")).toBe("Melbourne");
  });
});
