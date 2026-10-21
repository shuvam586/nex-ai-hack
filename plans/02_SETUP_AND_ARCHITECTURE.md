# 02 · Setup & Architecture

## 1. Tooling and why

| Tool | Use | Notes |
|---|---|---|
| Node 20+ / pnpm (or npm) | runtime | pick one package manager and stick to it |
| Next.js (App Router) + TypeScript (`strict: true`) | app | `npx create-next-app@latest markdown-before-waste --ts --tailwind --eslint --app --src-dir` |
| Tailwind CSS | styling | comes with the scaffold |
| shadcn/ui | Tabs, Card, Slider, Switch, Select, Tooltip, Sheet, Badge, Table | `npx shadcn@latest init`, then `npx shadcn@latest add tabs card slider switch select tooltip sheet badge table button input` |
| Recharts | bar/line/scatter/composed charts | `pnpm add recharts` |
| Zustand | global state | `pnpm add zustand` |
| Comlink | Web Worker RPC | `pnpm add comlink` |
| lucide-react | icons | included with shadcn |
| Vitest | sim tests | `pnpm add -D vitest` |
| Python 3 + pandas + openpyxl | one-off UCI script | only for `scripts/` |
| Vercel | deploy | connect GitHub repo; no env vars needed |
| Git + GitHub | collaboration | `main` always deployable; short-lived feature branches |

If shadcn/Tailwind versions conflict, pin to whatever the shadcn init command targets rather than fighting it.

## 2. Phase 0 checklist (first 45 minutes)

1. Create repo, scaffold, push to GitHub, import into Vercel → **live URL within 20 minutes**.
2. Add deps above. Add `vitest.config.ts` (environment `node`), script `"test": "vitest run"`.
3. Copy `docs/` plan files into the repo.
4. A+B agree on `src/sim/types.ts` (§5) and commit it. This is the **only contract** between engine and UI.
5. A creates `src/sim/mock.ts` exporting a hand-made `SimResult` for B to build against.
6. Put `NEXT_PUBLIC_APP_NAME` etc. nowhere — there are no secrets in this project.

## 3. Folder responsibilities

- `src/sim/*` — **pure TS, deterministic, no DOM, no React**. Anything here must run in Node (tests) and in a worker.
- `src/sim/worker.ts` — exposes `{ run, runSeeds, optimize, sensitivity }` through Comlink.
- `src/store/useSimStore.ts` — holds UI inputs (`seed`, `policy`, `params`), calls the worker, stores results, syncs to URL.
- `src/components/*` — presentational; take `SimResult`-shaped props.
- `src/app/page.tsx` — dashboard shell with tabs. `src/app/deals/page.tsx` — shopper page.

## 4. Worker setup (Next.js)

