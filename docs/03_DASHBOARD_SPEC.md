# 03 · Dashboard & Frontend Specification

Audience: hackathon judges who spend ~2 minutes. The first screen must answer: *"Does markdown help, and what does it cost?"* — with waste **and** margin side by side.

## 1. Visual design

- **Mood:** fresh-market, clean, trustworthy. Light theme (optional dark later; skip if short on time).
- **Palette:** background `#FAFAF7`, ink `#1F2937`; **Fixed price = slate** `#64748B`; **Markdown = green** `#16A34A`; markdown tier colors: 20% = amber `#FBBF24`, 40% = orange `#F97316`, 60% = deep red-orange `#EA580C`; **Waste = red** `#DC2626`; profit up/down chips green/red.
- **Type:** Inter (body) + a display face for headings (e.g. Fraunces or DM Serif Display) via `next/font`.
- **Components:** shadcn `Card` with soft shadows, 12px radius; numbers in tabular-nums; generous spacing; subtle fade-in on result change.
- **Consistency rule:** Fixed always slate, Markdown always green in every chart and table.

## 2. Page shell (`/`)

```
┌ Top bar ───────────────────────────────────────────────────────────────────┐
│ 🥖 Markdown Before Waste     Seed [ 42 ] 🎲 re-roll   Assumptions ⓘ  Deals ↗ │
├ Left rail (controls) ─────┬ Main (tabs) ───────────────────────────────────┤
│ Markdown rule             │ Overview | Products | Timeline | Robustness | Optimize │
│  Tier 1: ≤ [2] days  [20]%│                                                │
│  Tier 2: ≤ [1] day   [40]%│                                                │
│ Per-category override ▸   │                                                │
│ Shopper response  ●──○ 1.0×│                                               │
│ Preset: Default / Aggressive / Gentle / Optimized                          │
└───────────────────────────┴────────────────────────────────────────────────┘
```
- **Top bar:** the **seed is always visible** and editable; "re-roll" picks a new seed; a small "Reproduce: same seed ⇒ same numbers" tooltip. "Assumptions ⓘ" opens a right-side `Sheet` showing the assumption register (from `01 §12`) with editable global parameters (κ, ρ, σ, weekday mode) and a "Reset to defaults" button.
- **Left rail:** sliders for threshold days (1–4) and discount (0–60% step 5), a toggle for per-category overrides, a "shopper response" slider (0.5×–1.5×) and presets. All changes debounce 120 ms and recompute. On mobile the rail collapses into a `Sheet`.

## 3. Overview tab (the money screen)

**Row 1 — KPI pairs (4 cards).** Each card shows Fixed vs Markdown value and a delta chip:
1. **Units wasted** (and waste % of received) — delta in % reduction, green when down.
2. **Revenue** — delta %.
3. **Profit** — delta %, **bold**; if profit falls while waste falls, chip turns amber with tooltip "less waste, but at a margin cost".
4. **Net margin %** — delta in percentage points.
A one-line **verdict banner** auto-generated from the numbers, e.g. *"Markdown cut waste by 41% and raised profit by 3.2% on seed 42."* If profit decreases: *"Markdown cut waste by X% but reduced profit by Y% — this rule is too aggressive."* (Honest wording builds trust.)

**Row 2 — charts (2 columns):**
- **Waste vs profit trade-off scatter** (hero chart): x = units wasted, y = profit. Points: Fixed, Markdown (current), **Blanket 30% off**, plus a faint **sweep curve** of the markdown rule at discount depth 0…60% (compute 13 points). Annotations: "Discount everything: lowest waste, but profit falls." This directly answers the prompt's watch-out.
- **Daily timeline** (composed chart): bars = units wasted/day (Fixed slate vs Markdown green), line = profit/day for each.

**Row 3 — Category breakdown:** grouped bars (waste % by category, Fixed vs Markdown) + small table of profit Δ by category.

Acceptance: all numbers update live as sliders move; seed visible; deltas correct sign and color.

## 4. Products tab

- **Sortable table** (shadcn Table), 20 rows: product, category, shelf life, units received, **wasted (Fixed → Markdown)**, units sold at markdown, **profit Δ ($)**, avg discount depth, lost sales. Footer row = totals. Click row → opens **drill-down panel**.
- **Drill-down (Sheet or inline card):**
  - Stacked bar by day: start-of-day stock split by `daysLeft` (colors: fresh → green, 2 left → amber, 1 left → red). This shows batches aging.
  - Line overlay: effective price per day.
  - Mini bars: units sold at full vs markdown, units wasted — Fixed vs Markdown.
  - Text: "Marked down on N of 30 days; rescued X units; wasted Y".
