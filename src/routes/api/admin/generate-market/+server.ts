import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema, eq } from '$lib/server/db.ts';
import { llmGenerate } from '$lib/server/llm.ts';
import type { MarketType, DefaultMarketTemplate, DefaultOutcomeTemplate } from '$lib/types';

type GenBody = {
	prompt: string;
	market_type: MarketType;
	company_id?: string | null;
};

// Extract the first top-level JSON object from a string
function extractJson(text: string): any {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in response');
	const slice = text.slice(start, end + 1);
	return JSON.parse(slice);
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as GenBody;
		const prompt = (body?.prompt || '').trim();
		const market_type = body?.market_type;
		const company_id = body?.company_id || null;

		if (!prompt) return json({ error: 'prompt is required' }, { status: 400 });
		if (!market_type || !['BINARY', 'CATEGORICAL', 'SCALAR_BUCKET'].includes(market_type)) {
			return json({ error: 'invalid market_type' }, { status: 400 });
		}

		// Optional company context
		let companyName: string | null = null;
		if (company_id) {
			const rows = await db
				.select({ name: schema.companies.name })
				.from(schema.companies)
				.where(eq(schema.companies.id, company_id))
				.limit(1);
			companyName = rows?.[0]?.name ?? null;
		}

		// Instruct the model to return strictly valid JSON with a template and optional explicit UTC expiry
		// Provide current date so the model can set future expiries sensibly
		const today = new Date();
		const todayIso = today.toISOString().slice(0, 10); // YYYY-MM-DD
		const schemaDesc =
			market_type === 'BINARY'
				? `{
  "template": {
    "question": string,
    "market_type": "BINARY",
    "rules"?: string,
    "expires_months"?: number
  },
  "expires_at_utc"?: string // ISO 8601 UTC (e.g., 2026-12-31T00:00:00Z)
}`
				: market_type === 'CATEGORICAL'
					? `{
  "template": {
    "question": string,
    "market_type": "CATEGORICAL",
    "rules"?: string,
    "expires_months"?: number,
    "outcomes": Array<{ "name": string, "short_code": string }>
  },
  "expires_at_utc"?: string
}`
					: `{
  "template": {
    "question": string,
    "market_type": "SCALAR_BUCKET",
    "rules"?: string,
    "expires_months"?: number,
    "outcomes": Array<{
      "name": string,
      "short_code": string,
      "min_value"?: number,
      "max_value"?: number,
      "rep_value"?: number
    }>
  },
  "expires_at_utc"?: string
}`;

		const sys = `You generate prediction market drafts as structured JSON only. No markdown, no commentary.`;
		const ctxCompany = companyName ? `The market is about the company "${companyName}".` : '';
		const user = `Task: Draft a ${market_type} market from the prompt below.
Today's date (UTC) is ${todayIso}.

Prompt:\n"""\n${prompt}\n"""

${ctxCompany}

Return a single JSON object exactly matching this shape:
${schemaDesc}

 Constraints:
  - "question" must be concise and objective and end with a '?'
  - "rules" must be 1–2 sentences, unambiguous.
  - Outcome names must be very short and compact, using symbols when helpful (e.g., <, >, ≤, ≥, $, K/M/B). Avoid filler words. Aim for ≤ 14 characters when possible.
  - "short_code" must be readable and clearly derived from the outcome name (not random), uppercase with underscores only, unique per outcome.
  - For categorical: 2–6 outcomes. Avoid duplicates.
  - For scalar buckets: 3–7 contiguous numeric ranges that fully cover plausible space, non-overlapping. Prefer compact labels like "$50k–$100k" or "10–20%".
  - Colors: Omit color_hex unless explicitly useful; never use default black/white. Prefer omitting it entirely.
  - Current date is ${todayIso} (UTC). Any expiry must be in the future relative to this date.
  - Expiry is optional. If the market does not have a valid or natural deadline (e.g., inherently comparative like "Will X happen before Y?"), omit both "expires_at_utc" and "expires_months" entirely.
  - Expiry: If the prompt implies a concrete deadline (e.g., "by end of 2026", "by Dec 2026", "by Q2 2025"), set "expires_at_utc" exactly:
     - End of year: YYYY-12-31T00:00:00Z
     - End of month: last_day_of_month at T00:00:00Z
     - Quarter ends: Q1: Mar31, Q2: Jun30, Q3: Sep30, Q4: Dec31 (T00:00:00Z)
     - Specific date: that date at T00:00:00Z
  If expiry is vague or relative but time-bounded, prefer "expires_months" as a small integer that results in a reasonable future date (typically 3–9 months). Otherwise, omit expiry.
  - Use ISO 8601 for "expires_at_utc" only. Do not add other fields.
  - Do not include any fields not present in the schema.
`;

		const raw = await llmGenerate(`${sys}\n\n${user}`);
		const content = typeof raw === 'string' ? raw : '';
		const obj = extractJson(content);

		// Helpers to ensure short_code readability and uniqueness
		const toShortCode = (name: string) => {
			const base = String(name || '')
				.replace(/\$/g, 'USD') // keep meaning
				.replace(/[^A-Za-z0-9]+/g, '_')
				.replace(/^_+|_+$/g, '')
				.replace(/_{2,}/g, '_')
				.toUpperCase();
			return base.slice(0, 24) || 'OPT';
		};
		const fixShortCodes = (arr: any[]) => {
			const seen = new Set<string>();
			return arr.map((o, idx) => {
				let sc = String(o?.short_code || '')
					.trim()
					.toUpperCase()
					.replace(/\s+/g, '_');
				if (!sc || sc.length < 2 || /^[A-Z]$/.test(sc) || sc === 'OPTION' || sc === 'OPT') {
					sc = toShortCode(o?.name);
				}
				// ensure unique
				let unique = sc;
				let k = 1;
				while (seen.has(unique)) {
					unique = `${sc}_${k++}`.slice(0, 28);
				}
				seen.add(unique);
				return { ...o, short_code: unique };
			});
		};
		const sanitizeColorHex = (hex: any): string | undefined => {
			if (typeof hex !== 'string') return undefined;
			let v = hex.trim();
			if (!v) return undefined;
			if (v[0] !== '#') v = `#${v}`;
			if (v.length === 4) {
				const r = v[1],
					g = v[2],
					b = v[3];
				v = `#${r}${r}${g}${g}${b}${b}`;
			}
			if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return undefined;
			const up = v.toUpperCase();
			if (up === '#000000' || up === '#FFFFFF') return undefined;
			return up;
		};

		// Support either a wrapped { template, expires_at_utc } or a bare template (back-compat)
		const rawTemplate = obj?.template ?? obj;
		const template: DefaultMarketTemplate = {
			question: String(rawTemplate?.question || '').trim(),
			market_type: (rawTemplate?.market_type as MarketType) || market_type,
			rules: typeof rawTemplate?.rules === 'string' ? rawTemplate.rules.trim() : undefined,
			expires_months: (() => {
				const n = Number(rawTemplate?.expires_months);
				return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
			})(),
			outcomes: Array.isArray(rawTemplate?.outcomes)
				? fixShortCodes(
						(rawTemplate.outcomes as any[])
							.map(
								(o): DefaultOutcomeTemplate => ({
									name: String(o?.name || '').trim(),
									short_code: String(o?.short_code || '')
										.trim()
										.toUpperCase()
										.replace(/\s+/g, '_'),
									color_hex: sanitizeColorHex(o?.color_hex),
									min_value: Number.isFinite(Number(o?.min_value))
										? Number(o?.min_value)
										: undefined,
									max_value: Number.isFinite(Number(o?.max_value))
										? Number(o?.max_value)
										: undefined,
									rep_value: Number.isFinite(Number(o?.rep_value))
										? Number(o?.rep_value)
										: undefined
								})
							)
							.filter((o) => o.name && o.short_code)
					)
				: undefined
		};

		if (!template.question) throw new Error('Generated question missing');

		// Date helpers for validating/adjusting explicit expiries
		function endOfNextQuarterUTC(base: Date): Date {
			const y = base.getUTCFullYear();
			const m = base.getUTCMonth(); // 0-11
			const qEndMonth = m <= 2 ? 2 : m <= 5 ? 5 : m <= 8 ? 8 : 11; // current quarter end
			const nextQEndMonth = qEndMonth === 11 ? 2 : qEndMonth + 3;
			const year = qEndMonth === 11 ? y + 1 : y;
			// Map quarter end month to last day
			const lastDay = nextQEndMonth === 2 ? 31 : nextQEndMonth === 5 ? 30 : nextQEndMonth === 8 ? 30 : 31;
			return new Date(Date.UTC(year, nextQEndMonth, lastDay, 0, 0, 0, 0));
		}

		let expires_at_utc: string | undefined;
		if (typeof obj?.expires_at_utc === 'string') {
			const d = new Date(obj.expires_at_utc);
			if (!Number.isNaN(d.getTime())) {
				// ensure future
				expires_at_utc = d.getTime() > today.getTime() ? d.toISOString() : endOfNextQuarterUTC(today).toISOString();
			}
		}
		// If explicit date missing, and months provided, leave date unset so UI can compute
		// If neither provided, leave expiry unset (optional)

		return json({ template, expires_at_utc });
	} catch (err: any) {
		console.error('generate-market failed', err);
		return json({ error: 'failed to generate market' }, { status: 500 });
	}
};
