import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

/** Ultracite defaults + Ackless overrides (hoisted `function` declarations are intentional here). */
export default defineConfig({
  extends: [core],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "func-style": "off",
    "no-negated-condition": "off",
    "no-use-before-define": "off",
    /** Chrome MV3 callbacks need explicit `Promise` wrapping when `browser.*` promises are unavailable. */
    "promise/avoid-new": "off",
    "promise/prefer-await-to-then": "off",
  },
});
