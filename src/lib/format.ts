// Numeric/text formatting helpers

export function format2(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.00';
  return x.toFixed(2);
}

export function formatPct(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

