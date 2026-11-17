<script lang="ts">
	import type { OutcomeListItem } from '$lib/types';
	import {
		barFillForBinary,
		binaryIntentFromName,
		binaryIntentBaseColorHex,
		rgbaFromHex,
		barColor
	} from '$lib/colors.ts';

	let {
		items = [],
		selectedId = null,
		fillColor = (o: any, s: boolean) => null,
		onChoose,
		heightDefaultClass = 'h-6',
		heightSelectedClass = 'h-8'
	} = $props<{
		items: OutcomeListItem[];
		selectedId: string | null;
		fillColor: (outcome: OutcomeListItem, selected: boolean) => string | null;
		onChoose?: (payload: { id: string }) => void;
		heightDefaultClass?: string;
		heightSelectedClass?: string;
	}>();

	// Hard-coded UI; only height classes are customizable via props
	const UI = {
		listGapClass: 'gap-1',
		rowRadiusClass: 'rounded-sm',
		rowHoverBg: '#F2F2F2',
		label: {
			widthClass: 'w-16',
			textSizeClass: 'text-sm',
			textColorClass: 'text-title',
			alignRight: true
		},
		bar: {
			radiusClass: 'rounded-sm',
			percentTextSizeClass: 'text-sm',
			percentWeightSelected: 'font-bold',
			percentWeightDefault: 'font-medium',
			minWidthPct: 2,
			opacityClass: 'opacity-100'
		}
	} as const;

	// Dynamically compute label width class based on item text
	const WIDTH_CLASSES = [
		{ cls: 'w-12', px: 48 },
		{ cls: 'w-14', px: 56 },
		{ cls: 'w-16', px: 64 },
		{ cls: 'w-20', px: 80 },
		{ cls: 'w-24', px: 96 },
		{ cls: 'w-28', px: 112 },
		{ cls: 'w-32', px: 128 },
		{ cls: 'w-36', px: 144 },
		{ cls: 'w-40', px: 160 } // cap
	] as const;

	let labelWidthClass = $state<string>(UI.label.widthClass);

	function measureMaxTextWidthPx(texts: string[]): number {
		if (typeof window === 'undefined') return WIDTH_CLASSES[2].px; // SSR fallback ~ w-16
		const span = document.createElement('span');
		span.className = UI.label.textSizeClass;
		span.style.position = 'absolute';
		span.style.visibility = 'hidden';
		span.style.whiteSpace = 'nowrap';
		span.style.left = '-9999px';
		document.body.appendChild(span);
		let max = 0;
		for (const t of texts) {
			span.textContent = t ?? '';
			const w = Math.ceil(span.scrollWidth);
			if (w > max) max = w;
		}
		document.body.removeChild(span);
		// small breathing room
		return max + 6;
	}

	function widthClassForPx(px: number): string {
		for (const w of WIDTH_CLASSES) {
			if (px <= w.px) return w.cls;
		}
		return WIDTH_CLASSES[WIDTH_CLASSES.length - 1].cls;
	}

	$effect(() => {
		// Recompute when items change
		const names = (items ?? []).map((i) => i.name ?? '');
		const maxPx = measureMaxTextWidthPx(names);
		labelWidthClass = widthClassForPx(maxPx);
	});

	function widthPct(p: number) {
		const v = Number.isFinite(p) ? p : 0;
		return `${Math.max(v * 100, UI.bar.minWidthPct).toFixed(1)}%`;
	}

	function defaultFill(it: OutcomeListItem, isSel: boolean): string | null {
		const intent = binaryIntentFromName(it.short_code ?? it.name);
		if (intent !== 'neutral') return barFillForBinary(intent, isSel);
		return null;
	}

	function solidize(c?: string | null): string | null {
		if (!c) return null;
		const s = String(c).trim();
		if (s.startsWith('rgba(')) {
			// convert rgba(r,g,b,a) -> rgba(r,g,b,1)
			const parts = s.slice(5, -1).split(',').map((p) => p.trim());
			if (parts.length === 4) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 1)`;
		}
		return s;
	}

	function choose(id: string) {
		onChoose?.({ id });
	}
</script>

<div class={`flex flex-col ${UI.listGapClass}`}>
	{#each items as it}
		{@const isSel = selectedId === it.id}
		{@const intent = binaryIntentFromName(it.short_code ?? it.name)}
		{@const baseBg = (fillColor(it, isSel) || defaultFill(it, isSel) || '')}
		{@const hoverBg = (solidize(baseBg) || rgbaFromHex(binaryIntentBaseColorHex(intent), barColor.hoverAlpha))}

		<div
			class={`flex items-center gap-2 select-none ${UI.rowRadiusClass} transition-colors duration-[140ms] ease-out hover:bg-[var(--row-hover)]`}
			style={`--row-hover: ${UI.rowHoverBg};`}>
			<!-- Label: moved left, right-aligned -->
			<div
				class={`${labelWidthClass} shrink-0 ${UI.label.textColorClass} ${UI.label.textSizeClass} ${UI.label.alignRight ? 'text-right' : ''} truncate`}>{it.name}</div>

			<!-- Bar + percentage (only this is clickable) -->
			<div
				class={`group relative flex-1 ${isSel ? UI.bar.percentWeightSelected : UI.bar.percentWeightDefault} ${UI.bar.radiusClass} transition-[height] duration-[140ms] ease-out cursor-pointer ${isSel ? heightSelectedClass : heightDefaultClass}`}
				role="button"
				tabindex="0"
				aria-pressed={isSel}
				onclick={() => choose(it.id)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(it.id))}
			>
				<div
					class={`pointer-events-none absolute top-0 left-0 h-full ${UI.bar.radiusClass} transition-all duration-[140ms] ease-out bg-[var(--bg)] ${UI.bar.opacityClass} group-hover:opacity-100 group-hover:bg-[var(--bg-hover)]`}
					style={`width: ${widthPct(it.price)}; --bg: ${baseBg}; --bg-hover: ${hoverBg};`}
				></div>
				<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-end px-2">
					<div
						class={`${UI.bar.percentTextSizeClass} ${isSel ? UI.bar.percentWeightSelected : UI.bar.percentWeightDefault} text-base tabular-nums`}>
						{(it.price * 100).toFixed(1)}%
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
    /* minimal, layout handled via tailwind classes */
</style>
