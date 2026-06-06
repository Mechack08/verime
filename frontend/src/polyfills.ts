/**
 * Browser polyfills required by Midnight SDK dependencies.
 * Must be imported before any Midnight modules load.
 */
import { Buffer } from "buffer";
import process from "process";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

// Full process shim — WASM bindings read globalThis.process at init time.
globalThis.process = process;

if (typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}

// Eagerly load compact-runtime WASM while process is guaranteed to exist.
import "@verime/sdk/commitment";

// Pre-bundle browser-level (CJS) before on-chain code loads it lazily.
import "./shims/level.js";
