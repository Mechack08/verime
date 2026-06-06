/**
 * patch-deps.mjs — Post-install patches for CJS/ESM incompatibilities.
 *
 * Problem: Several @midnight-ntwrk packages import CJS modules (object-inspect,
 * buffer) using ESM `import` syntax. In Vite's dev server with pnpm's isolated
 * store, these files are served raw via /@fs/ — bypassing all esbuild pre-bundling
 * and plugin transforms — so the browser receives CJS files with no ESM exports.
 *
 * Fixes applied:
 * 1. compact-runtime/dist/error.js — replaces `import inspect from 'object-inspect'`
 *    with an inline implementation (only used for error message formatting).
 * 2. frontend/src/shims/buffer-esm.js — a pre-built ESM bundle of buffer@6 with
 *    proper named exports. Regenerated here so it stays in sync with the installed version.
 *    Vite aliases `'buffer'` → this file in vite.config.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ── Patch 1: compact-runtime object-inspect ─────────────────────────────────

function findCompactRuntimeErrorJs() {
  const pnpmDir = path.join(root, "node_modules/.pnpm");
  if (!fs.existsSync(pnpmDir)) return null;
  const entries = fs.readdirSync(pnpmDir);
  const match = entries.find((e) => e.startsWith("@midnight-ntwrk+compact-runtime@"));
  if (!match) return null;
  const target = path.join(
    pnpmDir,
    match,
    "node_modules/@midnight-ntwrk/compact-runtime/dist/error.js",
  );
  return fs.existsSync(target) ? target : null;
}

const RUNTIME_TARGET = findCompactRuntimeErrorJs();

const ORIGINAL_IMPORT = `import inspect from 'object-inspect';`;
const INLINE_IMPL = `const inspect = (x) => { try { return JSON.stringify(x) ?? String(x); } catch { return String(x); } };`;

if (!RUNTIME_TARGET) {
  console.log("[patch-deps] compact-runtime not found — skipping patch 1");
} else {
  const content = fs.readFileSync(RUNTIME_TARGET, "utf-8");
  if (content.includes(INLINE_IMPL)) {
    console.log("[patch-deps] compact-runtime already patched");
  } else if (content.includes(ORIGINAL_IMPORT)) {
    fs.writeFileSync(RUNTIME_TARGET, content.replace(ORIGINAL_IMPORT, INLINE_IMPL));
    console.log("[patch-deps] patched compact-runtime/dist/error.js");
  } else {
    console.warn("[patch-deps] WARNING: compact-runtime/dist/error.js has unexpected content — skipping patch");
  }
}

// ── Patch 2: buffer@6 — add exports field pointing to ESM bundle ────────────
//
// buffer@6 is pure-CJS. Midnight SDK .mjs files do `import { Buffer } from 'buffer'`
// which gets served as raw CJS via /@fs/ (no named exports).
// Fix: bundle buffer as ESM once, place it alongside index.js, and add an
// `exports` field to buffer's package.json so Vite uses the ESM file for
// `import` conditions — regardless of which package is doing the importing.

const BUFFER_PKG_DIR = path.join(
  root,
  "node_modules/.pnpm/buffer@6.0.3/node_modules/buffer",
);
const BUFFER_SRC = path.join(BUFFER_PKG_DIR, "index.js");
const BUFFER_ESM_IN_PKG = path.join(BUFFER_PKG_DIR, "buffer-esm.js");
const BUFFER_ESM_SHIM = path.join(root, "frontend/src/shims/buffer-esm.js");
const ESBUILD = path.join(
  root,
  "node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild/bin/esbuild",
);

if (!fs.existsSync(BUFFER_SRC)) {
  console.log("[patch-deps] buffer@6.0.3 not found — skipping patch 2");
} else if (!fs.existsSync(ESBUILD)) {
  console.warn("[patch-deps] esbuild binary not found — skipping buffer ESM patch");
} else {
  // Copy original to a .js temp file so esbuild accepts it (it rejects .orig extension)
  const BUFFER_ORIG = path.join(BUFFER_PKG_DIR, "index.js.orig");
  const BUFFER_TMP  = path.join(BUFFER_PKG_DIR, "index-orig-tmp.js");
  if (!fs.existsSync(BUFFER_ORIG)) fs.copyFileSync(BUFFER_SRC, BUFFER_ORIG);
  fs.copyFileSync(BUFFER_ORIG, BUFFER_TMP);

  // Build ESM bundle — no legal comments so the file ends predictably with
  // `export default require_index_orig_tmp();` and nothing after it.
  execSync(
    `"${ESBUILD}" "${BUFFER_TMP}" --bundle --format=esm --platform=browser --target=es2020 --legal-comments=none --outfile="${BUFFER_ESM_IN_PKG}"`,
    { stdio: "pipe", cwd: BUFFER_PKG_DIR },
  );
  fs.unlinkSync(BUFFER_TMP);

  // Replace `export default require_index_orig_tmp()` with named exports.
  // Using string replace (not line removal) so we're not fragile to trailing content.
  const content = fs.readFileSync(BUFFER_ESM_IN_PKG, "utf-8");
  const exportLine = content.match(/^export default require_\w+\(\);$/m)?.[0];
  if (!exportLine) throw new Error("[patch-deps] could not find export default line in buffer ESM bundle");
  const fnName = exportLine.match(/require_(\w+)/)[0]; // e.g. require_index_orig_tmp
  const fixed = content.replace(
    exportLine,
    [
      `var _buf = ${fnName}();`,
      "export var Buffer = _buf.Buffer;",
      "export var SlowBuffer = _buf.SlowBuffer;",
      "export var INSPECT_MAX_BYTES = _buf.INSPECT_MAX_BYTES;",
      "export var kMaxLength = _buf.kMaxLength;",
      "export default _buf;",
    ].join("\n"),
  );
  fs.writeFileSync(BUFFER_ESM_IN_PKG, fixed);

  // Keep the frontend shim and index.js in sync
  fs.copyFileSync(BUFFER_ESM_IN_PKG, BUFFER_ESM_SHIM);
  fs.copyFileSync(BUFFER_ESM_IN_PKG, BUFFER_SRC); // replace index.js with ESM

  console.log("[patch-deps] patched buffer@6.0.3/index.js with ESM bundle");
}
