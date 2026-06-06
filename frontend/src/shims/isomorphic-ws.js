/**
 * Browser shim for isomorphic-ws — re-exports the native WebSocket.
 */
const WS = typeof globalThis.WebSocket !== "undefined" ? globalThis.WebSocket : class {};

export { WS as WebSocket };
export default WS;
