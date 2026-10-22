# Markdown Before Waste

A grocery-store simulator that asks one question: **does marking down perishables
actually pay, or does it just move the loss?**

A store receives 20 perishables in batches with expiry dates. Every day, shoppers
either buy the freshest item at full price, *trade down* to a discounted older
batch, or are *new deal-driven shoppers* who only show up for the discount.
Whatever is unsold at expiry is written off at cost. We run **fixed price** and a
**markdown rule** on identical random shoppers and compare waste, revenue, profit
and margin.

Everything is seeded: the same seed gives the same numbers on any machine.

> **Status:** the simulation core (plans/01), the app (plans/02), every
> dashboard tab (plans/03) and the stretch goals (plans/04) are built and
> tested — including the real UCI weekday shape. The deploy/demo pack
> (plans/05) is the remaining item.

---

## The model in one slide

| Piece | Rule |
|---|---|
| Day | 7 warm-up days (discarded) + 30 reported days; day 7 is a Monday |
| Batch | received on day `r`, shelf life `L`, sellable on `r … r+L−1`, expires end of day `r+L−1` |
| Replenish | `target = forecast × (1 + safety)` over the days until the next delivery, rounded up to whole packs |
| Demand | `λ × weekday shape × lognormal shock(σ)` → Poisson count of baseline shoppers |
| Discount response | trade-down `h = min(1, s·κ·(1−m))`; incremental `N1 = Poisson(s·ρ·λ·(m^(−e) − 1))` |
| Allocation | deal shoppers take the cheapest batch (oldest on a tie), regulars take the freshest |
| Waste | whatever is left on a batch's last day, valued at unit cost |
| Money | `profit = revenue − COGS − waste cost`; net margin includes waste, gross margin does not |

The trade-off: a rescued unit is worth `price × m` instead of `−cost`, but a
trade-down unit gives up `price × (1−m)` on stock that would have sold anyway.
Discount *everything* and the second effect swamps the first.

### Files

```
src/sim/            pure TypeScript, no React, no DOM (runs in Node and in a worker)
  types.ts          the contract between engine and UI (plans/02 §5)
  catalog.ts        the 20 products + default parameters
  weekday.ts        weekday demand shape (prior / UCI blend / flat)
  rng.ts            hash32, mulberry32, Poisson, Box–Muller, per-(seed, product, day) streams
  policies.ts       fixed / markdown / blanket pricing rules
  demand.ts         the demand model
  engine.ts         the daily loop
  metrics.ts        accounting and aggregation
  runner.ts         runSim, runSeeds, comparePolicies
  tradeoff.ts       the blanket point and discount sweep for the hero chart
  sensitivity.ts    the assumption sweep behind the tornado chart
  optimizer.ts      best two-step rule per category, train/test split
  api.ts            the surface the UI calls
  worker.ts         Comlink entry point
  data/weekday_index.json   the UCI weekday shape (scripts/build_weekday_index.py)
  mock.ts           a hand-made result for building the UI against
src/store/          useSimStore — zustand store, worker wiring, URL sync
src/lib/            format.ts, urlState.ts, kpis.ts, chartTheme.ts, assumptions.ts
src/components/     TopBar, ControlsRail, KpiPair, VerdictBanner, the Overview
                    charts, ProductsTab, TimelineTab, RobustnessTab, OptimizeTab,
                    DealsView, …
src/app/            the dashboard route (/), the deals route (/deals), layout, palette
scripts/            build_weekday_index.py — UCI Online Retail II → weekday_index.json
tests/              Vitest: units, invariants, calibration, performance, store, optimizer
docs/               the plan files this repo was built from
```

### How the app is wired

- The **seed, the two markdown tiers and the shopper-response scale live in the
  URL**: `/?seed=42&t1=2&d1=20&t2=1&d2=40&s=1`. The server reads it, the store
  keeps it, and every change rewrites the query string with
  `history.replaceState` — so a link always reproduces the numbers.
- The **simulation runs in a Web Worker** (Comlink). If the worker cannot be
  created — or fails mid-run — the same pure functions run on the main thread
  instead.
- Slider changes are **debounced at 120 ms**, and a request counter throws away
  the answer of a run that has already been superseded.
