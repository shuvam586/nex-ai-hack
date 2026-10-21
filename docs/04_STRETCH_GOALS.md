# 04 · Stretch Goals Specification

Order of implementation by value/hour: **S3 sensitivity → S2 deals page → S4 optimizer → S1 UCI** (UCI is small but last because the app works without it; do it if a gap appears).

---

## 1. S1 — Real weekday demand shape from UCI Online Retail II

### 1.1 Data
- Dataset: **Online Retail II (UCI Machine Learning Repository)** — transactions of a UK online retailer, 2009-12-01 to 2011-12-09. Find it via the link in the prompt / UCI site (**verify the exact page and cite it in README with access date**).
- Caveat to state openly: it is a **gift-ware wholesaler**, not a grocery store, and it has **no Saturday trading** — so it is used only as a *real-world shape of weekday ordering behavior*, blended with a documented grocery prior.

### 1.2 Script `scripts/build_weekday_index.py`
```python
import pandas as pd, json
df = pd.concat(pd.read_excel("online_retail_II.xlsx", sheet_name=None).values())
df = df[~df["Invoice"].astype(str).str.startswith("C")]      # drop cancellations
df = df[(df["Quantity"] > 0) & (df["Price"] > 0)]
df["date"] = pd.to_datetime(df["InvoiceDate"]).dt.normalize()
daily = df.groupby("date")["Quantity"].sum()
dow = daily.groupby(daily.index.dayofweek).mean()            # mean daily units per weekday (Mon=0)
dow = dow.reindex(range(7))                                  # Saturday will be NaN
# Impute Saturday = mean of Friday and Sunday (documented), then normalize mean to 1
dow[5] = dow[[4, 6]].mean()
index = (dow / dow.mean()).round(3).tolist()
json.dump({"source": "UCI Online Retail II", "monToSun": index}, open("../src/sim/data/weekday_index.json", "w"))
print(index)
```
Run once locally, commit the JSON, document the imputation. Download the file manually (network in the sandbox may be restricted; the browser download is fine).

### 1.3 Blending in `weekday.ts`
```
prior[cat] (Mon→Sun):
  Bakery      [0.95,0.90,0.90,0.95,1.05,1.20,1.05]
  Dairy       [0.95,0.90,0.95,1.00,1.05,1.15,1.00]
  Produce     [0.90,0.90,0.95,1.00,1.05,1.25,0.95]
  Meat & Fish [0.85,0.85,0.90,1.00,1.15,1.25,1.00]
  Deli        [1.10,1.05,1.05,1.05,1.10,0.90,0.75]     // weekday lunch-driven
wd[cat] = normalize(0.5·uci + 0.5·prior[cat])   // mean 1
mode 'prior' → prior only; 'flat' → all 1; 'uci' → blend (default).
```
(Prior values are assumptions — label as such.)

### 1.4 Fallback
If the data can't be obtained in 30 minutes, ship `prior` only, label the toggle "grocery prior (assumed)", and do **not** claim UCI usage.

---

## 2. S4 — Best discount steps per category

### 2.1 Why it's cheap
Products don't interact, so categories are **independent**: optimizing each category separately is exact, and each evaluation only simulates 3–5 products. Add `runSim` option `productFilter: (p) => boolean`.

### 2.2 Search space (2-step rules)
```
thresholds (t1 > t2 ≥ 1):  (2,1) (3,1) (3,2) (4,1) (4,2) (4,3)
discounts  d1 ∈ {10,15,20,25,30}, d2 ∈ {20,30,40,50,60}, d2 > d1
→ ≈ 6 × 20 = 120 combos per category (still trivial)
Also evaluate the "no markdown" baseline and the default rule.
Cap each threshold at min(t, L−1) per product (rule from 01 §7).
```
Optional 1-step and 3-step rules if time permits (1 step: threshold ∈ {1,2,3}, discount ∈ {10…60}).

