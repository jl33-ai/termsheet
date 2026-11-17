<script lang="ts">
	// Simple, circular avatar with optional full-image tooltip
	let {
		src = null,
		alt = 'avatar',
		size = 40,
		tooltip = true,
		placement = 'bottom',
		previewSize = 160,
		...rest
	} = $props<{
		src?: string | null;
		alt?: string;
		size?: number;
		tooltip?: boolean;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		previewSize?: number;
	}>();

	import { tooltip as useTooltip } from '$lib/ui/tooltip.ts';

	const placeholder = '/images/placeholder/avatar.png';
	let displaySrc = $derived.by(() => src || placeholder);

	let tooltipHtml = $derived.by(
		() => `<img src="${displaySrc}" alt="${alt ?? ''}" style="width:${previewSize}px;height:${previewSize}px" class="object-cover rounded-sm" />`
	);

	function handleError() {
		displaySrc = placeholder;
	}
</script>

<img
	class="rounded-full object-cover"
	style={`width:${size}px;height:${size}px`}
	src={displaySrc}
	{alt}
	onerror={handleError}
	{...rest}
	use:useTooltip={tooltip ? { content: tooltipHtml, placement } : ''}
/>
