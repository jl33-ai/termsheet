// Centralized helpers for placing trades/bets
import { redirectToLogin, setPostAuthIntent } from '$lib/auth/client';
import type { PlaceBetBody as PlaceBetParams, PlaceBetResult } from '$lib/types';

export async function placeBet({ market_id, outcome_id, amount_credits, comment }: PlaceBetParams): Promise<PlaceBetResult> {
  const res = await fetch('/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market_id, outcome_id, amount_credits, comment })
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Persist bet intent so we can resume after login
      try { setPostAuthIntent({ t: 'bet', market_id, outcome_id, amount_credits, comment }); } catch {}
      redirectToLogin();
      throw new Error('Please log in to place your bet');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Betting failed');
  }
  const result = (await res.json()) as PlaceBetResult;
  if (!result?.success) {
    throw new Error((result as any)?.error || 'Betting failed with no error message');
  }
  return result;
}
