export function slugify(s: string): string {
	return (
		s
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 64) || 'outcome'
	);
}

// Extract unique outcome ids from an HTML string
export function extractOutcomeIdsFromHTML(html: string): string[] {
	const ids = new Set<string>();
	const re = /data-outcome-id=\"([^\"]+)\"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		if (m[1]) ids.add(m[1]);
	}
	return Array.from(ids);
}

// Fetch a single outcome by id via API
import type { OutcomeDetail } from './types';

export async function fetchOutcome(
	outcomeId: string,
	fetchFn?: any
): Promise<OutcomeDetail | null> {
	try {
		const r = await (fetchFn ?? fetch)(`/api/outcomes/${encodeURIComponent(outcomeId)}`);
		if (!r.ok) return null;
		const d = await r.json().catch(() => null);
		return (d?.outcome ?? null) as OutcomeDetail | null;
	} catch {
		return null;
	}
}

// Fetch Polymarket last price via proxy; returns number or null
export async function fetchPolymarketPrice(
	externalRef: string,
	fetchFn?: any
): Promise<number | null> {
	if (!externalRef) return null;
	try {
		const r = await (fetchFn ?? fetch)(
			`/polymarket/market-price/${encodeURIComponent(externalRef)}`
		);
		if (!r.ok) return null;
		const d = await r.json().catch(() => null);
		return typeof d?.price === 'number' ? d.price : null;
	} catch {
		return null;
	}
}

// Resolve best-available last price for an outcome (external beats DB)
import type { OutcomeDetail as _OutcomeDetail } from './types';

export async function lastPriceForOutcome(
	outcome: _OutcomeDetail | null | undefined,
	fetchFn?: any
): Promise<number | null> {
	if (!outcome) return null;
	const ext = (outcome?.external_ref as string | undefined) || '';
	if (ext.trim()) {
		const p = await fetchPolymarketPrice(ext, fetchFn);
		if (typeof p === 'number') return p;
	}
	const lp = outcome?.last_price;
	return typeof lp === 'number' ? lp : null;
}

export function yesChanceCopy(summary: string | null): string | null {
	if (!summary) return null;
	const m = summary.match(/yes[:\s]+(\d+(?:\.\d+)?)%/i);
	if (m) {
		const yesPct = Number(m[1]);
		if (Number.isFinite(yesPct)) {
			const noPct = 100 - yesPct;
			const isYesHigher = yesPct >= noPct;
			const topPct = Math.round(isYesHigher ? yesPct : noPct);
			const side = isYesHigher ? 'yes' : 'no';
			return `${topPct}% chance of ${side}`;
		}
		// Fallback if parsing produced a non-finite number
		return `${m[1]}% chance of yes`;
	}
	return summary;
}