- Numbers are **plain numbers in the simulation** and are only formatted in
  `src/lib/format.ts`, at the view layer.

---

## Results

All numbers below are **10-seed means (seeds 1–10)**, produced by
`npx vitest run tests/calibration.test.ts`, which prints the same tables.

### Baseline: fixed price

| | Waste % | Net margin % | Stock-out % |
|---|---|---|---|
| **Overall** | **7.02** | **39.07** | **2.16** |
| Bakery | 8.9 | 38.5 | 1.9 |
| Dairy | 2.9 | 40.2 | 2.3 |
| Produce | 7.5 | 38.5 | 1.8 |
| Meat & Fish | 7.8 | 38.9 | 3.0 |
| Deli | 8.9 | 39.6 | 2.5 |

Waste is highest for short-life bakery and deli items and lowest for dairy,
which is what the calibration targets in plans/01 §10 ask for.

### Fixed price vs. markdown rules

| Policy | Waste % | Net margin % | Stock-out % | Units sold at markdown | Revenue |
|---|---|---|---|---|---|
| Fixed price | 7.02 | 39.07 | 2.16 | 0% | $325,149 |
| **Markdown (≤2 days 20%, ≤1 day 40%)** | **0.05** | **40.87** | 4.23 | 15.3% | $336,858 |
| Blanket 30% off | 0.02 | **19.30** | 9.56 | 100% | $275,243 |
| Markdown, half shopper response | 0.63 | 40.35 | 3.62 | 14.6% | $330,212 |
| Blanket, half shopper response | 0.50 | 18.88 | 5.01 | 100% | $254,825 |

Markdown versus fixed, averaged over 10 seeds:

| Metric | Mean | 95% CI |
|---|---|---|
| Waste reduction | 99.23% | 98.80 – 99.66% |
| Net margin change | +1.81 pts | +1.60 – +2.02 pts |
| Profit change | +8.40% | win rate 10/10 seeds |
| Revenue change | +3.60% | |

**The headline:** a targeted markdown rule removes almost all waste *and* lifts
margin. Discounting everything also removes waste — and halves the margin, from
39% to 19%, because every shopper is now trading down. That is the trade-off the
dashboard is built to show.

**Read this honestly:** the waste reduction is very large because the model has
no mechanism for shoppers refusing old stock. Once a batch is 40% off, the
model assumes it sells. A real store would see more waste survive the markdown
than this simulation does. Treat 99% as "the direction and the mechanism", not
as a forecast.

---

## Assumptions

Every number in the model is an assumption. The full register lives in
plans/01 §12; this is the shipped version, with the calibration outcome noted
where the starting value was changed.

| ID | Assumption | Value | Why |
|---|---|---|---|
| A1 | Shelf lives | 2–12 days by category | Typical retail best-before/use-by windows per item type; real values vary by supplier and storage |
| A2 | Baseline daily demand λ | 8–60 units/day per SKU | Plausible mid-size supermarket volume per SKU; the scale does not change any percentage |
| A3 | Weekday shape | 50% UCI + 50% grocery prior | The UCI Online Retail II extract (a **B2B gift wholesaler**, a weak proxy) is generated by `scripts/build_weekday_index.py` and blended with a documented grocery prior. Its Saturday is imputed from Friday/Sunday, because the source barely trades on Saturdays |
| A4 | Demand noise σ | 0.20 | Daily SKU demand typically fluctuates ~15–30% around the forecast |
| A5 | Price sensitivity e | 1.2–2.0 by category | Promotion elasticities are larger in magnitude than everyday-price elasticities; staples lower, impulse items higher |
| A6 | Trade-down κ | 1.5 | A 20% discount moves ~30% of shoppers to the cheaper batch. Assumed, no ground truth |
| A7 | Deal visibility ρ | 0.4 | Only part of the elasticity lift is new traffic; the rest is existing customers |
| A8 | Over-order safety | 0.10–0.20 by category | Stores avoid stock-outs; this plus forecast error is the waste source. **Calibrated**: Bakery/Produce/Meat/Deli set to 0.20, Dairy 0.10, to land baseline waste inside the 7–12% target |
| A9 | Freshness preference | regulars take the freshest | Shoppers reach to the back of the shelf; this is why old stock expires at full price |
| A10 | Lead time | 0 | Simplification |
| A11 | Units per shopper | 1 | Simplification |
| A12 | No cross-product substitution | — | Keeps the model explainable and the categories separable |
| A13 | Waste valued at unit cost | cost | Write-off; ignores disposal fees, which is conservative *against* markdown |
| A14 | Gross margins | 41–52% per item, ~45% weighted | Typical perishables range. **Calibrated**: the starting cost table implied 45–67% margins, which contradicted the 40–55% band this assumption states; costs were raised to sit inside it. Every item still clears cost at 40% off |
| A15 | Service order inside the deal group | incremental shoppers first | Incremental shoppers have no alternative (discounted stock only); deal-seekers can still fall back to full price. A modelling choice, documented in `engine.ts` |

