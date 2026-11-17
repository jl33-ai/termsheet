<script lang="ts">
	import { Chart, Svg, Group, Arc, Text } from 'layerchart';
	import { barFillForBinary } from '$lib/colors';

	let {
		value,
		width = 48,
		height = 48,
		outerRadius = 24,
		innerRadius = -4
	} = $props<{
		value: number; // 0..100
		width?: number;
		height?: number;
		outerRadius?: number;
		innerRadius?: number;
	}>();

	const fill = $derived(barFillForBinary(value >= 50 ? 'yes' : 'no', true));
</script>

<div class="rounded-sm" style={`height:${height}px; width:${width}px`}>
	<Chart radial padding={{ top: 6, right: 6, bottom: 6, left: 6 }}>
		<Svg>
			<Group center>
				<Arc
					{value}
					domain={[0, 100]}
					{outerRadius}
					{innerRadius}
					cornerRadius={10}
					padAngle={0.02}
					range={[-120, 120]}
					fill={fill}
					track={{ class: 'fill-gray-200/60' }}
				>
					{#snippet children(ctx)}
						<Text
							value={(Math.round(ctx.value) + '%')}
							textAnchor="middle"
							verticalAnchor="middle"
							class="text-sm font-bold text-title tabular-nums"
						/>
					{/snippet}
				</Arc>
			</Group>
		</Svg>
	</Chart>
</div>
