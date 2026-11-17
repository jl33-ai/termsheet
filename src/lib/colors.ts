// Outcome and bar color utilities shared across pages
// Keep palette and mapping here as the single source of truth.
// Palette: ensure consistent, minimal colors across the app.
import type { OutcomeLike, BinaryIntent } from '$lib/types';

// Read colors from CSS variables to keep a single source of truth.
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

function cssVar(name: string, fallback: string): string {
	if (!isBrowser) return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

export const binaryYesColor = cssVar('--c-green', '#4CB781');

export const binaryNoColor = cssVar('--c-binary-no', '#EB5658');

export const outcomePaletteCategorical = [
	cssVar('--c-outcome-1', '#BFC0C8'),
	cssVar('--c-outcome-2', '#5F6AD1'),
	cssVar('--c-outcome-3', '#25B6CD'),
	cssVar('--c-outcome-4', '#4CB781'),
	cssVar('--c-outcome-5', '#F2C84C'),
	cssVar('--c-outcome-6', '#F2994B'),
	cssVar('--c-outcome-7', '#F8C7C0'),
	cssVar('--c-outcome-8', '#EB5658')
];

export function rgbaFromHex(hex?: string | null, alpha = 0.45): string {
	let h = (hex || '').replace('#', '');
	if (h.length !== 6 && h.length !== 8) h = '2563eb';
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildOutcomeIndex(outcomes: OutcomeLike[]): Record<string, number> {
	const m: Record<string, number> = {};
	outcomes.forEach((o, idx) => (m[o.id] = idx));
	return m;
}

// Simple deterministic string hash (djb2)
function hashString(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash) + input.charCodeAt(i);
    return hash >>> 0; // unsigned
}

export function outcomeColorHex(args: {
    explicitHex?: string | null;
    indexId?: number | null;
    id?: string | null;
    name?: string | null;
    shortCode?: string | null;
}): string | null {
    const { explicitHex, indexId, id, name, shortCode } = args;
    if (explicitHex && typeof explicitHex === 'string' && explicitHex.trim()) return explicitHex;
    const intent = binaryIntentFromName(shortCode || name || null);
    if (intent !== 'neutral') return binaryIntentBaseColorHex(intent);
    if (Number.isFinite(indexId) && (indexId as number) >= 0) {
        const idx = (indexId as number) % outcomePaletteCategorical.length;
        return outcomePaletteCategorical[idx];
    }
    const key = (id && String(id)) || (name && String(name)) || (shortCode && String(shortCode)) || '';
    if (!key) return outcomePaletteCategorical[0];
    const idx = hashString(key) % outcomePaletteCategorical.length;
    return outcomePaletteCategorical[idx];
}

export function colorForOutcomeId(
    outcomes: OutcomeLike[],
    byId: Record<string, number>,
    outcomeId?: string | null
): string | null {
    if (!outcomeId) return null;
    const o = outcomes.find((x) => x.id === outcomeId) as any;
    return outcomeColorHex({
        explicitHex: o?.color_hex ?? o?.colorHex ?? null,
        indexId: (o?.index_id ?? o?.indexId) ?? (byId?.[o?.id] ?? null),
        id: o?.id ?? outcomeId,
        name: o?.name,
        shortCode: o?.short_code ?? o?.shortCode ?? null,
    });
}

export function colorForOutcomeName(
    outcomes: OutcomeLike[],
    byId: Record<string, number>,
    name?: string | null
): string | null {
    if (!name) return null;
    const n = String(name);
    const upper = n.toUpperCase();
    const lower = n.toLowerCase();
    const o = (outcomes as any[]).find((x) =>
        String(x?.name ?? '').trim().toLowerCase() === lower ||
        String(x?.short_code ?? x?.shortCode ?? '').trim().toUpperCase() === upper
    ) as any;
    return outcomeColorHex({
        explicitHex: o?.color_hex ?? o?.colorHex ?? null,
        indexId: (o?.index_id ?? o?.indexId) ?? (o?.id ? byId?.[o.id] : null),
        id: o?.id ?? null,
        name: n,
        shortCode: o?.short_code ?? o?.shortCode ?? null,
    });
}

// Bar color configuration
export const barColor = {
	selectedAlpha: 1,
	unselectedAlpha: 0.6,
	hoverAlpha: 1
};

// Binary intent helpers

export function binaryIntentFromName(name?: string | null): BinaryIntent {
	if (!name) return 'neutral';
	const n = String(name).trim().toLowerCase();
	if (n === 'yes' || n === 'y') return 'yes';
	if (n === 'no' || n === 'n') return 'no';
	return 'neutral';
}

export function binaryIntentBaseColorHex(intent: BinaryIntent): string {
	if (intent === 'yes') return binaryYesColor;
	if (intent === 'no') return binaryNoColor;
	return cssVar('--c-green', '#2563eb');
}

export function barFillForBinary(intent: BinaryIntent, selected: boolean): string {
	const base = binaryIntentBaseColorHex(intent);
	const a = selected ? barColor.selectedAlpha : barColor.unselectedAlpha;
	return rgbaFromHex(base, a);
}

export function barFillForOutcome(
	outcomes: OutcomeLike[],
	outcomeId?: string | null,
	selected?: boolean
): string | null {
	const o = outcomes.find((x) => x.id === outcomeId) as any;
	const hex = outcomeColorHex({
		explicitHex: o?.color_hex ?? o?.colorHex ?? null,
		indexId: (o?.index_id ?? o?.indexId) ?? null,
		id: outcomeId ?? o?.id ?? null,
		name: o?.name ?? null,
		shortCode: o?.short_code ?? o?.shortCode ?? null,
	});
	if (!hex) return null;
	const a = selected ? barColor.selectedAlpha : barColor.unselectedAlpha;
	return rgbaFromHex(hex, a);
}
