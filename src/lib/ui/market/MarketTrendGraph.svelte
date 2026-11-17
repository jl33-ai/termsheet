<script lang="ts">
	import { outcomeColorHex, binaryIntentBaseColorHex } from '$lib/colors.ts';
	import type { MarketPricePoint, OutcomeRow } from '$lib/types';
	import { LineChart, Tooltip } from 'layerchart';
	import Loading from '$lib/ui/canonical/Loading.svelte';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';

	// TODO make this look like linear

	let {
		outcomes,
		price_history,
		height = 200
	}: {
		outcomes: OutcomeRow[];
		price_history: MarketPricePoint[];
		height?: number;
	} = $props();

	const colorMap = $derived.by<Record<string, string>>(() => {
		const m: Record<string, string> = {};
		for (const o of outcomes || []) {
			m[o.id] =
				outcomeColorHex({
					explicitHex: (o as any)?.color_hex ?? (o as any)?.colorHex ?? null,
					indexId: (o as any)?.index_id ?? (o as any)?.indexId ?? null,
					id: o.id,
					name: o.name,
					shortCode: (o as any)?.short_code ?? (o as any)?.shortCode ?? null
				}) || binaryIntentBaseColorHex('neutral');
		}
		return m;
	});

	// Helper: representative value for scalar buckets
	function repValue(o: OutcomeRow): number | null {
		if (o.rep_value != null) return Number(o.rep_value);
		const minv = o.min_value != null ? Number(o.min_value) : NaN;
		const maxv = o.max_value != null ? Number(o.max_value) : NaN;
		if (!Number.isNaN(minv) && !Number.isNaN(maxv)) return (minv + maxv) / 2;
		if (!Number.isNaN(minv) && Number.isNaN(maxv)) return minv;
		if (Number.isNaN(minv) && !Number.isNaN(maxv)) return maxv;
		return null;
	}

	// Infer scalar-bucket markets from outcome metadata
	const isScalarBucket = $derived.by<boolean>(() =>
		(outcomes || []).some((o: OutcomeRow) => o.rep_value != null || o.min_value != null || o.max_value != null)
	);

	type Flat = { date: Date; value: number; outcome_id: string };

	const flatData = $derived.by<Flat[]>(() =>
		(price_history || []).map((r: MarketPricePoint) => ({
			date: new Date(r.created_at),
			// Keep 0..1 for percent axis
			value: Number(r.price),
			outcome_id: r.outcome_id
		}))
	);

	const dataByOutcome = $derived.by<[string, Flat[]][]>(() => {
		const m = new Map<string, Flat[]>();
		for (const d of flatData) {
			const arr = m.get(d.outcome_id) || [];
			arr.push(d);
			m.set(d.outcome_id, arr);
		}
		for (const arr of m.values()) arr.sort((a, b) => a.date.getTime() - b.date.getTime());
		return Array.from(m.entries());
	});

	const isLoading = $derived.by<boolean>(() => (outcomes == null || price_history == null));
	const hasPoints = $derived.by<boolean>(() => flatData.length > 0);

	const labelFor = (id: string) => {
		const o = (outcomes || []).find((x: OutcomeRow) => x.id === id);
		return o?.short_code || o?.name || id;
	};

	type SeriesItem = {
		key: string;
		label: string;
		value: 'value';
		color: string;
		data: { date: Date; value: number }[];
	};

	// When scalar bucket: collapse to a single implied-value line (native units)
	const series = $derived.by<SeriesItem[]>(() => {
		if (!isScalarBucket) {
			return dataByOutcome.map(([outcomeId, data]) => ({
				key: outcomeId,
				label: labelFor(outcomeId),
				value: 'value',
				color: colorMap[outcomeId],
				data: data.map((d: { date: Date; value: number }) => ({ date: d.date, value: d.value }))
			}));
		}

		// Compute representative values and range
		const reps = (outcomes || [])
			.map((o: OutcomeRow) => ({ id: o.id, rep: repValue(o) }))
			.filter((r: { id: string; rep: number | null }): r is { id: string; rep: number } => r.rep != null);
		if (reps.length === 0) return [];
		const repById = new Map<string, number>(reps.map((r) => [r.id, r.rep] as const));
		const repVals = reps.map((r) => r.rep);
		const minRep = Math.min(...repVals);
		const maxRep = Math.max(...repVals);
		const span = maxRep - minRep || 1; // avoid divide-by-zero

		// Group price points by timestamp
		const groups = new Map<number, { date: Date; rows: Flat[] }>();
		for (const d of flatData) {
			const t = d.date.getTime();
			const g = groups.get(t) || { date: d.date, rows: [] };
			g.rows.push(d);
			groups.set(t, g);
		}
		const times = Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

		const implied = times.map(({ date, rows }) => {
			let sum = 0;
			let probSum = 0;
			for (const r of rows) {
				const rep = repById.get(r.outcome_id);
				if (rep == null) continue;
				sum += rep * r.value;
				probSum += r.value;
			}
			// Expected value in native units (no normalization)
			const ev = probSum > 0 ? sum / probSum : null;
			return { date, value: ev ?? 0 };
		});

		return [
			{
				key: 'implied',
				label: 'Implied',
				value: 'value',
				color: binaryIntentBaseColorHex('neutral'),
				data: implied
			}
		];
	});

	const xAxisFormat = (d: any) =>
		new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);

	// Axis + domain handling
	const numberCompact = (n: number) =>
		new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

	const yAxisFormat = $derived.by<any>(() => (isScalarBucket ? (v: number) => numberCompact(v) : 'percentRound'));

	const yDomain = $derived.by<[number, number]>(() => {
		const s = series;
		const vals = s.flatMap((si) => si.data.map((d) => d.value)).filter((v) => Number.isFinite(v));
		if (vals.length === 0) return [0, 1];

		let min = Math.min(...vals);
		let max = Math.max(...vals);

		if (min === max) {
			const pad = min === 0 ? (isScalarBucket ? 1 : 0.05) : Math.abs(min) * 0.1;
			min -= pad;
			max += pad;
		} else {
			const span = max - min;
			const pad = span * 0.1; // 10% padding for readability
			min -= pad;
			max += pad;
		}

		if (!isScalarBucket) {
			// Clamp percent domain and enforce a minimum span for visibility
			min = Math.max(0, min);
			max = Math.min(1, max);
			const span = max - min;
			if (span < 0.1) {
				const mid = (min + max) / 2;
				min = Math.max(0, mid - 0.05);
				max = Math.min(1, mid + 0.05);
			}
		}

		return [min, max];
	});
