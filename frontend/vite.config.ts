import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const generatedDir = path.resolve(__dirname, "../generated");
const ledgerV8Browser = path.resolve(
  __dirname,
  "node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm.js",
);
const onchainRuntimeBrowser = path.resolve(
  __dirname,
  "node_modules/@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js",
);
const processShim = path.resolve(
  __dirname,
  "node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js",
);

const MIDNIGHT_OPTIMIZE_EXCLUDE = [
  "@midnight-ntwrk/compact-runtime",
  "@midnight-ntwrk/ledger-v8",
  "@midnight-ntwrk/midnight-js-contracts",
  "@midnight-ntwrk/midnight-js-protocol",
  "@midnight-ntwrk/midnight-js-types",
  "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
  "@midnight-ntwrk/midnight-js-fetch-zk-config-provider",
  "@midnight-ntwrk/midnight-js-level-private-state-provider",
  "@midnight-ntwrk/midnight-js-network-id",
  "@midnight-ntwrk/midnight-js-utils",
];

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function zkArtifactsPlugin() {
  return {
    name: "zk-artifacts",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/zk", (req, res, next) => {
        const urlPath = req.url ?? "/";
        const relative = urlPath.replace(/^\//, "");
        const filePath = path.join(generatedDir, relative);
        if (!filePath.startsWith(generatedDir) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist/zk");
      for (const sub of ["keys", "zkir"]) {
        const src = path.join(generatedDir, sub);
        if (fs.existsSync(src)) {
          copyDirRecursive(src, path.join(outDir, sub));
        }
      }
    },
  };
}

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
  plugins: [
    nodePolyfills({
      include: ["process", "buffer", "util", "stream", "events"],
      globals: {
        Buffer: true,
        process: true,
        global: true,
      },
    }),
    wasm(),
    topLevelAwait(),
    react(),
    tailwindcss(),
    zkArtifactsPlugin(),
  ],
  resolve: {
    // Prefer .ts over stale compiled .js artifacts in src/ (default puts .js first).
    extensions: [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json"],
    conditions: ["browser", "import", "module", "default"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@verime/sdk": path.resolve(__dirname, "../sdk/src"),
      "object-inspect": path.resolve(__dirname, "./src/shims/object-inspect.js"),
      buffer: path.resolve(__dirname, "./src/shims/buffer-esm.js"),
      process: processShim,
      "process/browser": processShim,
      "cross-fetch": path.resolve(__dirname, "./src/shims/cross-fetch.js"),
      level: path.resolve(__dirname, "./src/shims/level.js"),
      "isomorphic-ws": path.resolve(__dirname, "./src/shims/isomorphic-ws.js"),
      "@midnight-ntwrk/onchain-runtime-v3": onchainRuntimeBrowser,
      "@midnight-ntwrk/compact-runtime": path.resolve(
        __dirname,
        "node_modules/@midnight-ntwrk/compact-runtime",
      ),
      // ledger-v8 is WASM; midnight-js-protocol/ledger re-exports break esbuild pre-bundle.
      "@midnight-ntwrk/midnight-js-protocol/ledger": ledgerV8Browser,
      "@midnight-ntwrk/ledger-v8": ledgerV8Browser,
    },
  },
  optimizeDeps: {
    exclude: MIDNIGHT_OPTIMIZE_EXCLUDE,
    // Force CJS→ESM conversion for CommonJS leaves reached through raw-served
    // (excluded) Midnight packages. The `parent > child` form pre-bundles the
    // child without optimizing the WASM-importing parent.
    include: [
      "browser-level",
      "abstract-level",
      "@midnight-ntwrk/wallet-sdk-address-format > @subsquid/scale-codec",
    ],
    needsInterop: ["browser-level", "abstract-level"],
    esbuildOptions: {
      conditions: ["browser", "import", "module", "default"],
    },
  },
  ssr: {
    noExternal: MIDNIGHT_OPTIMIZE_EXCLUDE,
  },
  worker: {
    format: "es",
    plugins: () => [
      nodePolyfills({
        include: ["process", "buffer", "util", "stream", "events"],
        globals: { Buffer: true, process: true, global: true },
      }),
      wasm(),
      topLevelAwait(),
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
