# Demo script — 3:00 max (spec 00 + 06)

**First line (required):**
> Before this week: github.com/bolouvipf/houetorwasm (research study + prototype, separate named resource). Built this week: tessercore `b8465de..6feba44` — kernel, WASM sandbox, 4 seeds, cache/offline, registry+signing, T0-T3, Muse gateway, verification, bench.

## Timeline

| t | What to show | How |
|---|--------------|-----|
| 0:00 | Who + Pain (07) | 1 sentence: "Teams that let Muse write tools can't trust/run/share them — we make generated code verified, cached, free on reuse." Problem: Push the Frontier |
| 0:15 | Kernel size + throttled load | `bench/results/m1_sizes.json`: kernel 4.12 KB gz + engine 677 KB gz lazy-once; Chrome DevTools Slow 3G: first load ~X s, warm cache ~Y ms (record M2 bench) |
| 0:35 | Existing module: T1 route→verify→run | Type "convert 5000 fcfa to eur" → T1 hit `fcfa_eur_convert` (pill T1 0 LLM) → verify `sha256+Ed25519` → form auto-gen → Run → 7.61 EUR (keyvalue, assumptions shown) |
| 0:55 | Repeat + offline | Same query → T0 cache instant, 0 LLM, 0 bytes; DevTools offline → still works (cache+WASM) |
| 1:15 | New request → T3 generation | "convert 10 kg to pounds" → T1/T2 miss → T3: contract (show JSON) → 2 Muse impls A/B (temps 0.2/0.7) → verify report (examples 3/3, diff 54, properties) → human confirm "10 kg → 22.04 lbs looks right?" → tap Yes → signed+published |
| 1:45 | Second profile | Fresh browser profile/incognito → same query → T1 hit 0 LLM calls, downloads signed module (<3 KB) |
| 2:00 | Attacks (split screen) | `evil_fetch` blocked `fetch not defined`, `evil_dom` blocked, `evil_loop` stopped 197ms interrupt, `evil_mem` 2.3ms, `subtle_wrong` REJECTED (diff 5 inputs) — show reports |
| 2:30 | "AI calls avoided" chart | `m4_tier_mix.json`: 80% with 0 calls, curve T0↑ over 45 reqs; metrics pills live |
| 2:45 | Honest Limits slide | 4 bullets from README Limits (signature≠safety, no fuel, WASM≠connectivity, correlated errors) |
| 2:55 | CTA | "Private registry + verification API — open core, paid hosted" + repo link |

## Setup

```bash
cp .env.example .env  # fill Baseten key + allowlist + keypair
npm install
node server/index.js  # auto-seeds 4 modules on http://localhost:8787
# serve kernel: npx serve .  or  python -m http.server
# open kernel/index.html
node scripts/check_llm.mjs
npm test
```

## Backup take

Record a backup run before final submission (06). Judges must clearly see what was built during the event (show commit range `b8465de..6feba44` in README).
