/**
 * Zip repository sources for Mozilla AMO "source code" upload.
 * Excludes dist/, node_modules/, and other non-source artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const outZip = path.join(distDir, "ackless-amo-source.zip");

const includePaths = [
  "manifest.json",
  "package.json",
  "bun.lock",
  "tsconfig.json",
  "vitest.config.ts",
  "oxfmt.config.ts",
  "oxlint.config.ts",
  "LICENSE",
  "README.md",
  "CONTRIBUTING.md",
  "SOURCE_SUBMISSION.md",
  "PRIVACY.md",
  "docs",
  "icons",
  "scripts",
  "src",
  "tests",
  "test-page.html",
];

fs.mkdirSync(distDir, { recursive: true });

const existing = includePaths.filter((entry) =>
  fs.existsSync(path.join(root, entry))
);

if (existing.length === 0) {
  console.error("No files to package.");
  process.exit(1);
}

if (fs.existsSync(outZip)) {
  fs.rmSync(outZip);
}

const zipArgs = ["-r", outZip, ...existing];
const result = spawnSync("zip", zipArgs, { cwd: root, stdio: "inherit" });

if (result.status !== 0) {
  console.error(
    "zip failed. Install zip (macOS/Linux) or archive the listed paths manually."
  );
  process.exit(result.status ?? 1);
}

console.log(`Created ${outZip}`);
