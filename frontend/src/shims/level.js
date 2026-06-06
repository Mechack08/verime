/**
 * ESM shim for the `level` package.
 *
 * level/browser.js is CJS (`exports.Level = require('browser-level').BrowserLevel`);
 * Midnight imports `import { Level } from 'level'`.
 */
import browserLevel from "browser-level";

export const Level =
  browserLevel.BrowserLevel ?? browserLevel.default?.BrowserLevel ?? browserLevel;
