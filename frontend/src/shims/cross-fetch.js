/**
 * ESM shim for cross-fetch.
 *
 * cross-fetch's browser-ponyfill.js is CJS-only; Midnight packages import
 * both `import fetch from 'cross-fetch'` and `import { fetch } from 'cross-fetch'`.
 */
const fetchFn = globalThis.fetch.bind(globalThis);
const Headers = globalThis.Headers;
const Request = globalThis.Request;
const Response = globalThis.Response;

export { fetchFn as fetch, Headers, Request, Response };
export default fetchFn;
