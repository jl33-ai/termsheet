// Helpers to compute outcome prices from pool balances
import type { PoolBalanceRow } from '$lib/types';

export function buildPriceMapFromPool(pool: PoolBalanceRow[]): Map<string, number> {
  const map = new Map<string, number>();
  const total = pool.reduce((acc, b) => acc + Number(b.balance), 0);
  if (total > 0) {
    for (const b of pool) map.set(b.outcome_id, Number(b.balance) / total);
  }
  return map;
}

export function outcomePrice(
  outcomeId: string,
  priceMap: Map<string, number>,
  outcomesCount: number
): number {
  if (outcomesCount <= 0) return 0;
  const p = priceMap.get(outcomeId);
  if (p != null) return p;
  // Fallback to uniform distribution if pool empty
  return 1 / outcomesCount;
}
