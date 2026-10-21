# 01 · Simulator Specification

Goal: a store simulator simple enough to explain on **one slide**, rich enough that markdowns have a real trade-off (waste ↓ but margin can ↓ through cannibalization).

**One-slide explanation (memorize):**
> Each day, a delivery arrives in batches with expiry dates. Shoppers either buy the freshest item at full price, *trade down* to a discounted older batch (cannibalization), or are *new deal-driven shoppers* who only come for the discount (incremental sales). Whatever is unsold at expiry is written off at cost. We run both pricing policies on identical random shoppers and compare waste, revenue and profit.

---

## 1. Conventions

- **Day index** `d = 0 … 36`. Days 0–6 are **warm-up** (discarded from metrics, so the store starts in steady state). Days 7–36 are the reported **30 days**. Day 7 is a Monday.
- **Batch**: `{ id, productId, receivedDay, qtyReceived, qtyRemaining }`. Shelf life `L` days: a batch received on day `r` is sellable on days `r … r+L−1`. `daysLeft(d) = r + L − d` (so 1 = last sellable day, expires end of that day).
- **Units**: demand is counted in units (1 shopper = 1 unit). Documented simplification.
- **Lead time = 0**: orders placed at start of day arrive immediately.
- **Products are independent** (no cross-product substitution). This makes the problem separable per product/category — which the optimizer exploits (§ `04`).

## 2. Entities and data model (see `02 §5` for TS types)

`Product`: `id, name, category, shelfLife, unitCost, basePrice, avgDailyDemand, priceSensitivity (e), packSize, deliveryInterval`.
Required minimum fields from the prompt (category, shelf life, unit cost, base price, avg daily demand, price-sensitivity factor) are all present.

## 3. Catalog (20 products — starting values; tune in calibration §10)

| # | Product | Category | Shelf life L | Cost | Price | λ (units/day) | Sensitivity e | Pack | Delivery every |
|---|---|---|---|---|---|---|---|---|---|
| 1 | White bread loaf | Bakery | 3 | 0.90 | 2.00 | 40 | 1.8 | 10 | 1 |
| 2 | Whole-wheat bread | Bakery | 3 | 1.10 | 2.40 | 25 | 1.8 | 10 | 1 |
| 3 | Croissant | Bakery | 2 | 0.50 | 1.50 | 30 | 2.0 | 10 | 1 |
| 4 | Bagels (6-pack) | Bakery | 4 | 1.20 | 3.00 | 12 | 1.8 | 6 | 1 |
| 5 | Milk 1 L | Dairy | 6 | 0.70 | 1.20 | 60 | 1.2 | 12 | 2 |
| 6 | Greek yogurt | Dairy | 9 | 0.80 | 1.90 | 28 | 1.4 | 12 | 2 |
| 7 | Cheddar block | Dairy | 12 | 2.20 | 4.50 | 10 | 1.3 | 6 | 3 |
| 8 | Fresh cream | Dairy | 6 | 1.10 | 2.30 | 8 | 1.4 | 6 | 2 |
| 9 | Bananas (kg) | Produce | 5 | 0.60 | 1.40 | 35 | 1.5 | 10 | 2 |
| 10 | Tomatoes (kg) | Produce | 6 | 0.90 | 2.20 | 25 | 1.5 | 10 | 2 |
| 11 | Spinach bag | Produce | 4 | 0.80 | 1.90 | 18 | 1.6 | 6 | 2 |
| 12 | Strawberries | Produce | 3 | 1.60 | 3.50 | 15 | 1.7 | 6 | 1 |
| 13 | Apples (kg) | Produce | 9 | 1.00 | 2.30 | 22 | 1.4 | 10 | 3 |
| 14 | Chicken breast | Meat & Fish | 3 | 3.20 | 5.80 | 20 | 1.6 | 6 | 1 |
| 15 | Salmon fillet | Meat & Fish | 3 | 4.50 | 8.50 | 10 | 1.6 | 4 | 1 |
| 16 | Ground beef | Meat & Fish | 3 | 3.00 | 5.50 | 14 | 1.6 | 6 | 1 |
| 17 | Sandwich | Deli | 2 | 1.30 | 3.20 | 22 | 1.8 | 6 | 1 |
| 18 | Salad bowl | Deli | 3 | 1.40 | 3.50 | 14 | 1.7 | 6 | 1 |
| 19 | Hummus | Deli | 6 | 0.90 | 2.20 | 12 | 1.5 | 6 | 2 |
| 20 | Fresh pasta | Deli | 5 | 1.00 | 2.50 | 12 | 1.5 | 6 | 2 |

