# 05 · Validation, Deployment & Demo

## 1. Test plan

| Layer | Tests | Tool |
|---|---|---|
| RNG | same seed ⇒ same stream; streams independent; Poisson mean/variance within tolerance over 10k draws; no `Math.random` in `src/sim` (grep test) | Vitest |
| Engine invariants | the 9 invariants in `01 §11` (conservation, no negative stock, no post-expiry sales, determinism, fixed ⇒ no markdown units, zero-discount tiers ≡ fixed, waste only on last day) | Vitest |
| Policy | tier selection, `min(threshold, L−1)` cap, per-category override | Vitest |
| Metrics | profit/margin formulas on a hand-computed 1-product example | Vitest |
| Common random numbers | two policies share `N0` and shock per (product, day) | Vitest |
| Optimizer | best-found ≥ default rule on training seeds; result reproducible | Vitest |
| UI smoke | page loads, KPI cards render, changing seed changes numbers, `/deals` renders | manual checklist (Playwright only if time) |

## 2. Calibration procedure (hour ~5–6, Person A)

1. Run Fixed policy over seeds 1–10. Print per-category: waste %, net margin %, stock-out %.
2. Targets (from `01 §10`): overall waste 7–12%, bakery/deli higher, dairy lower; stock-out < 6%; net margin 30–42%.
3. Tune only `safety[cat]` and `σ` (inventory parameters), **never** the markdown-response parameters to force a win. Log every change in `docs/CALIBRATION_LOG.md` (date, parameter, reason).
4. Then run Default Markdown. Record results. If markdown loses profit, diagnose using `01 §6.4` (is trade-down too strong? are discounts hitting fresh stock?) and report honestly — a documented finding beats a tuned win.
5. Freeze parameters before the Robustness phase.

## 3. Evaluation protocol (what the prompt asks for)

- **Seeds 1–10** (default), optionally 1–30 behind a button.
- For each seed compute: `wasteReduction% = (W_fixed − W_md)/W_fixed`, `marginChange (pts) = netMargin_md − netMargin_fixed`, also profit and revenue change.
- Report mean, SD, 95% CI (`mean ± 1.96·sd/√n`; for n=10 use t=2.26), and win-rate (seeds with profit gain).
- Optimizer results use **train seeds 1–10, test seeds 101–110**; never report the training number as the headline.
- State the result conditionally: "under these documented assumptions".

## 4. README skeleton

```
# Markdown Before Waste
One-line pitch + live URL + screenshot/GIF
## Problem
## How the simulator works (the one-slide explanation + diagram)
## Assumptions (full table A1–A14 with justification)    ← mandatory
## Reproduce (seed, commands: pnpm i && pnpm dev; pnpm test)
## Results (10-seed table; fixed vs markdown; half-strength; optimized)
## Robustness (tornado summary, where the conclusion flips)
## Data & citations (UCI Online Retail II with access date; elasticity & waste sources — verified)
## Limitations & honesty (synthetic; no substitution; units not baskets; B2B-proxy weekday shape)
## Project structure / tech stack
## Team
```

## 5. Deployment checklist

- [ ] `main` deploys on Vercel with no errors; `pnpm build` passes locally.
- [ ] Production URL tested in incognito and on a phone; `/deals` tested on mobile.
- [ ] Default URL has the seed pre-set (e.g. `?seed=42`) and loads with results already visible.
- [ ] No console errors/warnings of consequence; worker loads in production.
- [ ] Favicon, title, OG tags set.
- [ ] README final, screenshots added, repo public (if required).
- [ ] Tag `v1-final`; keep the last good deployment aliased in case of last-minute breakage.
- [ ] Offline fallback: screen recording (60–90 s) saved locally.

## 6. One-slide explanation (build this slide)

Left: flow diagram — *Delivery (batches with expiry) → Daily shoppers (regular / trade-down / deal-driven) → Pricing policy (fixed vs markdown tiers) → Sales, waste at expiry → Profit.*
Right: three numbers from the 10-seed table (waste ↓ %, profit Δ %, net margin Δ pts) + the seed.
Footer: "Same random shoppers for both policies · all assumptions documented · re-tested at half shopper response".

## 7. Demo script (3 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00 | Overview tab, seed visible | "Grocery stores write off perishables; discounting earlier rescues them but can eat margin. We built a store simulator to test the trade-off. Seed 42 — same numbers anywhere." |
| 0:25 | KPI pairs + verdict banner | "Same shoppers under both policies: waste −X%, profit +Y%, margin Z pts. We always show margin next to waste." |
| 0:50 | Trade-down scatter | "Discounting everything gives the lowest waste but loses profit — that's why a tiered rule matters." |
| 1:15 | Drag a slider (e.g. 40%→60%) | "Deeper isn't better — waste falls but trade-down eats margin." |
| 1:35 | Timeline heatmap + a product drill-down | "Here's exactly what was marked down and when; batches age 3→2→1 days left." |
| 2:00 | Robustness: 10-seed table + half-response toggle | "Averaged over 10 seeds. If shoppers respond half as strongly, waste still falls and profit [holds/shrinks]. Tornado shows the biggest drivers." |
| 2:30 | Optimize tab | "Best steps per category, validated on seeds we didn't tune on." |
| 2:45 | `/deals` on phone/QR | "And the shopper's view generated from the same simulation." |
| 2:55 | Close | "All assumptions are in the README; the result is conditional on them, and we show where it breaks." |

## 8. Q&A prep (likely judge questions)

- **"Why trust synthetic data?"** — Every assumption is written down, justified, and stress-tested; we show which ones change the conclusion.
- **"Isn't it rigged to make markdown win?"** — Ordering is identical under both policies, the random shoppers are shared, and we show scenarios where markdown loses profit.
- **"What about cannibalization?"** — Explicit trade-down parameter κ; it's in the tornado.
- **"Elasticities?"** — Promo elasticities, justified in README with a verified citation; range-tested ×0.5–1.5.
- **"Why not baskets/substitution?"** — Kept simple (one slide); noted in limitations.
- **"Does it overfit the optimizer?"** — Train/test seeds split.
- **"Real data?"** — Weekday shape from UCI Online Retail II (B2B proxy, caveated); everything else synthetic by design.
- **"What next?"** — Dynamic (inventory-aware) markdown, cross-product substitution, real POS data calibration.

## 9. Final hour checklist (hour 11–12)

1. Freeze code (only fixes). 2. Run `pnpm test` and `pnpm build`. 3. Re-verify every number in README/slide against the live app on seed 42. 4. Rehearse the demo twice with a timer. 5. Verify citations are real and correctly stated; remove any you can't verify. 6. Charge laptop, open tabs in advance, keep the recording ready.
