/**
 * Product catalog and default parameters (plans/01 §3, §12).
 *
 * Every value here is an assumption with an ID from the register in
 * plans/01 §12. The table is the single source of truth for the product mix;
 * calibration (§10) tunes the *parameters* below, never the table itself.
 */

import type { Category, Product, SimParams } from "./types";

/**
 * 20 perishables (plans/01 §3).
 *
 * `deliveryPhase` staggers deliveries so orders do not all land on the same
 * day; a delivery arrives when `day % deliveryInterval === deliveryPhase`.
 */
export const CATALOG: Product[] = [
  // Bakery
  {
    id: "bread-white",
    name: "White bread loaf",
    category: "Bakery",
    shelfLife: 3, // A1
    unitCost: 1.14,
    basePrice: 2.0,
    avgDailyDemand: 40, // A2
    priceSensitivity: 1.8, // A5
    packSize: 10,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "bread-wholewheat",
    name: "Whole-wheat bread",
    category: "Bakery",
    shelfLife: 3,
    unitCost: 1.37,
    basePrice: 2.4,
    avgDailyDemand: 25,
    priceSensitivity: 1.8,
    packSize: 10,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "croissant",
    name: "Croissant",
    category: "Bakery",
    shelfLife: 2,
    unitCost: 0.8,
    basePrice: 1.5,
    avgDailyDemand: 30,
    priceSensitivity: 2.0,
    packSize: 10,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "bagels",
    name: "Bagels (6-pack)",
    category: "Bakery",
    shelfLife: 4,
    unitCost: 1.71,
    basePrice: 3.0,
    avgDailyDemand: 12,
    priceSensitivity: 1.8,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  // Dairy
  {
    id: "milk",
    name: "Milk 1 L",
    category: "Dairy",
    shelfLife: 6,
    unitCost: 0.7,
    basePrice: 1.2,
    avgDailyDemand: 60,
    priceSensitivity: 1.2,
    packSize: 12,
    deliveryInterval: 2,
    deliveryPhase: 1,
  },
  {
    id: "greek-yogurt",
    name: "Greek yogurt",
    category: "Dairy",
    shelfLife: 9,
    unitCost: 1.1,
    basePrice: 1.9,
    avgDailyDemand: 28,
    priceSensitivity: 1.4,
    packSize: 12,
    deliveryInterval: 2,
    deliveryPhase: 0,
  },
  {
    id: "cheddar",
    name: "Cheddar block",
    category: "Dairy",
    shelfLife: 12,
    unitCost: 2.61,
    basePrice: 4.5,
    avgDailyDemand: 10,
    priceSensitivity: 1.3,
    packSize: 6,
    deliveryInterval: 3,
    deliveryPhase: 2,
  },
  {
    id: "fresh-cream",
    name: "Fresh cream",
    category: "Dairy",
    shelfLife: 6,
    unitCost: 1.32,
    basePrice: 2.3,
    avgDailyDemand: 8,
    priceSensitivity: 1.4,
    packSize: 6,
    deliveryInterval: 2,
    deliveryPhase: 1,
  },
  // Produce
  {
    id: "bananas",
    name: "Bananas (kg)",
    category: "Produce",
    shelfLife: 5,
    unitCost: 0.81,
    basePrice: 1.4,
    avgDailyDemand: 35,
    priceSensitivity: 1.5,
    packSize: 10,
    deliveryInterval: 2,
    deliveryPhase: 0,
  },
  {
    id: "tomatoes",
    name: "Tomatoes (kg)",
    category: "Produce",
    shelfLife: 6,
    unitCost: 1.27,
    basePrice: 2.2,
    avgDailyDemand: 25,
    priceSensitivity: 1.5,
    packSize: 10,
    deliveryInterval: 2,
    deliveryPhase: 1,
  },
  {
    id: "spinach",
    name: "Spinach bag",
    category: "Produce",
    shelfLife: 4,
    unitCost: 1.1,
    basePrice: 1.9,
    avgDailyDemand: 18,
    priceSensitivity: 1.6,
    packSize: 6,
    deliveryInterval: 2,
    deliveryPhase: 0,
  },
  {
    id: "strawberries",
    name: "Strawberries",
    category: "Produce",
    shelfLife: 3,
    unitCost: 1.86,
    basePrice: 3.5,
    avgDailyDemand: 15,
    priceSensitivity: 1.7,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "apples",
    name: "Apples (kg)",
    category: "Produce",
    shelfLife: 9,
    unitCost: 1.33,
    basePrice: 2.3,
    avgDailyDemand: 22,
    priceSensitivity: 1.4,
    packSize: 10,
    deliveryInterval: 3,
    deliveryPhase: 0,
  },
  // Meat & Fish
  {
    id: "chicken-breast",
    name: "Chicken breast",
    category: "Meat & Fish",
    shelfLife: 3,
    unitCost: 3.34,
    basePrice: 5.8,
    avgDailyDemand: 20,
    priceSensitivity: 1.6,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "salmon",
    name: "Salmon fillet",
    category: "Meat & Fish",
    shelfLife: 3,
    unitCost: 4.59,
    basePrice: 8.5,
    avgDailyDemand: 10,
    priceSensitivity: 1.6,
    packSize: 4,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "ground-beef",
    name: "Ground beef",
    category: "Meat & Fish",
    shelfLife: 3,
    unitCost: 3.14,
    basePrice: 5.5,
    avgDailyDemand: 14,
    priceSensitivity: 1.6,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  // Deli
  {
    id: "sandwich",
    name: "Sandwich",
    category: "Deli",
    shelfLife: 2,
    unitCost: 1.7,
    basePrice: 3.2,
    avgDailyDemand: 22,
    priceSensitivity: 1.8,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "salad-bowl",
    name: "Salad bowl",
    category: "Deli",
    shelfLife: 3,
    unitCost: 1.89,
    basePrice: 3.5,
    avgDailyDemand: 14,
    priceSensitivity: 1.7,
    packSize: 6,
    deliveryInterval: 1,
    deliveryPhase: 0,
  },
  {
    id: "hummus",
    name: "Hummus",
    category: "Deli",
    shelfLife: 6,
    unitCost: 1.28,
    basePrice: 2.2,
    avgDailyDemand: 12,
    priceSensitivity: 1.5,
    packSize: 6,
    deliveryInterval: 2,
    deliveryPhase: 1,
  },
  {
    id: "fresh-pasta",
    name: "Fresh pasta",
    category: "Deli",
    shelfLife: 5,
    unitCost: 1.45,
    basePrice: 2.5,
    avgDailyDemand: 12,
    priceSensitivity: 1.5,
    packSize: 6,
    deliveryInterval: 2,
    deliveryPhase: 0,
  },
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(
  CATALOG.map((product) => [product.id, product]),
);

/**
 * Over-order safety factor by category (A8). Stores order above the forecast
 * to avoid stock-outs; combined with forecast error this is the source of
 * baseline waste.
 *
 * Calibrated in plans/01 §10: the values sit at the top of the documented
 * 0.10–0.20 band, which is what puts baseline waste inside the 7–12% target.
 */
export const SAFETY_BY_CATEGORY: Record<Category, number> = {
  Bakery: 0.2,
  Dairy: 0.1,
  Produce: 0.2,
  "Meat & Fish": 0.2,
  Deli: 0.2,
};

export const DEFAULT_PARAMS: SimParams = {
  seed: 42,
  days: 30, // reported window (plans/01 §1)
  warmupDays: 7, // discarded, so the store starts in steady state
  responseScale: 1, // s
  tradeDownK: 1.5, // κ (A6)
  dealReach: 0.4, // ρ (A7)
  demandSigma: 0.2, // σ (A4)
  overorderScale: 1, // multiplies SAFETY_BY_CATEGORY
  shelfLifeShift: 0, // ±1 day (A1)
  demandScale: 1, // multiplies λ (A2)
  weekdayMode: "uci", // blends the UCI shape with the grocery prior (plans/04 §1.3)
};