### 2.3 Objective & validation (anti-overfitting — a judging point)
- Objective: **mean profit** over **train seeds 1–10**, minus `w · unitsWasted` (`w` slider, default 0).
- Report best combo, then **re-evaluate on held-out seeds 101–110** (out-of-sample). Show both numbers.
- Tie-break: lower waste, then milder discount.
- Output type:
```ts
interface CategoryOpt {
  category: Category
  best: Tier[]
  trainProfitGainPct: number; testProfitGainPct: number
  wasteReductionPct: number                // test seeds
  tried: { tiers: Tier[]; profit: number; waste: number }[]   // for Pareto scatter
}
```
- Expected insight to explain: inelastic/long-life categories (Dairy) prefer **gentle, earlier** discounts; elastic, short-life categories (Bakery/Deli) prefer **deeper last-day** discounts. Confirm with data before claiming.

### 2.4 UI
`OptimizeTab` per `03 §7`. "Apply" writes `policy.byCategory` and the dashboard recomputes; a badge "Optimized" appears on the rule.

---

## 3. S3 — Sensitivity panel (robustness)

### 3.1 Half-strength shopper response
`responseScale = 0.5` scales both `h` and `N1` (definition in `01 §6.2`). Show Fixed vs Markdown at 0.5× / 1.0× / 1.5×, each as the 10-seed mean. Honest outcome handling: if markdown loses profit at 0.5×, display it and then show whether the **optimized** rule (from §2) recovers it — a strong narrative: *"the rule should be re-tuned when shoppers are less responsive."*

### 3.2 Tornado chart — parameters and ranges
Run 10 seeds × both policies for each low/high:

| Parameter | Low | High |
|---|---|---|
| Response scale `s` | 0.5 | 1.5 |
| Trade-down κ | 0.75 | 2.25 |
| Deal reach ρ | 0.2 | 0.6 |
| Demand noise σ | 0.10 | 0.35 |
| Over-order scale | 0.5× | 1.5× |
| Shelf life shift | −1 day (min 2) | +1 day |
| Demand scale | 0.7× | 1.3× |
| Weekday mode | flat | prior |

Metrics per scenario: **waste reduction %** and **profit change %**. Show the tornado for profit change, and a table for both metrics. Verdict: *"Waste falls in N/N scenarios; profit improves in M/N."*

### 3.3 Implementation
`sensitivity.ts`:
```ts
export function runSensitivity(base: SimParams, policy: PolicyConfig, seeds: number[]): SensitivityResult
// for each scenario: params' = {...base, ...override}; evalSeeds(params', seeds) → {wasteRed, profitChg}
```
Run inside the worker, report progress with a Comlink callback, memoize by scenario key.

---

## 4. S2 — Shopper-facing "Today's deals" page (`/deals`)

### 4.1 Concept
The same simulation, viewed from the shopper's side: *"Here's what is discounted today and why — save food, save money."* Generated by running the Markdown policy for the chosen seed/rule and reading day `D`'s snapshot.

### 4.2 Data
From `SimResult.records` for day `D` (reported window): products where `maxDiscount > 0`. For each batch-level deal need: product, `basePrice`, discounted price, discount %, `daysLeft` (→ "Best before tonight"/"in 2 days"), units left in that batch at start of sale, estimated "units rescued so far this month".
Add to `DayProductRecord` an array `deals: { daysLeft: number; discount: number; qty: number }[]` (start-of-day post-delivery stock of discounted batches).

### 4.3 UX
- Hero: "Today's deals · Tuesday 14 Oct" (simulation calendar day; label "demo store"), counters: **N items on markdown · $X saved by shoppers · Y units rescued from waste (month-to-date)**.
- Grid of **price-tag-style cards** grouped by category: product name, ~~$2.00~~ **$1.20**, red "40% OFF" ribbon, "Expires tonight" / "2 days left" badge, "Only 8 left", small stock bar.
- **Day scrubber**: slider (day 1–30) + ▶ play button animating through the month; cards fade in/out.
- Controls (collapsed): seed and rule inherited from the URL; "Open in dashboard" link back.
- Share: copy-link button; optional QR (use a tiny QR lib or skip).
- Mobile-first, big touch targets, no dashboard chrome. Add `<title>` and OG tags.

### 4.4 Acceptance
- Deterministic: `/deals?seed=42&day=12&t1=2&d1=20&t2=1&d2=40` renders identically each time.
- Changing the rule in the dashboard and clicking "Deals ↗" carries params.
- With the Fixed policy or a rule that never fires: friendly empty state ("No markdowns today — fresh everywhere").
