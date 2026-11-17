<script lang="ts">
	import type { LayoutData } from '../../../../.svelte-kit/types/src/routes/$types';
	import { formatMoney } from '$lib/currency.ts';
	import Username from '$lib/ui/canonical/Username.svelte';
	import { tooltip, tooltipContent } from '$lib/ui/tooltip.ts';
	import { page } from '$app/state';
	import { getModal } from '$lib/stores/ui-modal.svelte.ts';
	import { WALLET_COPY } from '$lib/constant.ts';

	let { data } = $props<{ data: LayoutData }>();

	const next = $derived(`${page.url.pathname}${page.url.search}${page.url.hash}`);
	const modal = getModal();
</script>

<header class="flex w-full flex-col bg-white">
	<div class="app-container flex py-4 w-full">
		<a href="/" class="font-mono text-xl text-title translate-y-[2px]">termsheet.gg</a>
	</div>

	<nav class="nav-lower text-white">
		<div class="app-container flex flex-wrap items-center justify-between gap-2 md:gap-4">
			<div class="flex items-center gap-1 text-sm">
				<a
					href="/"
					aria-label="Home"
					class="px-2 py-1 hover:underline md:px-3 {page.url.pathname === '/' ? 'bg-white/10' : ''}"
				>Home</a
				>
				<!--				<a href="/" aria-label="Home" class="">Trending</a>-->
				<!--				<a href="/" aria-label="Home" class="">Leaderboard</a>-->
				<a
					href="/about"
					aria-label="About"
					class="px-2 py-1 hover:underline md:px-3 {page.url.pathname === '/about'
						? 'bg-white/10'
						: ''}">About</a
				>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if data.session?.user}
					{#if data.balance_credits != null}
						<a
							href={"/wallet"}
							class="ml-1 text-sm hover:underline"
							use:tooltip={tooltipContent('', WALLET_COPY)}
						>
							{formatMoney(Number(data.balance_credits))}
						</a>
					{/if}
					{#if data.username}
						<Username
							user={{
								username: data.username,
								correct_bets_count: data.correct_bets_count,
								pending_bets_count: data.pending_bets_count,
								incorrect_bets_count: data.incorrect_bets_count
							}}
							variant="white"
							extraClass="inline-flex px-3 py-1 items-center text-sm font-medium username {page.url
							.pathname === `/${data.username}`
							? 'bg-white/10'
							: ''}"
						/>

					{:else}
						<a
							href={`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center rounded-sm text-sm hover:underline"
							onclick={(e) => { e.preventDefault(); modal?.show({ kind: 'register' }); }}
						>Sign up</a>
					{/if}
				{:else}
					<a href={`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`} target="_blank" rel="noopener"
						 class="text-sm hover:underline"
						 onclick={(e) => { e.preventDefault(); modal?.show({ kind: 'register' }); }}
					>Login with X</a>
				{/if}
			</div>
		</div>
	</nav>

</header>

<style>
    .nav-lower {
        position: relative;
        background: var(--c-title);
    }

    /*.nav-lower::before {*/
    /*    content: '';*/
    /*    position: absolute;*/
    /*    left: 0;*/
    /*    right: 0;*/
    /*    top: 0;*/
    /*    height: 60%;*/
    /*    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08));*/
    /*    pointer-events: none;*/
    /*    z-banner.svelte.ts: 0;*/
    /*}*/

    /*.nav-lower::after {*/
    /*    content: '';*/
    /*    position: absolute;*/
    /*    left: -10%;*/
    /*    right: -10%;*/
    /*    bottom: -30%;*/
    /*    height: 120%;*/
    /*    background: radial-gradient(*/
    /*            ellipse at center bottom,*/
    /*            rgba(0, 0, 0, 0.18) 0%,*/
    /*            rgba(0, 0, 0, 0) 60%*/
    /*    );*/
    /*    pointer-events: none;*/
    /*    z-banner.svelte.ts: 0;*/
    /*}*/

    /*.nav-lower > * {*/
    /*    position: relative;*/
    /*    z-banner.svelte.ts: 1;*/
    /*}*/
</style>
