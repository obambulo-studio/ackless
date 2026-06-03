/**
 * Production bundles intentionally duplicate shared modules (content + popup each embed ./shared).
 * Keeps manifest simple (no ES-module content scripts) at the cost of a little duplicated bytes.
 */
import fs from "node:fs";
import path from "node:path";

import * as esbuild from "esbuild";

const __dirname = import.meta.dirname;
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { force: true, recursive: true });
fs.mkdirSync(path.join(dist, "src"), { recursive: true });

const browserTarget = "es2022";

await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, "src/content.ts")],
  format: "iife",
  outfile: path.join(dist, "src/content.js"),
  platform: "browser",
  target: browserTarget,
});

await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, "src/background.ts")],
  format: "iife",
  outfile: path.join(dist, "src/background.js"),
  platform: "browser",
  target: browserTarget,
});

await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, "src/popup.ts")],
  format: "iife",
  outfile: path.join(dist, "src/popup.js"),
  platform: "browser",
  target: browserTarget,
});

await esbuild.build({
  bundle: true,
  entryPoints: [path.join(root, "src/activity.ts")],
  format: "iife",
  outfile: path.join(dist, "src/activity.js"),
  platform: "browser",
  target: browserTarget,
});

fs.copyFileSync(
  path.join(root, "manifest.json"),
  path.join(dist, "manifest.json")
);
fs.cpSync(path.join(root, "icons"), path.join(dist, "icons"), {
  recursive: true,
});
fs.copyFileSync(
  path.join(root, "src/popup.html"),
  path.join(dist, "src/popup.html")
);
fs.copyFileSync(
  path.join(root, "src/popup.css"),
  path.join(dist, "src/popup.css")
);
fs.copyFileSync(
  path.join(root, "src/activity.html"),
  path.join(dist, "src/activity.html")
);
fs.copyFileSync(
  path.join(root, "src/activity.css"),
  path.join(dist, "src/activity.css")
);

for (const file of ["README.md", "LICENSE"]) {
  const from = path.join(root, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(dist, file));
  }
}
