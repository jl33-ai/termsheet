import { formatRelativeExpiry } from '$lib/date';
import { getCurrencySymbol } from '$lib/currency';
import type { MarketRow, OutcomeRow, UserPositionRow, SessionUser, MarketBanner } from '$lib/types';

export function computeMarketBanner(
	market: MarketRow,
	outcomes: OutcomeRow[],
	positions: UserPositionRow[],
    user: SessionUser | { id: string } | null
): MarketBanner {
	const now = Date.now();

	const isResolved = Boolean(market?.resolution_outcome_id);
	const closedByTime =
		Boolean(market?.expires_at) && new Date(market.expires_at as any).getTime() <= now;
	const isClosedTrading = !isResolved && (Boolean(market?.closed_at) || closedByTime);

	if (!isResolved && !isClosedTrading) {
		const exp = market?.expires_at ? new Date(market.expires_at).getTime() : NaN;
		if (Number.isFinite(exp)) {
			const diff = exp - now;
			const day = 24 * 60 * 60 * 1000;
			if (diff > 0 && diff <= day) {
				return {
					content: `Closes ${formatRelativeExpiry(market.expires_at || null)}`,
					icon: 'bx:time-five'
				};
			}
		}
	}

	if (isClosedTrading && !isResolved) {
		return { content: 'Market closed — resolution pending', icon: 'bx:time' };
	}

    if (isResolved) {
        const resolvedName = outcomeNameById(outcomes, market.resolution_outcome_id);
        const winningShares = winningSharesForUser(positions, market.resolution_outcome_id, user as any);
        const currency = getCurrencySymbol();
        const pot = toNum(market.pot_credits);
        const totalWinning = toNum(market.resolved_total_winning_shares);

        if (user) {
            if (winningShares > 0) {
                // Estimate claimable payout using stored resolution aggregates
                const payout = pot > 0 && totalWinning > 0 ? (pot * winningShares) / totalWinning : 0;
                const amountStr = payout > 0 ? `${currency}${payout.toFixed(2)}` : `${currency}0.00`;
                return { content: `Resolved: ${resolvedName} — ${amountStr}`, icon: 'bx:check' };
            }
            // User participated but has no winning shares
            const anyShares = totalUserShares(positions) > 0;
            if (anyShares) {
                return { content: `Resolved: ${resolvedName} — ${currency}0.00`, icon: 'bx:check' };
            }
        }
        return { content: `Resolved: ${resolvedName}`, icon: 'bx:check' };
    }

	return null;
}

function outcomeNameById(outcomes: OutcomeRow[], id?: string | null): string | null {
	if (!id) return null;
	const o = (outcomes || []).find((x) => x.id === id);
	return o ? o.name : null;
}

function winningSharesForUser(
    positions: UserPositionRow[],
    outcomeId?: string | null,
    user?: SessionUser | { id: string } | null
): number {
    if (!user || !outcomeId) return 0;
    const p = (positions || []).find((x) => x.outcome_id === outcomeId);
    return p ? Number(p.shares) : 0;
}

function totalUserShares(positions: UserPositionRow[]): number {
    let total = 0;
    for (const p of positions || []) total += Number(p.shares) || 0;
    return total;
}

function toNum(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
