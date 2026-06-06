<div align="center">

# VeriMe

**Private age credentials on the Midnight Network.**

Prove that your age satisfies a predicate — *“Over 18”*, *“Between 18 and 35”* — without
disclosing your date of birth, document number, nationality, or any other identity data.

</div>

```
Scan ID locally  →  pick a predicate ("Over 18")  →  ZK proof generated in your browser
                 →  one 32-byte commitment optionally recorded on the Midnight ledger
```

| | |
|---|---|
| **Stays on your device** | Birth year, document number, nationality, the raw photo, your master secret |
| **Goes on-chain** | A single `Bytes<32>` commitment — computationally unlinkable to you without your private key |

Everything runs **client-side**. There is no backend that could ever see your data.

---

## Table of contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Quick start (clone &amp; run)](#quick-start-clone--run)
- [Generating a proof](#generating-a-proof)
- [Verifying a credential on-chain](#verifying-a-credential-on-chain)
- [How the zero-knowledge privacy works](#how-the-zero-knowledge-privacy-works)
- [Project structure](#project-structure)
- [Command reference](#command-reference)
- [Compiling the Compact contract](#compiling-the-compact-contract)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Tech stack](#tech-stack)

---

## How it works

1. **Scan your ID.** Your webcam reads the MRZ strip (the rows of `<` characters at the
   bottom of a passport or ID card). OCR runs locally via Tesseract WASM. Only the **birth
   year** is extracted; the image is never uploaded or stored.
2. **Pick a predicate.** Choose what to prove. A per-predicate secret is derived in-browser
   with `HMAC-SHA256(master_secret, "minAge:maxAge")` — your master secret never leaves the
   device and never enters a circuit.
3. **Generate the proof.** A Compact zero-knowledge circuit checks
   `age = currentYear − birthYear` against the predicate and outputs a 32-byte commitment.
   A **connected wallet is required**: the proof is submitted on-chain and the commitment is
   inserted into the contract’s public `proofs` set on the Midnight ledger.
4. **Share &amp; verify.** Hand a verifier the commitment (e.g. as a QR code). They confirm it
   is recorded and not revoked — without learning anything about you.

---

## Prerequisites

| Tool | Required version | Install |
|------|------------------|---------|
| Node.js | ≥ 20 | <https://nodejs.org> |
| pnpm | ≥ 9 | `npm install -g pnpm@9` |
| Docker | any recent | <https://docs.docker.com/get-docker/> — **only** for on-chain proofs |

Check your versions:

```bash
node --version   # must be v20 or higher
pnpm --version   # must be 9 or higher
```

> The **Compact compiler is not required** to run the app. The `generated/` directory is
> committed with the compiled contract bindings, ZK keys, and zkIR, so the app builds and
> runs out of the box. You only need the compiler if you change `contract/verime.compact`.

---

## Quick start (clone &amp; run)

These steps are designed to work with **zero errors** on a fresh machine.

```bash
# 1. Clone
git clone https://github.com/Mechack08/verime.git
cd verime

# 2. Install all workspace dependencies (a postinstall step patches a few deps automatically)
pnpm install

# 3. Start the app
pnpm start
```

Open **<http://localhost:5173>** (Vite will pick the next free port — e.g. `5174` — if
`5173` is taken; watch the terminal output for the exact URL).

The UI runs immediately — you can scan an ID and choose a predicate right away. **Generating
a proof requires a connected Midnight wallet** (and the proof server), since the credential is
recorded on-chain. See [Generating a proof](#generating-a-proof) below for the one-time setup.

> **No camera?** You still see the full flow; the scan step simply needs camera permission.
> Grant it via the lock icon in the address bar. `localhost` is treated as a secure origin,
> so the camera API works without HTTPS.

---

## Generating a proof

Proof generation always records the credential **on-chain**, so it requires a **Midnight
wallet** and the **proof server** (Docker). The app does not generate off-chain/local proofs.

**1. Install a Midnight wallet browser extension** and switch it to the **pre-production**
network (`preprod`). Any wallet that injects into `window.midnight` works (e.g. Lace for
Midnight). Fund it with test tokens so it can pay transaction fees.

**2. Start the proof server + app together:**

```bash
pnpm start:full                # starts the proof server on :6300, then the app
# in another terminal, optionally watch the server logs:
pnpm proof-server:logs
```

Or run them separately:

```bash
pnpm proof-server:start
pnpm start
```

Stop the proof server when finished:

```bash
pnpm proof-server:stop
```

**3. Connect the wallet** — click *Connect Wallet* in the top bar and approve the request.

**4. Generate &amp; record** — complete the scan flow and click *Generate &amp; Record On-Chain*.
The dApp builds the transaction, the wallet balances and submits it, and the commitment is
written to the contract’s `proofs` set.

> The network endpoints live in [`sdk/src/types.ts`](sdk/src/types.ts) as `PREPROD_CONFIG`.
> Change them there to target a different network.

---

## Verifying a credential on-chain

Verification is a **read-only** check over public ledger state — it needs **no wallet, no
fees, and no proving**. On the **My Credentials** page, click **Verify on-chain** on any
credential. The app queries the contract state from the indexer and reports:

| Result | Meaning |
|--------|---------|
| **Valid on-chain** | The commitment is in the contract’s `proofs` set and not revoked |
| **Revoked** | The matching revoke marker is in the `revoked` set |
| **Not found** | The commitment isn’t recorded — e.g. the issuing transaction never finalized |
| **Error** | The contract isn’t deployed yet, or the indexer hasn’t caught up |

This is the correct way to confirm a commitment — a generic block explorer cannot, because
the commitment is an element inside the contract’s state set, not a transaction or address.

---

## How the zero-knowledge privacy works

```
master_secret  (32 random bytes, localStorage only, never leaves the device)
     │
     ├─ HMAC-SHA256(·, "18:0")   → derived_secret  → persistentHash(·) → commitment (Over 18)
     ├─ HMAC-SHA256(·, "35:0")   → derived_secret' → persistentHash(·) → commitment (Over 35)
     └─ HMAC-SHA256(·, "revoke") → revoke_key      → persistentHash(·) → revocation marker
```

- Two proofs from the **same person** for **different predicates** produce different,
  **unlinkable** commitments.
- The Compact circuit only ever receives the already-derived scalar as a witness. The master
  secret never enters any circuit.
- Calling `revoke()` inserts the revocation marker once and invalidates **every** credential
  for that user — `verify_proof` then returns `false` for any of their commitments.

The contract ([`contract/verime.compact`](contract/verime.compact)) exposes three circuits:
`issue_proof` (prove age + record commitment), `verify_proof` (read-only validity check), and
`revoke` (self-revoke all credentials).

---

## Project structure

```
verime/
├── package.json               pnpm workspace root — all scripts live here
├── pnpm-workspace.yaml
│
├── contract/
│   ├── verime.compact          Compact smart contract (issue_proof / verify_proof / revoke)
│   └── Makefile                compile + keygen targets
│
├── generated/                  committed compiler output (no compiler needed to run)
│   ├── contract/               JS + TypeScript bindings imported by the SDK
│   ├── keys/                   .prover / .verifier keys (served at /zk in dev)
│   └── zkir/                   compiled ZK intermediate representation
│
├── sdk/                        framework-agnostic TypeScript SDK (@verime/sdk)
│   └── src/
│       ├── types.ts            shared types + PREPROD_CONFIG network endpoints
│       ├── secret.ts           master-secret + HMAC-SHA256 derivation
│       ├── commitment.ts       persistentHash commitment helper
│       ├── storage.ts          credential persistence (localStorage)
│       ├── contract-api.ts     VeriMeAPI — local proof + on-chain entry point
│       ├── contract-on-chain.ts on-chain issue_proof submission flow
│       ├── contract-verify.ts  read-only on-chain verification
│       └── providers.ts        Midnight provider factory (ZK, indexer, wallet)
│
├── frontend/                   React + Vite app (@verime/frontend)
│   └── src/
│       ├── pages/              Home, Scan (3-step flow), MyCredentials, BuildProof
│       ├── components/         Topbar, Footer, Logo, icons, ui/ (Button, Badge, …)
│       ├── hooks/              useWallet, useIdScanner, useProofGenerator
│       ├── contexts/           WalletContext
│       └── styles/globals.css  Tailwind v4 + Midnight design tokens
│
└── tests/
    └── contract/verime.test.ts 22 unit tests (Vitest)
```

---

## Command reference

Run everything from the **repo root** — no need to `cd` into sub-packages.

```bash
# ── Run ──────────────────────────────────────────────────────────────────────
pnpm start                 # start the app (local mode)            → http://localhost:5173
pnpm start:full            # start proof server + app (on-chain mode)

# ── Setup ────────────────────────────────────────────────────────────────────
pnpm install               # install all workspace deps (runs the dep patch postinstall)

# ── Develop ──────────────────────────────────────────────────────────────────
pnpm dev                   # alias of `pnpm start`
pnpm build                 # production build of the SDK + frontend → frontend/dist/
pnpm preview               # serve the production build locally

# ── Quality ──────────────────────────────────────────────────────────────────
pnpm test                  # run the unit tests (Vitest)
pnpm test:watch            # re-run tests on change
pnpm typecheck             # TypeScript check across sdk + frontend + tests

# ── Proof server (Docker — on-chain mode only) ───────────────────────────────
pnpm proof-server:start    # start the proof server on localhost:6300
pnpm proof-server:stop     # stop the container
pnpm proof-server:logs     # tail the container logs

# ── Contract (only if you edit verime.compact) ───────────────────────────────
pnpm contract:build:fast   # compile JS bindings only (skips ZK key generation)
pnpm contract:build        # full compile including .prover / .verifier keys
pnpm contract:clean        # delete generated/{contract,keys,zkir}

# ── Cleanup ──────────────────────────────────────────────────────────────────
pnpm clean                 # remove frontend/dist and sdk/dist
```

---

## Compiling the Compact contract

> Only needed if you modify [`contract/verime.compact`](contract/verime.compact).

1. Install the Compact compiler — see the
   [Midnight compiler docs](https://docs.midnight.network/develop/tutorial/building/compact-compiler).
2. Compile:

   ```bash
   pnpm contract:build:fast   # fast: JS bindings only, enough for local dev
   pnpm contract:build        # full: also regenerates .prover / .verifier keys
   ```

3. Output lands in `generated/{contract,keys,zkir}`. The frontend serves `generated/keys`
   and `generated/zkir` at the `/zk` route in dev so the proving stack can fetch them.

---

## Contributing

Contributions are welcome. Please follow this workflow:

1. **Fork &amp; branch.** Create a feature branch off `main`:

   ```bash
   git checkout -b feat/short-description
   ```

2. **Install &amp; develop.**

   ```bash
   pnpm install
   pnpm dev
   ```

3. **Keep the tree green.** Before committing, make sure all checks pass:

   ```bash
   pnpm typecheck   # no TypeScript errors
   pnpm test        # all unit tests pass
   pnpm build       # production build succeeds
   ```

4. **Coding conventions.**
   - TypeScript is **strict** (`strict` + `noUncheckedIndexedAccess`). No `any` unless
     unavoidable, and isolate it when it is.
   - Shared, framework-agnostic logic belongs in `sdk/`; React-specific code in `frontend/`.
   - UI uses the **design tokens** in `frontend/src/styles/globals.css` (CSS variables and the
     `vm-card` / `gradient-text` helpers) — avoid hardcoded hex colors in components.
   - Never log, persist, or transmit raw identity data (birth date, document number, images).
   - Keep contract changes and the generated artifacts in sync (`pnpm contract:build`).

5. **Commit style.** Use clear, conventional messages: `feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`. Keep commits focused.

6. **Open a PR** against `main` with a description of *what* changed and *why*, plus the
   output of the checks above. Link any related issue.

> Found a security issue? Please **do not** open a public issue — contact the maintainers
> privately first.

---

## Troubleshooting

**“No Midnight wallet detected.”**
Install a Midnight wallet extension, switch it to the `preprod` network, and refresh the page.

**The camera doesn’t appear on step 1.**
Grant camera permission via the lock icon in the address bar. The camera API requires a secure
origin — `localhost` qualifies, but a plain `http://` remote host will be blocked.

**“MRZ zone not detected” after scanning.**
Make sure the bottom rows of the document fill the dashed box and are well-lit. Avoid glare,
hold the document flat and still, and move it closer so it fills the frame.

**`ZKConfigurationReadError: Failed to read verifier key`.**
The proving stack couldn’t fetch the ZK artifacts. Confirm the dev server is running and that
`generated/keys` / `generated/zkir` exist (run `pnpm contract:build` if they’re missing).

**“Balance failed” / transaction errors in on-chain mode.**
Your wallet needs test funds on `preprod` to pay fees, the proof server must be running
(`pnpm proof-server:start`), and the wallet must be on the `preprod` network.

**Proof server connection refused.**
Run `pnpm proof-server:start`, wait ~10 s for the container to be ready, then verify with
`curl http://localhost:6300/health`.

**`pnpm install` fails with an engine error.**
You need Node.js ≥ 20. Check with `node --version`, then update via <https://nodejs.org> or
`nvm use 20`.

---

## Security notes

- **Master secret** — generated with `crypto.getRandomValues`, stored in `localStorage` under
  `verime:master_secret`. Back it up to retain your credentials; clearing site data loses them.
- **No images stored** — the webcam frame is handed to Tesseract WASM in memory and dropped
  immediately after OCR.
- **Birth year in `useRef`** — never placed in React state, so it does not surface in DevTools.
- **No backend** — the app is entirely client-side; there is no server that could leak data.
- **Pre-production by default** — switch `PREPROD_CONFIG` in `sdk/src/types.ts` for other
  networks.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, React Router 7 |
| Styling | Tailwind CSS v4 + custom Midnight design tokens |
| ZK contract | Compact language |
| ZK network | Midnight Network (pre-production) |
| Wallet | `@midnight-ntwrk/dapp-connector-api` v4 |
| Ledger / runtime | `@midnight-ntwrk/ledger-v8`, `compact-runtime`, `onchain-runtime-v3` |
| OCR | Tesseract.js (WASM, Web Worker) |
| MRZ parsing | `mrz` |
| Secret derivation | Web Crypto API — HMAC-SHA256 |
| Language | TypeScript 5.7 (strict + `noUncheckedIndexedAccess`) |
| Package manager | pnpm 9 workspaces |
| Tests | Vitest |
