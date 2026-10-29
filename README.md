# Tessercore

> **AI-generated code you can trust, that becomes free through reuse.**
> Tiny kernel loads verified pure-function modules on demand; missing modules are drafted by Meta Muse models under a strict contract, verified without trusting one model, run in a WebAssembly sandbox, signed and cached.

- **Thesis:** Push the Frontier — give software a new capability at runtime, safely.
- **First customer (default, to validate — see `07_PRODUCT_AND_AUDIENCE.md`):** teams building AI agents/apps where the model must produce small tools at runtime and cannot afford unverified code.
- **Track:** Startups (solo). Built Oct 27–Nov 4 for the Meta Global AI Developer Hackathon.

## What existed before / what was built during the event

- **Existed before:** [`github.com/bolouvipf/houetorwasm`](https://github.com/bolouvipf/houetorwasm) — research study + HOUETOR Plugin Host (WASM plugin phases 1-4, bench §8, MCP bridge). Used only as a **separate named resource / reference** — **never copied** into this repo (hard rule AGENTS.md#1).
- **Built during the event (Oct 29 → Nov 4, this repo `tessercore` — public, created Oct 29):**
  - `b8465de` M0 init — scaffolding, `.env.example`, `check_llm`
  - `e1749de` M1 sandbox — QuickJS-WASM in Worker, `host.mjs` + watchdog, `evil_*` fixtures, 5 tests
  - `4af4438` M2 kernel — manifest/hash/views/loader, 4 seeds (`fcfa_eur`, `unit_convert`, `loan_payment`, `cement_slab`), tamper rejected
  - `4207703` M3 cache — IndexedDB + Mem fallback, offline run
  - `1788436` M4 registry — Ed25519 `canonical(manifest)` + `sha256`, T1 rule-based resolver
  - `53daed6` M5 router T2 — LLM gateway `MODEL_ALLOWLIST`, `router.txt` + `routeWithLLM` (Muse Spark Open on Baseten)
  - `b93616b` M6 generation T3 — contract + 2 impls A/B + `verify/pipeline.js` (examples/diff 200/properties), `POST /generate`, `subtle_wrong` rejected
  - `1233350` M7 metrics+bench — `m1_sizes`/`m6_termination`/`m7_wasm_vs_plain`/`m4_tier_mix` + honest Limits
  - `14755f9` + `6feba44` M8 polish — tier pills, human confirm, auto-seed
  - Range for judges: `b8465de..6feba44` (all commits in this repo, event period only)

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

| Stage | Model id (`.env`, allowlisted) | Why |
|-------|-------------------------------|-----|
| T2 Router | `meta-models/muse-spark-open-1026` (Baseten) | Smallest Muse that routes |
| T3 Gen A | `meta-models/muse-spark-open-1026` (temp 0.2, straightforward) | |
| T3 Gen B | `meta-models/muse-spark-open-1026` (temp 0.7, defensive) — ideally a **different** Muse model for diversity (M10 measures same-model vs cross-model fault detection) | Diversity makes differential testing stronger |

All model calls go through `server/llm.js` only, enforced by `MODEL_ALLOWLIST`. No non-Meta models at runtime. Plain keyword scoring for T1. Verify via `node scripts/check_llm.mjs`.
**Exact IDs are config, never hard-coded** (AGENTS.md#5).

> **open_weight: true** — Primary generator is **Muse Spark Open** (`meta-models/muse-spark-open-1026`) on **Baseten partner inference** → eligible for *Best Build on Meta Open Weight Models* ($10K). Flag this in Cerebral Valley submission.

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

## Measurements (from `bench/results/*.json` — 2026-10-29, Node v24.15 win32)

| Exp | Result | File |
|-----|--------|------|
| M1 Sizes | kernel 10.59 KB raw / **4.12 KB gz** (excl. engine) — target ≤30 KB ✅ ; engine `dist/index.global.js` **2318 KB raw / 677 KB gz** lazy-loaded once, cached | `m1_sizes.json` |
| M6 Termination | `evil_loop` → `TIMEOUT` **197 ms** (interrupt), `evil_mem` → `MEMORY_LIMIT/string too long` **2.3 ms** — watchdog +50 ms | `m6_termination.json` |
| M7 WASM vs Plain | 1000× `fcfa_eur_convert` : plain **0.014 ms/call**, WASM **1.57 ms/call** (**109×** slower) — WASM pays engine startup but gives stronger isolation | `m7_wasm_vs_plain.json` |
| M4 Tier mix | 45-req scripted session: T1 46.7% / T0 33.3% / T3 17.8% / T2 2.2% — **80% with 0 LLM calls** after warm-up | `m4_tier_mix.json` |

> All numbers include `date/device` in JSON — no invented values. Run `node bench/m1_sizes.mjs` etc. to reproduce.

## Limits (honest, per `05_MEASUREMENTS.md`)

1. Signature proves **who** published, not safety — safety = sandbox + verification.
2. No per-instruction fuel: deadline interrupt + `Worker.terminate()` watchdog (M6 shows ~200 ms precision).
3. WIT/Component Model not in browser v1 — contract is JSON Schema.
4. LLMs write JS far more reliably than WASM-targeting code — we run JS **inside** WASM (engine cost 677 KB gz).
5. Laptop numbers ≠ low-end phone (M8 pending real device).
6. WASM alone doesn't fix weak connectivity — **caching/sharing** do (M4 80% avoided).
7. Plain Worker is 109× faster — WASM adds isolation/uniform engine, costs size+startup (M7).
8. Two LLM impls can share misconception — differential reduces, not eliminates; properties + human confirm mitigate.
9. Domain assumptions surfaced, not verified.
10. Generation needs connectivity + hosted Meta model; offline = cached modules only.
11. User request text sent to LLM gateway (privacy notice).

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
