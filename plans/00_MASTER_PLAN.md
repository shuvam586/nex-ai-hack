# PS 4.1 · Markdown Before Waste — MASTER PLAN

> Budget: **<12 hours, 1–2 people**. Stack: **Next.js + TypeScript, simulator in the browser, deployed on Vercel**.
> Stretch goals in scope: **(S1) UCI weekday demand shape, (S2) "Today's deals" page, (S3) sensitivity panel, (S4) best-discount search per category.**

Sub-specs (read in order, each is self-contained):

| File | What it covers |
|---|---|
| `01_SIMULATOR_SPEC.md` | The store model: every equation, assumption, RNG design, pseudocode, tests |
| `02_SETUP_AND_ARCHITECTURE.md` | Repo, tooling, TypeScript contracts, worker, state, deploy |
| `03_DASHBOARD_SPEC.md` | Every screen, chart, control, visual style, acceptance criteria |
| `04_STRETCH_GOALS.md` | UCI script, optimizer, sensitivity/tornado, deals page |
| `05_VALIDATION_DEPLOY_DEMO.md` | Calibration, 10-seed evaluation, README, demo script, Q&A prep |

---

## 1. What "done" looks like

A public Vercel URL where a judge can:

1. See a **fixed seed** (displayed, editable) and press nothing — results are already there.
2. Compare **Fixed price vs Markdown rule** on the same seed: **units wasted, revenue, profit, margin %** side by side, with deltas.
3. Drag threshold/discount sliders and watch results update in <300 ms.
4. Open a **per-product view**: what was marked down, when, how many units rescued, what got wasted.
5. Open **Robustness**: 10-seed mean ± CI of waste reduction % and margin change, a **half-strength-response** toggle, and a tornado chart showing the conclusion survives assumption changes.
6. Open **Optimize**: best discount steps per category, validated on held-out seeds.
7. Open **/deals**: a shopper-facing "today's deals" page generated from the simulation.
8. Read a README that lists **every assumption with a justification**.

## 2. Locked decisions (don't re-debate during the hackathon)

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Looks great, Vercel one-click deploy, no backend needed |
| Where sim runs | **Browser, in a Web Worker** (via Comlink) | Instant interactivity, zero server cost, judges can reproduce by seed |
| Sim engine | Pure TypeScript module in `src/sim/`, **no React imports** | Testable with Vitest, reusable by the deals page and the Python-free pipeline |
| UI kit | Tailwind CSS + shadcn/ui | Fast, polished defaults |
| Charts | Recharts (bars/lines/scatter) + custom CSS-grid heatmap | Recharts is quickest in React; heatmap is easier by hand |
| State | Zustand + URL query params (seed, policy) | Shareable links; deals page reads the same params |
| Randomness | Own seeded PRNG (mulberry32 + string hash), **common random numbers** across policies | Fair A/B comparison; reproducible |
| UCI data | One-off **Python/pandas script** → commits `weekday_index.json` | App stays dependency-free; data usage is cited |
| Currency | Generic `$` | Simple; configurable constant |
| Tests | Vitest, invariants + calibration checks | Catches silent sim bugs that would embarrass us on stage |

## 3. Architecture at a glance

```
                ┌──────────────────────────── Browser ────────────────────────────┐
 URL params ──► │  Zustand store ◄──► React UI (Overview/Products/Timeline/…)     │
 (seed, rule)   │        │                         ▲                              │
                │        ▼ Comlink                 │ SimResult / EvalResult       │
                │  ┌─────────────── Web Worker ───────────────┐                   │
                │  │ runSim() · runSeeds() · optimize() ·     │                   │
                │  │ sensitivity()   (all from src/sim/*)     │                   │
                │  └──────────────────────────────────────────┘                   │
                └──────────────────────────────────────────────────────────────────┘
 weekday_index.json (from UCI via scripts/build_weekday_index.py) is imported statically.
```

## 4. Scope tiers (cut line is strict)

**Tier 1 — MVP (must be live and deployed by hour 6):** simulator, fixed vs markdown policy, comparison dashboard, per-product view, README assumptions.

**Tier 2 — judged-differentiators (hours 6–9):** 10-seed evaluation, sensitivity (half-strength) panel, heatmap timeline.

**Tier 3 — wow (hours 9–10.5):** optimizer, UCI weekday shape, deals page.

