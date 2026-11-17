<script lang="ts">
	import type { LayoutData } from '../../../../.svelte-kit/types/src/routes/$types';
	import { formatMoney } from '$lib/currency.ts';
	import { tooltip, tooltipContent } from '$lib/ui/tooltip.ts';
	import { page } from '$app/state';
	import { getModal } from '$lib/stores/ui-modal.svelte.ts';
	import Icon from '@iconify/svelte';
	import { APP_COPY, WALLET_COPY } from '$lib/constant.ts';

	let { data } = $props<{ data: LayoutData }>();

	const modal = getModal();

	// Shared nav item styling
	const navItem = 'flex items-center text-base text-lg gap-3 px-4 py-3 hover-highlight rounded-sm';

	// KD tooltip content (reuse pattern from Username.svelte)
	const username = $derived((data?.username ?? '').toString());
	const correct = $derived(Number(data?.correct_bets_count ?? 0));
	const pending = $derived(Number(data?.pending_bets_count ?? 0));
	const incorrect = $derived(Number(data?.incorrect_bets_count ?? 0));
	const statsLine = $derived.by(() => `+${correct}\t-${incorrect}\t${pending}`);
	const tipContent = $derived.by(() => tooltipContent(`@${username}`, statsLine));
	const tip = $derived.by(() => ({ content: tipContent, placement: 'bottom' as const }));

	type PageItem = {
		label: string;
		href: string;
		icon: string; // unselected
		iconSelected: string; // selected
	};

	const pages: PageItem[] = [
		{ label: 'Home', href: '/', icon: 'bx:home', iconSelected: 'bxs:home' }
	];

	// Home tooltip: text + inline tick at end
	const homeTipContent = $derived(
		`<div><div class=\"tooltip-body\"><span>${APP_COPY}<img src=\"/images/bluetick.webp\" alt=\"Blue tick\" class=\"inline h-4 w-4 align-middle ml-1\"/></span></div></div>`
	);
</script>

<a href="/" class="text-title text-lg font-medium py-4"></a>

<nav class="flex flex-col">
	{#each pages as p}
		<a
			href={p.href}
			aria-label={p.label}
			class={`${navItem} ${page.url.pathname === p.href ? 'font-medium' : ''}`}
			use:tooltip={p.label === 'Home' ? homeTipContent : ''}
		>
			<Icon icon={page.url.pathname === p.href ? p.iconSelected : p.icon} />
			{p.label}
		</a>
	{/each}
	{#if data.session?.user}
		{#if data.balance_credits != null}
			<a
				href="/wallet"
				aria-label="Wallet"
				class={`${navItem} ${page.url.pathname === '/wallet' ? 'font-medium' : ''}`}
				use:tooltip={tooltipContent('', WALLET_COPY)}
			>
				<Icon icon={page.url.pathname === '/wallet' ? 'bxs:wallet' : 'bx:wallet'} />
				{formatMoney(Number(data.balance_credits))}
			</a>
		{/if}
		{#if data.username}
			<a
				href={`/${data.username}`}
				aria-label="Profile"
				class={`${navItem} ${page.url.pathname === `/${data.username}` ? 'font-medium' : ''}`}
				use:tooltip={tip}
			>
				<Icon icon={page.url.pathname === `/${data.username}` ? 'bxs:user' : 'bx:user'} />
				Profile
			</a>

		{:else}
			<a
				href={`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`}
				target="_blank"
				rel="noopener"
				class={`${navItem}`}
				onclick={(e) => { e.preventDefault(); modal?.show({ kind: 'register' }); }}
			>Sign up</a>
		{/if}
	{:else}
		<a
			href={`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`}
			target="_blank"
			rel="noopener"
			class={`${navItem}`}
			onclick={(e) => { e.preventDefault(); modal?.show({ kind: 'register' }); }}
		>Login with X</a>
	{/if}
</nav>
