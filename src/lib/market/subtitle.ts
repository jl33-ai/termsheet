import type { MarketType, OutcomeRow, PoolBalanceRow } from '$lib/types';

function repValue(o: OutcomeRow): number | null {
  if (o.rep_value != null) return Number(o.rep_value);
  const minv = o.min_value != null ? Number(o.min_value) : NaN;
  const maxv = o.max_value != null ? Number(o.max_value) : NaN;
  if (!Number.isNaN(minv) && !Number.isNaN(maxv)) return (minv + maxv) / 2;
  if (!Number.isNaN(minv) && Number.isNaN(maxv)) return minv;
  if (Number.isNaN(minv) && !Number.isNaN(maxv)) return maxv;
  return null;
}

export function priceForOutcome(
  outcomeId: string,
  balances: PoolBalanceRow[],
  outcomes: OutcomeRow[]
): number {
  const total = balances.reduce((acc, b) => acc + Number(b.balance), 0);
  if (total <= 0) return outcomes.length > 0 ? 1 / outcomes.length : 0;
  const ob = balances.find((b) => b.outcome_id === outcomeId);
  const bal = ob ? Number(ob.balance) : 0;
  return bal / total;
}

export function impliedScalarValue(
  outcomes: OutcomeRow[],
  balances: PoolBalanceRow[]
): number | null {
  let sum = 0;
  let probSum = 0;
  for (const o of outcomes || []) {
    const v = repValue(o);
    if (v == null) continue;
    const p = priceForOutcome(o.id, balances, outcomes);
    sum += p * v;
    probSum += p;
  }
  if (probSum <= 0) return null;
  return sum;
}

export function marketSubtitleString(
  market: { market_type: MarketType },
  outcomes: OutcomeRow[],
  balances: PoolBalanceRow[],
  opts?: { scalarFormatter?: (n: number) => string }
): string | null {
  if (!market || !outcomes) return null;
  if (market.market_type === 'BINARY') {
    const yes =
      outcomes.find((o) => (o.short_code || '').toUpperCase() === 'YES') ||
      outcomes.find((o) => (o.name || '').toLowerCase() === 'yes') ||
      outcomes.find((o) => o.index_id === 0);
    if (!yes) return null;
    const p = priceForOutcome(yes.id, balances, outcomes);
    const pct = Math.round(p * 100);
    return `${pct}% chance of yes`;
  }
  if (market.market_type === 'CATEGORICAL') {
    let best: OutcomeRow | null = null;
    let bestP = -1;
    for (const o of outcomes || []) {
      const p = priceForOutcome(o.id, balances, outcomes);
      if (p > bestP) {
        bestP = p;
        best = o as OutcomeRow;
      }
    }
    if (best) return `${best.name} (${(bestP * 100).toFixed(1)}%)`;
    return null;
  }
  // SCALAR_BUCKET
  const iv = impliedScalarValue(outcomes, balances);
  if (iv == null) return null;
  return opts?.scalarFormatter ? opts.scalarFormatter(Number(iv)) : `${Number(iv).toLocaleString()}`;
}

export function marketSummaryString(
  market: { market_type: MarketType },
  outcomes: OutcomeRow[],
  balances: PoolBalanceRow[]
): string | null {
  if (!market || !outcomes) return null;
  if (market.market_type === 'BINARY') {
    const yes =
      outcomes.find((o) => (o.short_code || '').toUpperCase() === 'YES') ||
      outcomes.find((o) => (o.name || '').toLowerCase() === 'yes') ||
      outcomes.find((o) => o.index_id === 0);
    if (!yes) return null;
    const p = priceForOutcome(yes.id, balances, outcomes);
    return `Yes: ${(p * 100).toFixed(1)}%`;
  }
  if (market.market_type === 'CATEGORICAL') {
    let best: OutcomeRow | null = null;
    let bestP = -1;
    for (const o of outcomes || []) {
      const p = priceForOutcome(o.id, balances, outcomes);
      if (p > bestP) {
        bestP = p;
        best = o as OutcomeRow;
      }
    }
    if (best) return `${best.name} (${(bestP * 100).toFixed(1)}%)`;
    return null;
  }
  const iv = impliedScalarValue(outcomes, balances);
  if (iv == null) return null;
  return `${Number(iv).toLocaleString()}`;
}

