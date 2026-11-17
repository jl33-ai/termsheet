// Simple currency helpers for UI formatting
// Decides between "$" and "€" based on user locale/region.

const EURO_REGIONS = new Set([
	'AT',
	'BE',
	'CY',
	'DE',
	'EE',
	'ES',
	'FI',
	'FR',
	'GR',
	'IE',
	'IT',
	'LT',
	'LU',
	'LV',
	'MT',
	'NL',
	'PT',
	'SI',
	'SK'
]);

let _cachedSymbol: string | null = null;

export function getCurrencySymbol(): string {
	if (_cachedSymbol) return _cachedSymbol;
	let symbol = '$';
	try {
		if (typeof Intl !== 'undefined') {
			const opt = Intl.DateTimeFormat().resolvedOptions();
			const loc = opt?.locale || '';
			const match = loc.match(/-([A-Z]{2})$/);
			const region = match?.[1];
			if (region && EURO_REGIONS.has(region)) symbol = '€';
			else {
				const tz = opt?.timeZone || '';
				if (tz && tz.startsWith('Europe/')) symbol = '€';
			}
		}
		if (symbol === '$' && typeof navigator !== 'undefined') {
			const langs: string[] = (navigator as any).languages || [navigator.language];
			for (const l of langs) {
				const m = l && l.match(/-([A-Z]{2})$/);
				const r = m?.[1];
				if (r && EURO_REGIONS.has(r)) {
					symbol = '€';
					break;
				}
			}
		}
	} catch {}
	_cachedSymbol = symbol;
	return symbol;
}

export function formatMoney(amount: number, symbol = getCurrencySymbol()): string {
	const n = Number(amount) || 0;
	return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAbbrev(amount: number, symbol = getCurrencySymbol()): string {
	const n = Number(amount) || 0;
	if (n >= 1_000_000_000_000) return `${symbol}${(n / 1_000_000_000_000).toFixed(2)}T`;
	if (n >= 1_000_000_000) return `${symbol}${(n / 1_000_000_000).toFixed(2)}B`;
	if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(2)}K`;
	return `${symbol}${n.toFixed(2)}`;
}