**Cut order if behind schedule (cut from the bottom first):**
1. Deals page → ship as a simple card grid with no day-scrubber.
2. UCI integration → hardcode grocery-prior weekday shape, mention UCI as "planned" (don't claim it).
3. Optimizer out-of-sample validation → in-sample only, labeled as such.
4. Tornado chart → keep only the single half-strength toggle.
**Never cut:** fixed seed display, margin next to waste, 10-seed evaluation, README assumptions.

## 5. Timeline (2-person version) — hour budget

Roles: **A = "Sim"** (engine, tests, optimizer, sensitivity, UCI script). **B = "UI"** (Next.js app, charts, deals page, deploy, README).

| Phase | Hours | A (Sim) | B (UI) | Exit criterion |
|---|---|---|---|---|
| **0. Contracts & scaffolding** | 0:00–0:45 | Write `types.ts`, `catalog.ts` skeleton | `create-next-app`, Tailwind, shadcn, deploy hello-world to Vercel, mock `SimResult` JSON | Types agreed; Vercel URL live |
| **1. Core simulator** | 0:45–3:30 | RNG, demand, engine, policies, metrics, invariants tests | Layout shell, KPI cards, controls panel wired to **mock** data | `runSim(seed)` returns valid `SimResult`; tests green |
| **2. MVP integration** | 3:30–6:00 | Calibration to target waste %, worker wrapper | Replace mock with worker, comparison charts, product table, timeline heatmap | **MVP deployed**, numbers sane |
| **3. Robustness** | 6:00–8:00 | `runSeeds`, CI stats, `sensitivity()` (tornado + half-strength) | Robustness tab, tornado chart, assumptions drawer | Judges' "hold up under change" requirement met |
| **4. Stretch** | 8:00–10:00 | UCI script + `optimize()` with held-out validation | Optimize tab, **/deals** page | Stretch features live |
| **5. Hardening** | 10:00–11:00 | Final calibration, edge-case tests | Polish, empty/loading states, responsive check | No console errors, Lighthouse not embarrassing |
| **6. Demo prep** | 11:00–12:00 | README assumptions table | 3-min demo rehearsal, one-slide diagram, backup screen recording | Rehearsed twice |

### Solo variant (1 person, <12h)
Do phases strictly in order: 0 → 1 → 2 (**deploy**) → 3 (only half-strength toggle + 10-seed table) → 5 → **then** whichever of deals page / optimizer / UCI time allows (in that order: deals page is the most visible; optimizer second; UCI script third because it is a 30-minute task). Reserve the last 60 minutes for README and demo.

## 6. AI-assisted workflow (how to use the tools)

- **Claude Code / Cursor** in the repo, with these plan files copied into `/docs`. Start every coding session with: *"Read docs/01_SIMULATOR_SPEC.md and implement section X only."* Small, spec-anchored prompts beat "build the whole app".
- **Test-first for the sim:** ask the assistant to write the invariant tests from `01 §11` **before** the engine. Run `vitest --watch` continuously.
- **UI generation:** ask for one component at a time against the TypeScript contracts in `02 §5` using the mock JSON. Never let the UI import from `src/sim` internals except via `runner.ts` / worker API.
- **Review rule:** you (human) must be able to explain each equation in `demand.ts`. Judges will ask. Do not accept generated math you can't explain.
- **Commit rhythm:** commit at each phase exit; tag `mvp` when MVP is deployed (fallback if later work breaks things).

## 7. Judging-criteria checklist (map to the prompt)

| Prompt requirement | Where satisfied |
|---|---|
| ~20 perishable products, 30 days, batches with expiry | `01 §3, §5` |
| Demand depends on price and days-to-expiry | `01 §6` (trade-down + incremental deal shoppers, freshness-seeking) |
| Every assumption documented and justified | `01 §12` register → README |
| Fixed price vs markdown with adjustable thresholds | `01 §7`, `03 §4` |
| Deployed dashboard, same seed, waste/revenue/margin, per-product markdown view | `03 §3–§6` |
| Results hold when assumptions change | `04 §3` sensitivity + tornado |
| Best discount steps per category | `04 §2` |
| Half-strength shopper response panel | `04 §3.1` |
| "Today's deals" page | `04 §4` |
| UCI weekday shape cited | `04 §1` |
| Fix & display seed | `03 §2` top bar |
| Margin shown next to waste (discount-everything isn't a win) | `03 §3` KPI pairs + blanket-discount reference policy |
| Simple enough for one slide | `05 §6` |
| Waste reduction % and margin change over ≥10 seeds | `05 §3`, `03 §7` |

## 8. Top risks and mitigations

| Risk | Mitigation |
|---|---|
| Markdown rule doesn't beat fixed price after calibration | That's a *finding*, not a failure — but check `overorderFactor` and trade-down params first; the economics must be explainable (see `01 §6.4`). Never tune until it "wins" without recording why. |
| Sim bugs (units appear/disappear) | Conservation invariant test: opening + received = sold + wasted + closing, every product, every seed |
| Slow UI | Web Worker + memoized runs; 10 seeds × 2 policies × 20 products × 37 days is ~30k product-days → milliseconds |
| Vercel/shadcn setup friction | Do it in phase 0 and deploy immediately |
| UCI data download/format hassle | Time-box to 30 min; fallback prior shape in `04 §1.4` |
| Over-claiming | State clearly: synthetic data, assumptions documented, results conditional on them |

## 9. Repo layout (target)

```
markdown-before-waste/
├─ README.md                      # product pitch + assumptions table + how to reproduce
├─ docs/                          # these plan files
├─ scripts/build_weekday_index.py # UCI → src/sim/data/weekday_index.json
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx     # dashboard (tabs)
│  │  └─ deals/page.tsx           # shopper-facing page
│  ├─ sim/                        # PURE TS (no React)
│  │  ├─ types.ts rng.ts catalog.ts weekday.ts demand.ts
│  │  ├─ engine.ts policies.ts metrics.ts runner.ts
│  │  ├─ optimizer.ts sensitivity.ts worker.ts
│  │  └─ data/weekday_index.json
│  ├─ components/                 # Kpi, Charts, Heatmap, ProductTable, Controls, …
│  ├─ store/useSimStore.ts
│  └─ lib/ (format.ts, urlState.ts)
└─ tests/ (engine.test.ts, rng.test.ts, calibration.test.ts)
```