### What the model deliberately leaves out

- Shoppers who refuse old stock regardless of price (this is why the waste
  reduction looks so large).
- Baskets: one shopper buys one unit of one product.
- Cross-product substitution, staff costs, and disposal fees.
- A grocery-representative weekday shape: the UCI extract is a B2B wholesaler,
  so it is a weak proxy and is halved against a documented grocery prior.

---

## Reproduce

```bash
npm install
npm run dev        # the dashboard at http://localhost:3000
npm test           # units, the 9 invariants, calibration, performance, the store
npm run typecheck  # next typegen && tsc --noEmit
npm run lint
```

The dashboard starts with the seed in the URL. Change the seed, move a slider,
or open a link like `/?seed=7&t1=3&d1=25&t2=1&d2=60&s=1` — the numbers move
with it, and the link always reproduces them.

Print the calibration tables and the policy comparison:

```bash
npx vitest run tests/calibration.test.ts
```

Run the simulation directly:

```ts
import { runSim, runSeeds, comparePolicies } from "@/sim/runner";
import { DEFAULT_PARAMS } from "@/sim/catalog";
import { DEFAULT_MARKDOWN_POLICY } from "@/sim/policies";

runSim(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);
runSeeds(DEFAULT_PARAMS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], DEFAULT_MARKDOWN_POLICY);
comparePolicies(DEFAULT_PARAMS, DEFAULT_MARKDOWN_POLICY);
```

## Deploying

Vercel picks the framework up on its own — there is no build override and
there are no environment variables or secrets in this project.

1. Import the repository at **vercel.com/new** and accept the defaults
   (Next.js, `npm run build`).
2. Deploy. The URL is `https://<project>.vercel.app`.
3. Tag the deploy once the MVP is live: `git tag mvp && git push origin mvp`.

After deploying, check the live URL in a private window: the seed must be in
the address bar, the four KPI cards must show both policies, and reloading the
same URL must reproduce the same numbers.

## How it is tested

- **Determinism** — same seed ⇒ identical output; different seed ⇒ different output.
- **Common random numbers** — both policies meet the same shoppers: the demand
  draw is identical per product and day, so every difference is caused by pricing.
- **Conservation** — opening + received = sold + wasted + closing, per product.
- **Zero-discount ≡ fixed** — a rule with a 0% discount replays the fixed policy
  exactly, which is the sharpest check that no policy leaks into the randomness.
- **Waste only on the last day** — checked against the computed expiry day of
  every batch.
- **No `Math.random`** in `src/sim` — enforced by an ESLint rule *and* a grep test.
- **Calibration** — the baseline must stay inside the numeric targets of
  plans/01 §10, or the test fails.
- **The store** — it computes a comparison on creation, recomputes when the
  seed, a tier or the response scale changes, and runs the multi-seed
  evaluation. The fallback path (simulation on the main thread) is what the
  tests exercise, because Node has no `Worker`.

## Plan documents

`docs/` holds the six plan files this repo is built from:
`00_MASTER_PLAN`, `01_SIMULATOR_SPEC`, `02_SETUP_AND_ARCHITECTURE`,
`03_DASHBOARD_SPEC`, `04_STRETCH_GOALS`, `05_VALIDATION_DEPLOY_DEMO`.
