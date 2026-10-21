/**
 * Demand model (plans/01 §6).
 *
 * Three groups of shoppers show up each day:
 *
 *  - **Baseline shoppers (N0)** — would have bought at full price anyway.
 *  - **Trade-down shoppers** — baseline shoppers who switch to the discounted
 *    batch. This is the cannibalization channel: they pay less than they
 *    would have, so it eats margin.
 *  - **Incremental shoppers (N1)** — new traffic that only exists because of
 *    the discount. This is the profit channel: new units at a price that
 *    still clears unit cost.
 *
 * The count of each group is drawn from a stream keyed by (seed, product, day)
 * only — never by the policy — so both policies meet the same shoppers
 * (common random numbers, plans/01 §9).
 */

import { normalFromUniforms, poisson, type SimRng } from "./rng";
import type { Product, SimParams } from "./types";

export interface DemandInput {
  product: Product;
  params: SimParams;
  productIdx: number;
  day: number;
  /** Weekday multiplier for the product's category (mean 1 over the week). */
  weekdayFactor: number;
  /** Price multiplier of the cheapest batch on the shelf (1 when nothing is discounted). */
  minMultiplier: number;
}

export interface DemandDraw {
  /** Mean-1 lognormal demand shock (A4). */
  shock: number;
  /** Demand rate for the day: λ × weekday shape × shock. */
  lambdaT: number;
  /** Baseline shoppers. */
  n0: number;
  /** Share of baseline shoppers who trade down to the discounted batch. */
  h: number;
  /** Incremental deal-driven shoppers. */
  n1: number;
}

export function drawDemand(rng: SimRng, input: DemandInput): DemandDraw {
  const { product, params, productIdx, day, weekdayFactor, minMultiplier } = input;

  const sigma = params.demandSigma;
  const z = normalFromUniforms(
    rng.next(productIdx, day, "shock"),
    rng.next(productIdx, day, "shock"),
  );
  // exp(σZ − σ²/2) has mean 1, so the shock moves demand without biasing it.
  const shock = Math.exp(sigma * z - (sigma * sigma) / 2);

  const lambdaBase = product.avgDailyDemand * params.demandScale;
  const lambdaT = lambdaBase * weekdayFactor * shock;

  const n0 = poisson(lambdaT, rng.next(productIdx, day, "n0"));

  // Trade-down: a fraction of the baseline shoppers switches to the cheaper
  // batch when a discount is visible (A6).
  const h = Math.min(1, params.responseScale * params.tradeDownK * (1 - minMultiplier));

  // Incremental: constant-elasticity lift, of which ρ is new traffic (A5, A7).
  const lift = minMultiplier > 0 ? Math.pow(minMultiplier, -product.priceSensitivity) - 1 : 0;
  const n1 = poisson(
    params.responseScale * params.dealReach * lambdaT * lift,
    rng.next(productIdx, day, "n1"),
  );

  return { shock, lambdaT, n0, h, n1 };
}
