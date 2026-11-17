<script lang="ts">
	import { type Snippet } from 'svelte';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';
	import Header from '$lib/ui/layout/Header.svelte';
	import { setBanner } from '$lib/stores/banner.svelte.ts';
	import { Toaster } from 'svelte-hot-french-toast';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	// Undo is provided via CommentAddedToast with showUndo
	import { setModal } from '$lib/stores/ui-modal.svelte.ts';
	import { getModal } from '$lib/stores/ui-modal.svelte.ts';
	import GlobalModalHost from '$lib/ui/GlobalModalHost.svelte';
	import LeftBar from '$lib/ui/layout/LeftBar.svelte';
	import { Progress } from '@friendofsvelte/progress';
	import { setDrawers } from '$lib/stores/ui-drawers.svelte.ts';
	import { setBreakpoint } from '$lib/stores/breakpoint.svelte.ts';

	// Post-auth intent handling
	import { consumePostAuthIntent } from '$lib/auth/client.ts';
	import { placeBet } from '$lib/trade';
	import { appToast } from '$lib/ui/toast.ts';


	let { data, children } = $props<{ data: LayoutData; children: Snippet }>();

	// Provide contexts during layout init so children can read immediately
	setBanner();
	setModal();
	const modal = getModal();
	const drawers = setDrawers();
	const bpStore = setBreakpoint();

	$effect(() => {
		if (!bpStore) return;
		if (!bpStore.isMobile) {
			drawers.closeLeft();
			drawers.closeRight();
		}
	});

	const siteName = 'termsheet.gg';

	// Simple default page titles by path; page-level titles override
	const defaultTitle = $derived.by(() => {
		const p = String(page.url.pathname);
		if (p === '/' || p === '') return `Home — ${siteName}`;
		if (p.startsWith('/about')) return `About — ${siteName}`;
		if (p === '/company' || p.startsWith('/company/')) return `Companies — ${siteName}`;
		if (p.startsWith('/wallet')) return `Wallet — ${siteName}`;
		if (p.startsWith('/login')) return `Login — ${siteName}`;
		if (p.startsWith('/admin')) return `Admin — ${siteName}`;
		if (p.startsWith('/comment')) return `Comment — ${siteName}`;
		if (/^\/[A-Za-z0-9_]+$/.test(p)) return `Profile — ${siteName}`; // /[username]
		return siteName;
	});

	// Listen for auth completion from new-tab flow and refresh session data
	$effect(() => {
		if (typeof window === 'undefined') return;
		let bc: BroadcastChannel | null = null;
		try {
			bc = new BroadcastChannel('auth');
			bc.onmessage = (ev: MessageEvent) => {
				if (ev?.data && ev.data.t === 'complete') {
					void invalidateAll();
				}
			};
		} catch {
		}
		return () => {
			try {
				bc?.close();
			} catch {
			}
		};
	});

	// After session becomes available, attempt to consume and execute any stored intent
	let handlingIntent = $state(false);

	async function handlePostAuthIntent() {
		if (handlingIntent) return;
		if (typeof window === 'undefined') return;
		const intent = consumePostAuthIntent();
		if (!intent || intent.t === 'none') return;
		handlingIntent = true;
		try {
			if (intent.t === 'bet') {
				const { market_id, outcome_id, amount_credits, comment } = intent;
				const res = await placeBet({ market_id, outcome_id, amount_credits, comment });
				const msg = `Bet placed for $${amount_credits.toFixed(2)}`;
				const txId = (res as any)?.transaction_id ?? null;
				if (txId && modal) {
					modal.show({ kind: 'addComment', marketId: market_id, transactionId: txId, message: msg });
				}
				// Defer success toast until user acts in modal
				if (!txId) appToast.success(msg);
			}
		} catch (e: any) {
			appToast.error(e?.message || 'Post-login action failed');
		} finally {
			handlingIntent = false;
		}
	}

	// Trigger when session available
	$effect(() => {
		if (page?.data?.session?.user) {
			void handlePostAuthIntent();
		}
	});

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{defaultTitle}</title>
	<!-- Tooltip CSS is bundled via app.css; JS imported in tooltip.ts -->
</svelte:head>

<!--outermost-->
<Progress size="sm" color="blue" />

<div class="flex h-screen w-full justify-center bg-[#fafaf9]">
	<LeftBar {data} />
	{@render children?.()}
</div>

<Toaster toastOptions={{ style: 'border-radius: 6px' }} />
<GlobalModalHost />
