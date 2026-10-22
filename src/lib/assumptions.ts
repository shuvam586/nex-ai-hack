/**
 * The assumption register (plans/01 §12), shipped with the app so a judge can
 * see every number the model rests on without leaving the page.
 *
 * The same table lives in the README. Keep the two in step.
 */

export interface Assumption {
  id: string;
  assumption: string;
  value: string;
  why: string;
  sensitivity: string;
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: "A1",
    assumption: "Shelf lives",
    value: "2–12 days by category",
    why: "Typical retail best-before/use-by windows per item type; real values vary by supplier and storage.",
    sensitivity: "±1 day",
  },
  {
    id: "A2",
    assumption: "Baseline daily demand",
    value: "8–60 units/day per SKU",
    why: "Plausible mid-size supermarket volume per SKU; the scale does not change any percentage.",
    sensitivity: "×0.7–1.3",
  },
  {
    id: "A3",
    assumption: "Weekday shape",
    value: "50% UCI + 50% grocery prior",
    why: "The UCI Online Retail II extract is a B2B gift wholesaler — a weak proxy — blended with a documented grocery prior. The UCI data is not ingested yet, so the prior is used.",
    sensitivity: "flat / prior / blend",
  },
  {
    id: "A4",
    assumption: "Demand noise",
    value: "σ = 0.20",
    why: "Daily SKU demand typically fluctuates about 15–30% around the forecast.",
    sensitivity: "0.1–0.35",
  },
  {
    id: "A5",
    assumption: "Price sensitivity",
    value: "e = 1.2–2.0 by category",
    why: "Promotion elasticities are larger in magnitude than everyday-price elasticities; staples lower, impulse items higher.",
    sensitivity: "×0.5–1.5",
  },
  {
    id: "A6",
    assumption: "Trade-down strength",
    value: "κ = 1.5",
    why: "A 20% discount moves about 30% of shoppers to the cheaper batch. Assumed — there is no ground truth for this.",
    sensitivity: "0.75–2.25",
  },
  {
    id: "A7",
    assumption: "Deal visibility",
    value: "ρ = 0.4",
    why: "Only part of the elasticity lift is new traffic; the rest is existing customers.",
    sensitivity: "0.2–0.6",
  },
  {
    id: "A8",
    assumption: "Over-order safety",
    value: "0.10–0.20 by category",
    why: "Stores order above the forecast to avoid stock-outs; this plus forecast error is where waste comes from.",
    sensitivity: "×0.5–1.5",
  },
  {
    id: "A9",
    assumption: "Freshness preference",
    value: "regulars take the freshest batch",
    why: "Shoppers reach to the back of the shelf — which is exactly why old stock expires at full price.",
    sensitivity: "on/off test",
  },
  {
    id: "A10",
    assumption: "Lead time",
    value: "0 days",
    why: "Simplification: orders placed at the start of the day arrive immediately.",
    sensitivity: "—",
  },
  {
    id: "A11",
    assumption: "Units per shopper",
    value: "1",
    why: "Simplification: one shopper buys one unit of one product.",
    sensitivity: "—",
  },
  {
    id: "A12",
    assumption: "No cross-product substitution",
    value: "—",
    why: "Keeps the model explainable and the categories separable, which the optimiser relies on.",
    sensitivity: "—",
  },
  {
    id: "A13",
    assumption: "Waste valued at unit cost",
    value: "cost",
    why: "A write-off. Disposal fees are ignored, which is conservative against markdown.",
    sensitivity: "+ disposal cost",
  },
  {
    id: "A14",
    assumption: "Gross margins",
    value: "41–52% per item",
    why: "Typical perishables range. The starting cost table implied 45–67%, so the costs were calibrated to sit inside the stated band.",
    sensitivity: "±5 pts",
  },
  {
    id: "A15",
    assumption: "Service order in the deal group",
    value: "incremental shoppers first",
    why: "Only incremental shoppers are restricted to discounted stock, so they are served first; deal-seekers can still fall back to full price.",
    sensitivity: "—",
  },
];
