import { describe, expect, it } from "vitest";

import {
  ACKNOWLEDGEMENT_TEXT_MAX_LENGTH,
  textMatchesAcknowledgement,
} from "../src/acknowledgement";

describe("textMatchesAcknowledgement", () => {
  it("matches common acknowledgement phrases", () => {
    expect(textMatchesAcknowledgement("Welcome to Country")).toBe(true);
    expect(textMatchesAcknowledgement("Acknowledgement of Country")).toBe(true);
    expect(
      textMatchesAcknowledgement("We acknowledge Traditional Owners.")
    ).toBe(true);
    expect(textMatchesAcknowledgement("Sovereignty was never ceded.")).toBe(
      true
    );
  });

  it("rejects unrelated strings", () => {
    expect(textMatchesAcknowledgement("Today's weather")).toBe(false);
    expect(textMatchesAcknowledgement("")).toBe(false);
  });

  it("rejects very long blobs", () => {
    const longText = `${"word ".repeat(600)}welcome to country`;
    expect(longText.length).toBeGreaterThan(ACKNOWLEDGEMENT_TEXT_MAX_LENGTH);
    expect(textMatchesAcknowledgement(longText)).toBe(false);
  });
});
