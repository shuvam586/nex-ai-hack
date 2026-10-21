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

> **Status:** the simulation core is complete and tested (plans/01, plans/02).
> The dashboard (plans/03), the stretch goals (plans/04) and the deploy/demo
> pack (plans/05) are not built yet.

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
  worker.ts         Comlink entry point
  mock.ts           a hand-made result for building the UI against
tests/              Vitest: units, invariants, calibration, performance
docs/               the plan files this repo was built from
```

---

## Results

All numbers below are **10-seed means (seeds 1–10)**, produced by
`npx vitest run tests/calibration.test.ts`, which prints the same tables.

### Baseline: fixed price

| | Waste % | Net margin % | Stock-out % |
|---|---|---|---|
| **Overall** | **7.06** | **39.12** | **2.15** |
| Bakery | 9.3 | 38.4 | 1.7 |
| Dairy | 3.0 | 40.1 | 2.0 |
| Produce | 7.5 | 38.6 | 1.9 |
| Meat & Fish | 7.3 | 39.2 | 3.1 |
| Deli | 8.8 | 39.6 | 2.8 |

Waste is highest for short-life bakery and deli items and lowest for dairy,
which is what the calibration targets in plans/01 §10 ask for.

### Fixed price vs. markdown rules

| Policy | Waste % | Net margin % | Stock-out % | Units sold at markdown | Revenue |
|---|---|---|---|---|---|
| Fixed price | 7.06 | 39.12 | 2.15 | 0% | $322,083 |
| **Markdown (≤2 days 20%, ≤1 day 40%)** | **0.05** | **40.88** | 4.28 | 15.4% | $333,539 |
| Blanket 30% off | 0.02 | **19.30** | 9.40 | 100% | $272,567 |
| Markdown, half shopper response | 0.58 | 40.38 | 3.65 | 14.8% | $327,022 |
| Blanket, half shopper response | 0.56 | 18.82 | 4.84 | 100% | $252,659 |

Markdown versus fixed, averaged over 10 seeds:

| Metric | Mean | 95% CI |
|---|---|---|
| Waste reduction | 99.34% | 99.07 – 99.61% |
| Net margin change | +1.76 pts | +1.56 – +1.96 pts |
| Profit change | +8.23% | win rate 10/10 seeds |
| Revenue change | +3.56% | |

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
| A3 | Weekday shape | 50% UCI + 50% grocery prior | The UCI Online Retail II extract is a **B2B gift wholesaler**, a weak proxy, blended with a documented grocery prior. **The UCI data is not ingested yet** — the app currently uses the prior only and says so |
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
- A real UCI weekday extract: the prior shape is used until the script in
  `scripts/build_weekday_index.py` is run.

---

## Reproduce

```bash
npm install
npm test          # units, the 9 invariants, calibration, performance
npm run typecheck # next typegen && tsc --noEmit
npm run lint
```

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

## Plan documents

`docs/` holds the six plan files this repo is built from:
`00_MASTER_PLAN`, `01_SIMULATOR_SPEC`, `02_SETUP_AND_ARCHITECTURE`,
`03_DASHBOARD_SPEC`, `04_STRETCH_GOALS`, `05_VALIDATION_DEPLOY_DEMO`.
