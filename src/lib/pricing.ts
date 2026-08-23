export type PricingMethod = "markup" | "margin";
export type PricingRounding = "none" | "nearest_1" | "nearest_0_50" | "charm_99";

/** Suggests a selling price from cost price using the business's configured pricing method and
 * rounding rule (spec §23). Plain arithmetic — never an AI or market-price claim. Callers must
 * label the result "Suggested price", not an AI recommendation. */
export function suggestPrice(
  costPrice: number,
  method: PricingMethod,
  targetPercent: number,
  rounding: PricingRounding,
): number | null {
  if (!(costPrice > 0) || targetPercent < 0) return null;

  let price: number;
  if (method === "markup") {
    price = costPrice * (1 + targetPercent / 100);
  } else {
    if (targetPercent >= 100) return null;
    price = costPrice / (1 - targetPercent / 100);
  }

  return applyRounding(price, rounding);
}

function applyRounding(price: number, rounding: PricingRounding): number {
  switch (rounding) {
    case "nearest_1":
      return Math.round(price);
    case "nearest_0_50":
      return Math.round(price * 2) / 2;
    case "charm_99":
      return Math.max(Math.round(price) - 0.01, 0);
    case "none":
    default:
      return Math.round(price * 100) / 100;
  }
}
