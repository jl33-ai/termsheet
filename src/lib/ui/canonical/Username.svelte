<script lang="ts">
	import { tooltip, tooltipContent } from '$lib/ui/tooltip.ts';
    import type { UserLite } from '$lib/types';

	let {
		user,
		href = true,
		variant = 'default', // 'default' | 'accent' | 'white' | 'black'
		extraClass = 'text-sm',
		weight = 'medium'
	} = $props<{
		user: UserLite;
		href?: boolean;
		variant?: 'default' | 'accent' | 'white' | 'black';
		extraClass?: string;
		weight?: 'normal' | 'medium';
	}>();

	// Derive username and stats defensively from the user object
	const username = $derived((user?.username ?? user?.x_username ?? '').toString());
	const profileHref = $derived(`/${username}`);

	const correct = $derived(Number(user?.correct_bets_count ?? user?.correctBetsCount ?? 0));
	const pending = $derived(Number(user?.pending_bets_count ?? user?.pendingBetsCount ?? 0));
	const incorrect = $derived(Number(user?.incorrect_bets_count ?? user?.incorrectBetsCount ?? 0));
	const statsLine = $derived.by(() => `+${correct}	-${incorrect}	${pending}`);

	// X profile link (if available)
	const xUsername = $derived((user?.x_username ?? '').toString());
	const xHandle = $derived(xUsername.replace(/^@/, ''));
	const xUrl = $derived(xHandle ? `https://x.com/${encodeURIComponent(xHandle)}` : '');
	const actionHtml = $derived.by(() =>
		xUrl
			? `<a href=\"${xUrl}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"app-button x-connect\">View on X</a>`
			: ''
	);

	const tipContent = $derived.by(() => tooltipContent(`@${username}`, statsLine, actionHtml));
	const tip = $derived.by(() => ({ content: tipContent, placement: 'bottom' as const, interactive: true }));
	const colorClass = $derived(
		variant === 'black'
			? 'text-black'
			: variant === 'accent'
				? 'text-accent'
				: variant === 'white'
					? 'text-white'
					: 'text-black'
	);
</script>


{#snippet LinkOrSpan({ hrefEnabled }: { hrefEnabled: boolean })}
	{#if hrefEnabled}
		<a
			href={profileHref}
			class={`${extraClass} ${weight === 'medium' ? 'font-medium' : ''} ${colorClass} username`}
			use:tooltip={tip}
			onclick={(e) => {
				// Ensure parent click handlers (e.g., comment row) don't override
				e.stopPropagation();
			}}
			onkeydown={(e) => {
				// Prevent parent key handlers (Enter/Space) from hijacking navigation
				if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
			}}
		>@{username}</a>
	{:else}
		<span class={`${extraClass} ${weight === 'medium' ? 'font-medium' : ''} ${colorClass} username`} use:tooltip={tip}
		>@{username}</span>
	{/if}
{/snippet}

{@render LinkOrSpan({ hrefEnabled: href })}
