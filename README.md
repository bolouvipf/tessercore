# Tessercore

> **AI-generated code you can trust, that becomes free through reuse.**
> Tiny kernel loads verified pure-function modules on demand; missing modules are drafted by Meta Muse models under a strict contract, verified without trusting one model, run in a WebAssembly sandbox, signed and cached.

- **Thesis:** Push the Frontier — give software a new capability at runtime, safely.
- **First customer (default, to validate — see `07_PRODUCT_AND_AUDIENCE.md`):** teams building AI agents/apps where the model must produce small tools at runtime and cannot afford unverified code.
- **Track:** Startups (solo). Built Oct 27–Nov 4 for the Meta Global AI Developer Hackathon.

## What existed before / what was built during the event

- **Existed before:** `github.com/bolouvipf/houetorwasm` (research study + prototype plugin host), used only as a *separate named resource / reference* — never copied into this repo.
- **Built during the event:** this repo (`tessercore`) — kernel, sandbox (QuickJS-WASM in Worker), seed modules, cache/offline, registry+signing, resolver T0–T3, LLM gateway (Meta models only), verification pipeline, benchmarks and demo. (Commit history is evidence; fill commit ranges at submission.)

## How it works

```
Browser (low-end)                         Server
+-----------------------------+           +--------------------------------+
| KERNEL (vanilla JS)         |  HTTPS    | LLM gateway (Meta models only) |
|  Resolver T0..T3            | <-------> | Registry (signed modules)      |
|  Module loader + verifier   |           | Signer (Ed25519)               |
|  Local cache (IndexedDB)    |           +--------------------------------+
| SANDBOX (Web Worker)        |
|  QuickJS compiled to WASM   |
+-----------------------------+
```

Tier loop per request: **T0 local cache → T1 rule-based registry → T2 Router (Muse) → T3 Generation (two Muse implementations) → verify → sign → cache → publish**.

## Meta models used at runtime

| Stage | Model id (config via env) | Why |
|-------|---------------------------|-----|
| T2 Router | `LLM_MODEL_ROUTER` (allowlisted) | |
| T3 Gen A | `LLM_MODEL_GEN_A` | |
| T3 Gen B | `LLM_MODEL_GEN_B` (ideally different Muse model for diversity — see 03_LLM_PIPELINE.md) | |

All model calls go through `server/llm.js` only, enforced by `MODEL_ALLOWLIST`. No non-Meta models at runtime. Plain keyword scoring for T1.

> Configure exact ids in `.env` from the official Model list; do not hard-code. See `.env.example`. Run `node scripts/check_llm.mjs` to verify.

## Dependencies and datasets

See `DEPENDENCIES.md` (mirrored here at submission time).

## Security model and verification

| Threat | Defense |
|--------|---------|
| DOM/cookie access | QuickJS inside Worker — no DOM |
| Network | No fetch/XHR/WS exposed to QuickJS |
| Infinite loop / memory bomb | QuickJS interrupt + Worker terminate watchdog |
| Wrong result | Differential testing (A vs B) + properties + examples + human confirmation |
| Tampering | sha256 + Ed25519 |

A valid signature proves **who** published a module, not that it is safe.

## Measurements and Limits

Results in `bench/results/*.json`. Limits section (honest, per `05_MEASUREMENTS.md`) to be filled from measurements — no invented numbers.

## Run it locally

```bash
cp .env.example .env  # fill LLM keys, allowlist, keypair
npm install
npm run dev        # or: npm --prefix server start  &  kernel dev server
node scripts/check_llm.mjs  # verifies Meta model endpoints
npm test
```

## Author / License

Solo — MIT. See `LICENSE`.

## Specs

Canonical specs live in `D:\hackathon\tessercore specs\` (00–07 + AGENTS.md). This README is the submission-facing entry point.