```ts
// src/sim/worker.ts
import * as Comlink from 'comlink'
import { runSim, runSeeds } from './runner'
import { optimizeCategories } from './optimizer'
import { runSensitivity } from './sensitivity'
const api = { runSim, runSeeds, optimizeCategories, runSensitivity }
export type SimWorkerApi = typeof api
Comlink.expose(api)

// src/store/useSimStore.ts (client only)
const worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' })
export const sim = Comlink.wrap<SimWorkerApi>(worker)
```
- Create the worker lazily inside a `useEffect`/client-only module (Next SSR has no `Worker`).
- Fallback: if worker creation fails, call the functions directly (they're pure) — keep a `getSimApi()` wrapper.
- Debounce slider changes (≈120 ms) and ignore stale responses via a request counter.

## 5. TypeScript contracts (commit first)

```ts
// src/sim/types.ts
export type Category = 'Bakery' | 'Dairy' | 'Produce' | 'Meat & Fish' | 'Deli'

export interface Product {
  id: string; name: string; category: Category
  shelfLife: number            // days
  unitCost: number; basePrice: number
  avgDailyDemand: number
  priceSensitivity: number     // e
  packSize: number
  deliveryInterval: number; deliveryPhase: number
}

export interface Tier { daysLeft: number; discount: number }     // discount 0..0.9
export type PolicyConfig =
  | { kind: 'fixed' }
  | { kind: 'blanket'; discount: number }                         // reference policy
  | { kind: 'markdown'; tiers: Tier[]; byCategory?: Partial<Record<Category, Tier[]>> }

export interface SimParams {
  seed: number
  days: number                 // 30
  warmupDays: number           // 7
  responseScale: number        // s, default 1 (0.5 = half-strength)
  tradeDownK: number           // κ 1.5
  dealReach: number            // ρ 0.4
  demandSigma: number          // σ 0.20
  overorderScale: number       // ×safety, 1
  shelfLifeShift: number       // 0, ±1
  demandScale: number          // 1
  weekdayMode: 'uci' | 'prior' | 'flat'
}

export interface DayProductRecord {
  day: number; productId: string
  received: number; startStock: number
  sold: number; soldAtMarkdown: number; wasted: number; lostSales: number
  maxDiscount: number          // highest discount live that day (0 if none)
  stockByDaysLeft: Record<number, number>   // for drill-down chart
  revenue: number
}

export interface Totals {
  received: number; sold: number; wasted: number; lostSales: number
  revenue: number; cogs: number; wasteCost: number
  profit: number; netMarginPct: number; grossMarginPct: number; wastePct: number
  soldAtMarkdown: number
}

export interface SimResult {
  params: SimParams; policy: PolicyConfig
  records: DayProductRecord[]
  totals: Totals
  byProduct: Record<string, Totals>
  byCategory: Record<Category, Totals>
  byDay: { day: number; revenue: number; wasted: number; profit: number }[]
}

export interface Comparison { fixed: SimResult; markdown: SimResult; delta: Totals }
export interface SeedStat { mean: number; sd: number; ci95: [number, number]; winRate?: number }
export interface EvalResult {
  seeds: number[]
  wasteReductionPct: SeedStat      // (wasteFixed − wasteMD)/wasteFixed
  marginChangePts: SeedStat        // netMargin% MD − Fixed (percentage points)
  profitChangePct: SeedStat
  revenueChangePct: SeedStat
  perSeed: { seed: number; wasteReductionPct: number; marginChangePts: number; profitChangePct: number }[]
}
```

## 6. State and URL sync

Store fields: `seed`, `policy` (tiers + per-category overrides), `params` (response scale etc.), `comparison`, `evalResult`, `loading`.
URL: `/?seed=42&t1=2&d1=20&t2=1&d2=40&s=1` — parsed on load, rewritten via `history.replaceState` on change (debounced). The deals page reads the same query params.

## 7. Performance budget

| Operation | Target |
|---|---|
| One `runSim` (20 products × 37 days) | < 15 ms |
| `compare` (2 runs) | < 40 ms |
| `runSeeds` 10 seeds × 2 policies | < 400 ms |
| `runSensitivity` (~14 variants × 10 seeds × 2) | < 3 s (show progress) |
| `optimizeCategories` (~70 combos × 5 categories × 10 seeds) | < 5 s in worker (show progress bar) |

If over budget: avoid allocating per-shopper arrays (loop counters), reuse typed arrays, memoize by `JSON.stringify(inputs)`.

## 8. Code conventions

- No `any`; no `Math.random()` anywhere in `src/sim` (lint rule or grep test).
- Money in plain numbers (floats ok), format only at the view layer (`lib/format.ts`).
- All sim constants live in `catalog.ts` / `DEFAULT_PARAMS`, each with a comment pointing to the assumption ID (A1…A14).
- Every chart/table receives data through typed props and has a loading and empty state.

## 9. Deploy

- Vercel: import repo, framework auto-detected, no build overrides. Tag `mvp` once the MVP is live.
- Add `og:title/description` and a favicon (🥖) in `layout.tsx`.
- Final: test production URL in an incognito window and on a phone; save a screen recording as a fallback for flaky venue Wi-Fi.
- Optional: mirror deploy on Hugging Face Spaces only if Vercel fails (don't plan for it).
