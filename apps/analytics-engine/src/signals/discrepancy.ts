// Price discrepancy signal: detects spreads between markets for the same pair
// and emits a signal with the spread percent.
export interface MarketPrice {
  marketId: string;
  pair: string;
  price: number;
  source: string;
}

export interface PriceDiscrepancySignal {
  type: "price-discrepancy";
  pair: string;
  lowMarket: string;
  highMarket: string;
  spreadPct: number;
  detectedAt: string;
}

export function detectPriceDiscrepancies(
  prices: MarketPrice[],
  minSpreadPct = 0.5,
): PriceDiscrepancySignal[] {
  const byPair = new Map<string, MarketPrice[]>();
  for (const p of prices) {
    const list = byPair.get(p.pair) ?? [];
    list.push(p);
    byPair.set(p.pair, list);
  }
  const signals: PriceDiscrepancySignal[] = [];
  for (const [pair, list] of byPair) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.price - b.price);
    const low = sorted[0] as MarketPrice;
    const high = sorted[sorted.length - 1] as MarketPrice;
    if (low.price <= 0) continue;
    const spreadPct = ((high.price - low.price) / low.price) * 100;
    if (spreadPct >= minSpreadPct) {
      signals.push({
        type: "price-discrepancy",
        pair,
        lowMarket: low.marketId,
        highMarket: high.marketId,
        spreadPct,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return signals;
}