Gross margins are 40–55% (typical grocery perishables range; mark as an assumption). **Why it matters:** a 40%-off item still sells above cost, so rescuing a unit that would otherwise expire (a −cost write-off) is profitable; the trade-off arises only through cannibalization.

## 4. Replenishment (identical logic under both policies)

On a delivery day for product `p` (`d mod interval == phase_p`, phases staggered so deliveries aren't all on one day):

```
cover      = deliveryInterval                      // days until the next delivery
forecast   = Σ_{k=0..cover-1} λ_p · wd[cat][dow(d+k)]     // uses the *forecast* weekday shape (no noise, no price effect)
targetS    = forecast · (1 + safety[cat])
orderQty   = max(0, ceilToPack(targetS − onHand), packSize)   // 0 if onHand ≥ targetS
```

`safety` by category: Bakery 0.15, Dairy 0.10, Produce 0.15, Meat 0.15, Deli 0.20 (assumption: stores over-order to avoid stock-outs; this plus forecast noise produces the baseline waste).

Order logic is **policy-independent** (does not look at prices/discounts), so any difference in outcomes comes only from pricing.

## 5. Daily loop (per product, in order)

1. **Receive** delivery (if delivery day) → new batch with `qtyRemaining = orderQty`.
2. **Price**: for each batch with stock, `m_b = 1 − discount(policy, daysLeft_b)`; price `= basePrice · m_b`.
3. **Demand draws** (§6).
4. **Allocate sales** to batches (§6.3); record revenue, units sold per batch.
5. **Expire**: any batch with `daysLeft == 1` after selling → `qtyRemaining` is **wasted** (cost written off). Remove it.
6. Record daily snapshot (stock by daysLeft, price tiers, units sold/wasted/markdown units).

## 6. Demand model (the core; every parameter is an assumption)

### 6.1 Total intent for the day
```
shock_t  = exp(σ·Z − σ²/2),  Z~N(0,1)        // mean-1 lognormal demand noise, σ = 0.20 (assumption)
λ_t      = λ_p · wd[cat][dow(d)] · shock_t    // weekday shape from §8
N0       ~ Poisson(λ_t)                        // baseline shoppers who would buy at full price
```

### 6.2 Reaction to the cheapest batch on the shelf
Let `m = min_b m_b` over batches with stock (1 if none discounted), and let `s` be the **shopper-response scale** (default 1; the sensitivity panel sets it to 0.5).

```
h  = min(1, s · κ · (1 − m))                    // fraction of baseline shoppers who TRADE DOWN to the discounted batch; κ = 1.5
N1 ~ Poisson( s · ρ · λ_t · (m^(−e_p) − 1) )    // INCREMENTAL deal-driven shoppers; ρ = 0.4 = share of the elasticity lift that is new traffic
```

- `e_p` = product price-sensitivity factor (table in §3). `m^(−e) − 1` is the constant-elasticity lift. Promotions elasticities in grocery are typically larger in magnitude than everyday price elasticities (cite e.g. Bijmolt, van Heerde & Pieters 2005 meta-analysis, mean ≈ −2.6 — **verify before citing**).
- **Trade-down (h)** is the cannibalization channel: it *lowers* margin because someone who'd pay full price now pays less. This is what makes "discount everything" look bad when margin is shown.
- **Incremental (N1)** is the profit channel: new units at a discounted price that still exceeds unit cost.
- `ρ` and `κ` are **explicit assumptions** with sensitivity ranges in §12.

### 6.3 Allocation to batches
Shoppers are split into groups using shared uniforms (§9):
- Baseline shopper `i` is a **deal-seeker** if `u_i < h`, else **regular**.
- **Regulars** buy the **freshest** batch first (shoppers reach to the back of the shelf — standard FEFO-violation; this is *why* old stock expires at full price).
- **Deal-seekers and incremental shoppers** buy **cheapest first** (ties → oldest first). Incremental shoppers only buy batches with `m_b < 1`; if none remain they leave without buying.
- Order of service within a day: deal group first, then regulars.
- Shoppers buy **1 unit**; unmet regulars/deal-seekers are recorded as **lost sales** (stock-out metric, shown for honesty).

Days-to-expiry affects demand in two ways, both visible in the model: (a) discount tier depends on `daysLeft`, which moves price and thus `h`/`N1`; (b) regulars prefer higher `daysLeft`.

### 6.4 Economic intuition (put in README)
Markdown beats fixed price when `incremental_units · (price·m − cost) + rescued_units · (price·m)` exceeds `trade_down_units · price·(1−m)`. Because a wasted unit is worth `−cost`, rescuing it at any price above ~0 improves profit by `price·m` — but only if it would have expired. Blanket discounting fails because it triggers trade-down on units that would have sold at full price.

## 7. Pricing policies

```ts
type Tier = { daysLeft: number; discount: number }   // discount in [0, 0.9]
// discountFor(daysLeft): the tier with the smallest threshold >= daysLeft wins… concretely: pick the tier with the
// smallest `daysLeft` threshold that is >= batch.daysLeft; if none → 0.
```

- **Fixed**: no tiers (price = basePrice always).
- **Markdown (default)**: `[{daysLeft:2, discount:0.20}, {daysLeft:1, discount:0.40}]`.
- **Rule: never discount a fresh batch** — effective threshold is `min(tier.daysLeft, L−1)`, so a 2-day-life sandwich is only discounted on its last day.
- **Blanket-discount reference policy** (for the trade-off chart only): flat 30% off always.
- Per-category overrides supported (optimizer output feeds this).
- UI sliders adjust `daysLeft` thresholds (1–4) and `discount` (0–60%).

## 8. Weekday shape

`wd[cat][dow]` is normalized to mean 1 over the week. Built as `normalize(0.5 · uciShape + 0.5 · categoryPrior)` (details in `04 §1`). Toggle `flat | prior | uci-blend` exists as a sensitivity parameter.

## 9. Randomness & fairness (common random numbers)

- PRNG: `mulberry32(seedInt)`, seed derived by `hash32(`${seed}|${productIdx}|${day}|${stream}`)`.
- Independent streams per `(seed, product, day)`: `"shock"` (2 uniforms, Box–Muller), `"n0"` (1 uniform → Poisson inverse-CDF), `"n1"` (1 uniform), `"td"` (i-th uniform = shopper i's trade-down coin).
- Poisson by inverse CDF with a **single shared uniform** → N1 is monotone in its mean, so both policies see "the same luck".
- Result: **both policies face identical underlying randomness**; any difference is caused by pricing, and differences are low-variance. Say this in the demo.
- Seed is shown in the UI top bar and in the URL; same seed ⇒ identical numbers on any machine.

## 10. Accounting (formulas used everywhere)

```
Revenue   = Σ unitsSold_b · basePrice · m_b
COGS      = unitsSold · unitCost
WasteCost = unitsWasted · unitCost
Profit    = Revenue − COGS − WasteCost
GrossMargin%      = (Revenue − COGS) / Revenue           // ignores waste (shown but flagged)
NetMargin%        = Profit / Revenue                      // headline "margin" — includes waste
WastePct          = unitsWasted / unitsReceived
```
Headline KPI pairs on the dashboard: **Waste (units, %)** next to **Net margin (%) and Profit ($)**.

**Calibration targets under Fixed price (10-seed mean):** overall waste 7–12% of received units (higher for Bakery/Deli, lower for Dairy), net margin 30–42%, stock-out rate <6%, no category with 0% waste. Record final numbers in README. Waste-rate claims in the pitch need a real citation (WRAP / USDA / FAO — **look up and verify**).

## 11. Pseudocode and invariants

```ts
function runSim(params: SimParams, policy: PolicyConfig): SimResult {
  const rng = makeStreams(params.seed)
  for (const p of catalog) state[p.id] = { batches: [] }
  for (let d = 0; d < params.warmupDays + params.days; d++) {
    for (const p of catalog) {
      receiveIfDeliveryDay(p, d)
      const prices = batches.map(b => priceMultiplier(policy, p, daysLeft(b, d)))
      const { N0, shockUsed } = drawBaseline(p, d, rng)
      const m = min(prices) ; const h = ...; const N1 = ...
      sell(p, d, N0, h, N1, rng.td(p,d))           // regulars freshest-first, deal group cheapest-first
      expireAndWaste(p, d)
      if (d >= warmupDays) record(p, d)
    }
  }
  return summarize(records)       // per-day, per-product, per-category, totals
}
```

**Vitest invariants (write first):**
1. `opening + received = sold + wasted + closing` per product (reported window).
2. No negative stock, no batch sold after expiry.
3. Same seed ⇒ deep-equal results; different seed ⇒ different results.
4. Fixed policy: all prices == basePrice, markdown units == 0.
5. With `s = 0` (no response) markdown policy gives ≤ profit than fixed or equal waste (sanity: discounting without response can't help much).
6. Discount 0 tiers ⇒ result equals Fixed exactly (CRN check).
7. Revenue ≥ 0; revenue = Σ units·price.
8. Waste only occurs on `daysLeft == 1` batches.
9. Calibration test prints per-category waste % (not an assertion, a visible report).

## 12. Assumptions register (copy into README, fill justification column)

| ID | Assumption | Value | Justification (write 1–2 sentences) | Sensitivity range |
|---|---|---|---|---|
| A1 | Shelf lives | table §3 | Typical retail best-before/use-by windows for each item type; real values vary by supplier and storage | ±1 day |
| A2 | Baseline daily demand λ | table §3 | Plausible mid-size supermarket volume per SKU; scale doesn't change percentages | ×0.7–1.3 |
| A3 | Weekday shape | 50% UCI + 50% prior | UCI Online Retail II gives real transaction timing (B2B gift wholesaler — weak proxy); prior encodes weekend grocery peak | flat / prior / blend |
| A4 | Demand noise σ | 0.20 | Daily SKU demand typically fluctuates ~15–30% around forecast | 0.1–0.35 |
| A5 | Price sensitivity e | 1.2–2.0 by category | Promo elasticities are larger than everyday; staples (milk) lower, impulse (bakery/deli) higher | ×0.5–1.5 (via s) |
| A6 | Trade-down κ | 1.5 | A 20% discount moves ~30% of shoppers to the cheaper batch; assumed, no ground truth | 0.75–2.25 |
| A7 | Deal-visibility ρ | 0.4 | Only part of the elasticity lift is new traffic; rest is existing customers | 0.2–0.6 |
| A8 | Over-order safety | 0.10–0.20 | Stores avoid stock-outs; this + forecast error is the waste source | ×0.5–1.5 |
| A9 | Freshness preference | regulars take freshest | Observed shopper behavior (reach to back of shelf); creates old-stock waste | on/off test |
| A10 | Lead time | 0 | Simplification | — |
| A11 | Units per shopper | 1 | Simplification | — |
| A12 | No cross-product substitution | — | Keeps model explainable and separable | — |
| A13 | Waste valued at unit cost | cost | Write-off; ignores disposal fees (conservative against markdown) | + disposal cost |
| A14 | Margins | 40–55% | Typical perishables gross margin range | ±5 pts |

## 13. Files to implement (Person A) and order

1. `rng.ts` (hash32, mulberry32, poisson, normal) + `rng.test.ts`
2. `types.ts`, `catalog.ts`, `weekday.ts`
3. `policies.ts` (`priceMultiplier`, presets)
4. `demand.ts` (draws, `h`, `N1`)
5. `engine.ts` (batch handling, daily loop, accounting)
6. `metrics.ts` (aggregation to per-product / category / total; `compare(fixed, markdown)`)
7. `runner.ts` (`runSim`, `runSeeds`)
8. invariants tests → calibration → worker wrapper
