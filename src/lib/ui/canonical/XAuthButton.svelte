<script lang="ts">
	import { page } from '$app/state';
	import type { XAuthButtonProps } from '$lib/types';

	let { class: className = '', ...rest }: XAuthButtonProps = $props();

	const base = 'inline-flex items-center justify-center rounded-sm app-button x-connect';
	const cls = `${base} ${className}`.trim();

	// Prefer explicit next from current page query, else current relative URL
	const next = $derived.by(() => {
		const u = page.url;
		const fromQuery = u.searchParams.get('next');
		if (fromQuery && fromQuery.startsWith('/')) return fromQuery;
		return `${u.pathname}${u.search}${u.hash}`;
	});

	const href = $derived(`/auth/x/start?next=${encodeURIComponent(next)}`);
</script>

<a {href} target="_blank" rel="noopener" class={cls} {...rest}>Continue with X/Twitter</a>