- Filters: category chips; search box.

## 5. Timeline tab (what was marked down and when)

- **Heatmap:** rows = 20 products grouped by category, columns = 30 days (weekday labels on top, weekends shaded). Cell color = `maxDiscount` that day (white = none, amber/orange tiers). A small **red dot** in a cell = units wasted that day (Markdown run), tooltip shows: date, product, discount live, units sold at discount, units wasted, stock by `daysLeft`.
- Toggle: *Markdown run* / *Fixed run* (fixed run shows only waste dots, making the contrast obvious).
- Build with CSS grid + `title`/Radix tooltip. 20×30 = 600 cells — no performance issue.

## 6. Robustness tab (judges' "results must hold up")

1. **10-seed evaluation card:** table of mean ± 95% CI for **waste reduction %**, **net margin change (pts)**, profit change %, revenue change %; "Markdown wins on profit in **k/10** seeds"; per-seed bar chart (seed on x, waste reduction on y with profit-change as a second series). Seeds default to 1–10; run button re-runs. 
2. **Shopper-response panel:** three-way segmented control **0.5× / 1.0× / 1.5×** showing the same KPI pair row for each (computed in parallel, displayed side by side). Caption: "What if shoppers respond half as strongly to discounts?" Show the rule's verdict at 0.5× (it may flip to "profit down" — display honestly, and show that waste still falls).
3. **Tornado chart:** profit-change % of markdown vs fixed when each assumption moves low/high (list in `04 §3.2`). Bars sorted by impact; baseline line at zero → shows which assumptions can flip the conclusion.
4. **Verdict line:** "Markdown reduces waste in all N scenarios; it improves profit in M of N."

## 7. Optimize tab (stretch)

- Button "Search best discount steps" with progress bar (worker).
- Per category card: best tiers found (e.g. "≤3 days: 15% · ≤1 day: 40%"), **in-sample** profit gain and **held-out seeds** gain (side by side), waste reduction. Mini Pareto scatter of all tried combos (waste vs profit) with the best highlighted.
- Buttons: "Apply to dashboard" (sets per-category overrides, preset = Optimized), "Compare with default rule".
- Objective selector: *Max profit* | *Max profit with waste weight w* (slider 0–$1 per unit wasted, default 0).

## 8. Deals page `/deals` (stretch — see `04 §4`)

Shopper-facing, clean retail styling, separate from the dashboard chrome; link in top bar.

## 9. Interaction & UX details

- Loading: skeleton on KPI cards; keep previous numbers dimmed while recomputing (avoid flicker).
- Errors: if worker fails, fallback to main-thread run and show a small toast.
- Empty states: "No markdowns triggered — widen thresholds" if rule never fires.
- Accessibility: color is never the only signal (add icons/labels); tooltips keyboard focusable; contrast AA.
- Responsive: dashboard usable at 1280 px; tablet OK; deals page fully mobile-first (judges may scan a QR on a phone).
- Copy: explain jargon inline (e.g. "Trade-down: shoppers switching to the cheaper batch").

## 10. Component inventory

`TopBar`, `ControlsRail`, `KpiPair`, `VerdictBanner`, `TradeoffScatter`, `DailyComposedChart`, `CategoryBars`, `ProductTable`, `ProductDrawer` (`StockByAgeChart`), `MarkdownHeatmap`, `EvalCard`, `ResponseCompare`, `TornadoChart`, `OptimizeTab`, `AssumptionsSheet`, `DealsGrid`, `DealCard`.

## 11. Build order for Person B

1. Shell + TopBar + ControlsRail + tabs with **mock** `Comparison`.
2. `KpiPair` ×4 + `VerdictBanner` (finish the Overview skeleton).
3. Hook worker `compare()` → live numbers (**MVP milestone**).
4. `TradeoffScatter`, `DailyComposedChart`, `CategoryBars`.
5. `ProductTable` + `ProductDrawer`.
6. `MarkdownHeatmap`.
7. `EvalCard`, `ResponseCompare`, `TornadoChart`.
8. `AssumptionsSheet`.
9. `OptimizeTab`, `/deals`.
10. Polish pass: spacing, number formatting, animations, mobile.

## 12. Acceptance checklist (UI)

- [ ] Seed visible in top bar and URL; changing it changes numbers; reloading with same URL reproduces them.
- [ ] Waste, revenue, profit, **net margin** shown together for both policies.
- [ ] Sliders update within ~300 ms.
- [ ] Heatmap shows *what* was marked down and *when*.
- [ ] Blanket-discount point visible on the trade-off chart.
- [ ] 10-seed table and half-strength view present.
- [ ] No console errors; works in a fresh incognito window.
