/**
 * ESM shim for the `object-inspect` CJS package.
 *
 * @midnight-ntwrk/compact-runtime imports object-inspect as:
 *   import inspect from 'object-inspect'
 * and uses it only to format values in error messages:
 *   `expected value of type ${type} but received ${inspect(x)}`
 *
 * The real package is pure-CJS and causes a "no export named 'default'"
 * error when served raw by Vite. This shim provides an identical interface
 * as a proper ESM module with a default export.
 */
export default function inspect(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? Object.prototype.toString.call(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
