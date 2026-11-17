<script lang="ts">
	import { barFillForBinary } from '$lib/colors.ts';
    import type { BinaryOptionProps } from '$lib/types';

	let {
		label,
		valueText,
		progress = 0,
		intent = 'neutral',
		selected = false,
		class: className = '',
		...rest
	}: BinaryOptionProps = $props();

	const base =
		'relative h-8 w-full cursor-pointer select-none rounded-sm text-left focus:outline-none';
	const cls = `${base} ${className}`.trim();

	function widthPct(p: number) {
		const v = Number.isFinite(p) ? p : 0;
		return `${Math.max(v * 100, 2).toFixed(1)}%`;
	}
</script>

<button class={cls} type="button" {...rest}>
	<div
		class="absolute top-0 left-0 h-full rounded-sm transition-all duration-[140ms] ease-out"
		style={`width: ${widthPct(progress)}; background-color: ${barFillForBinary(intent, selected)};`}
	></div>
	<div class="absolute inset-0 flex items-center justify-between px-2">
		<div class="truncate font-medium">{label}</div>
		<div class="text-sm font-medium tabular-nums">{valueText}</div>
	</div>
	<slot />
</button>
