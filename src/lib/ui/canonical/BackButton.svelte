<script lang="ts">
	import Icon from '@iconify/svelte';

	let { class: className = '', href = null } = $props<{ class?: string; href?: string | null }>();

	const linkHref = $derived.by(() => href ?? '/');

	function onClick(e: MouseEvent) {
		// If an explicit href is provided, allow the anchor to handle SPA nav.
		if (href) return;

		// If the referrer is an external host (e.g., OAuth),
		// avoid going back into that flow. Fallback to '/'.
		let externalReferrer = false;
		try {
			const ref = document.referrer;
			if (ref) {
				const refHost = new URL(ref).host;
				externalReferrer = refHost !== window.location.host;
			}
		} catch {
			externalReferrer = true;
		}

		// If it's safe to go back, intercept and use history.back().
		if (!(externalReferrer && window.history.length <= 1)) {
			e.preventDefault();
			window.history.back();
		}
		// Otherwise, let the anchor navigate to '/'.
	}
</script>


<a
	href={linkHref}
	onclick={onClick}
	aria-label="Back"
	class="inline-flex items-center justify-center p-2 rounded-sm text-muted hover:bg-neutral-100 transition-colors {className}"
>
	<Icon icon="bx:arrow-back" class="text-lg" />
</a>