</script>

{#if isLoading}
	<div class="w-full flex items-center justify-center py-6">
		<Loading />
	</div>
{:else if !hasPoints}
	<IconAndText icon="ph:chart-line-up-light" text="No data yet" />
{:else}
	<div class="w-full p-4 border rounded-sm border-border" style={`height:${height}px`}>
		<LineChart
			data={[]}
			x="date"
			y="value"
			series={series}
			rule={false}
			yDomain={yDomain}
			yNice
			props={{
      // Slightly thicker line and dotted gridlines
      spline: { strokeWidth: 1.25 },
      grid: {
        classes: { line: '[stroke-dasharray:2_2]' }
      },
      xAxis: {
        format: xAxisFormat,
        rule: false,
        classes: { tickLabel: 'text-muted font-medium' },
      },
      yAxis: {
			format: yAxisFormat,
        rule: false,
        classes: { tickLabel: 'text-muted font-medium' },
      },
    }}
		>
			{#snippet tooltip({ context })}
				<Tooltip.Root {context}
											class="text-xs font-medium mt-0.5 px-1 py-0.5 border border-border rounded-sm whitespace-nowrap"

				>
					{#snippet children({ payload })}
						<Tooltip.List>
							{#each payload as p, i (p.key ?? i)}
								{#if isScalarBucket}
									<Tooltip.Item
										label={p.name}
										value={p.value}
										color={p.color}
										valueAlign="right"
									/>
								{:else}
									<Tooltip.Item
										label={p.name}
										value={p.value}
										color={p.color}
										format="percentRound"
										valueAlign="right"
									/>
								{/if}
							{/each}
						</Tooltip.List>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</LineChart>
	</div>
{/if}
