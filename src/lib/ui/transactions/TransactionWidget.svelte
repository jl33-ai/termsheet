<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { getCurrencySymbol } from '$lib/currency.ts';
	import { redirectToLogin, redirectToRegister } from '$lib/auth/client.ts';
	import { appToast } from '$lib/ui/toast.ts';

	let {
		market,
		outcomes,
		pool_balances,
		positions,
		user,
		commentOptimistic,
		commentOptimisticRemove
	} = $props<{
		market: any;
		outcomes: any[];
		pool_balances: { outcome_id: string; balance: number | string }[];
		positions: { outcome_id: string; shares: number | string }[];
		user: any;
		commentOptimistic?: (payload: any) => void;
		commentOptimisticRemove?: (payload: { id: string }) => void;
	}>();

	// Bindable selection so radio UI updates immediately; parent can bind or pass value.

	const currency = getCurrencySymbol();
	import { DEFAULT_TRADE_AMOUNT } from '$lib/trade/constants.ts';

	// Selection derived from URL only
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { withQuery } from '$lib/url';

	const selectedOutcomeId = $derived.by(() => {
		const v = page.url.searchParams.get('outcome');
		if (!v) return null;
		return (outcomes || []).some((o: any) => o.id === v) ? v : null;
	});

	// Update URL on choose
	async function chooseOutcome(id: string) {
		const valid = (outcomes || []).some((o: any) => o.id === id) ? id : null;
		const href = withQuery(page.url, { outcome: valid });
		await goto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const totalPoolBalance = $derived(
		(pool_balances || []).reduce((acc: number, b: any) => acc + Number(b.balance), 0)
	);

	function getOutcomeBalance(outcomeId: string) {
		const b = (pool_balances || []).find((x: any) => x.outcome_id === outcomeId);
		return b ? Number(b.balance) : 0;
	}

	function getOutcomePrice(outcomeId: string) {
		if (!outcomeId) return 0;
		if (totalPoolBalance === 0) return 1 / Math.max(1, outcomes?.length || 1);
		return getOutcomeBalance(outcomeId) / totalPoolBalance;
	}

	function getUserShares(outcomeId: string) {
		const p = (positions || []).find((x: any) => x.outcome_id === outcomeId);
		return p ? Number(p.shares) : 0;
	}

	function formatPct(prob: number) {
		return `${(prob * 100).toFixed(1)}%`;
	}

	// Default trade amount; draft restore can override
	let tradeAmount = $state<number | null>(DEFAULT_TRADE_AMOUNT);
	let loading = $state<{ [k: string]: boolean }>({});
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let claimLoading = $state(false);
	let claimMsg = $state('');
	let claimedInfo = $state<{ hadShares: number; claimed: number } | null>(null);

	// Share link state
	let lastTransactionId = $state<string | null>(null);
	let linkCopied = $state(false);
	const shareUrl = $derived.by(() =>
		lastTransactionId
			? `${typeof window !== 'undefined' ? window.location.origin : ''}/transaction/${lastTransactionId}`
			: ''
	);

	// Comment is required for any bet
	let commentText = $state('');
	const commentTrimmed = $derived.by(() => commentText.trim());
	const commentValid = $derived(commentTrimmed.length > 0);

	// Restore any draft trade for this market (run once on mount)
	import { onMount } from 'svelte';

	onMount(() => {
		const id = market?.id as string | undefined;
		if (!id) return;
		try {
			const raw = sessionStorage.getItem(`draft:trade:${id}`);
			if (!raw) return;
			const d = JSON.parse(raw);
			if (d && typeof d === 'object') {
				if (d.amount != null && d.amount !== '') {
					const n = Number(d.amount);
					if (Number.isFinite(n) && n >= 0) tradeAmount = n;
				}
			}
		} catch {
		}
	});

	// No upward event; selection is URL-driven.

	// Persist draft while typing/selecting
	$effect(() => {
		const id = market?.id as string | undefined;
		if (!id) return;
		try {
			const payload = {
				outcomeId: selectedOutcomeId,
				amount: tradeAmount
			};
			sessionStorage.setItem(`draft:trade:${id}`, JSON.stringify(payload));
		} catch {
		}
	});

	const selectedIdStr = $derived(selectedOutcomeId != null ? String(selectedOutcomeId) : null);

	const selectedPrice = $derived(selectedIdStr ? getOutcomePrice(selectedIdStr) : 0);
	const estShares = $derived(
		tradeAmount != null && Number(tradeAmount) > 0 && selectedPrice > 0
			? Number(tradeAmount) / selectedPrice
			: 0
	);

	// Improved estimate: assume current price approximates average for existing buyers.
	// Then:
	// - estimated pot after your buy = totalPoolBalance + A
	// - estimated total winning shares after your buy ≈ totalPoolBalance + A/p
	// - per‑share redeem ≈ (pot_after) / (winning_shares_after)
	// - payout ≈ estShares * per_share_redeem
	const estPerShareRedeem = $derived(
		tradeAmount != null && Number(tradeAmount) > 0 && selectedPrice > 0
			? (totalPoolBalance + Number(tradeAmount)) /
			(totalPoolBalance + Number(tradeAmount) / selectedPrice)
			: 0
	);
	const estPayout = $derived(estShares > 0 ? estShares * estPerShareRedeem : 0);

	function handleAmountInput(e: Event) {
		const t = e.target as HTMLInputElement;
		let raw = t.value || '';
		// keep only digits and a single dot
		raw = raw.replace(/[^\d.]/g, '');
		const parts = raw.split('.');
		if (parts.length > 2) {
			raw = parts.shift() + '.' + parts.join('');
		}
		if (raw !== t.value) t.value = raw;
		if (raw === '') {
			tradeAmount = null;
			return;
		}
		const n = Number(raw);
		tradeAmount = Number.isFinite(n) ? n : null;
	}

	function preventInvalidKeys(e: KeyboardEvent) {
		if (['e', 'E', '+', '-'].includes(e.key)) {
			e.preventDefault();
		}
	}

	const isClosed = $derived(
		Boolean(market?.closed_at) ||
		Boolean(market?.resolution_outcome_id) ||
		(Boolean(market?.expires_at) && new Date(market.expires_at).getTime() <= Date.now())
	);

	import { placeBet as placeBetApi } from '$lib/trade.ts';
	import Icon from '@iconify/svelte';
	import RadioOption from '$lib/ui/canonical/RadioOption.svelte';

	import FirstBetWarning from '$lib/ui/canonical/FirstBetWarning.svelte';

	const LS_ACK_KEY = 'bet:first-ack:v1';

	function hasAcknowledgedFirstBet() {
		if (typeof window === 'undefined') return true;
		try {
			return window.localStorage.getItem(LS_ACK_KEY) === '1';
		} catch {
			return true;
		}
	}

	function setAcknowledged() {
		try {
			if (typeof window !== 'undefined') window.localStorage.setItem(LS_ACK_KEY, '1');
		} catch {
		}
	}

	let firstBetOpen = $state(false);

	async function placeBet() {
		if (!selectedOutcomeId) {
			appToast.info('Pick an option');
			return;
		}
		if (isClosed) {
			appToast.warning('Market is closed for trading.');
			return;
		}
		const amount = tradeAmount != null ? tradeAmount : 0;
		if (!amount || amount < DEFAULT_TRADE_AMOUNT) {
			appToast.warning(`Minimum trade amount is ${currency}${DEFAULT_TRADE_AMOUNT}.`);
			return;
		}

		// Require comment before proceeding
		if (!commentValid) {
			appToast.info('Please add a comment to submit.');
			return;
		}

		// First-bet confirmation
		if (!hasAcknowledgedFirstBet()) {
			firstBetOpen = true;
			return;
		}
		loading[selectedOutcomeId] = true;
		error = null;
		success = null;
		const comment = commentTrimmed;
		let loadingId: any;
		try {
			// Show loading while placing the bet
			loadingId = appToast.loading('Placing bet…');
			const result: any = await placeBetApi({
				market_id: market.id,
				outcome_id: selectedOutcomeId,
				amount_credits: amount,
				comment: comment
			});
			// Success: replace success toast with a plain toast and 💸 icon
			{
				const outcome = (outcomes || []).find((x: any) => x.id === selectedOutcomeId);
				const label = outcome?.name ?? outcome?.short_code ?? 'Outcome';
				success = `${label} for ${currency}${Number(amount).toFixed(2)}`;
				appToast.dismiss(loadingId);
				// Show undo action toast
				try {
					const txIdLocal = (result as any)?.transaction_id ?? null;
					if (txIdLocal) {
						const { default: CommentAddedToast } = await import('$lib/ui/comments/CommentAddedToast.svelte');
						const commentIdLocal = (result as any)?.comment_id ?? null;
						appToast.success(CommentAddedToast as any, { props: { transactionId: txIdLocal, commentId: commentIdLocal, message: success, showUndo: true }, duration: 8000 });
					} else {
						appToast(success, { icon: '💸' });
					}
				} catch {
					appToast(success, { icon: '💸' });
				}
			}
			lastTransactionId = result?.transaction_id || null;
			linkCopied = false;
			invalidateAll();
			// Reset to default amount after trade
			tradeAmount = DEFAULT_TRADE_AMOUNT;
			try {
				sessionStorage.removeItem(`draft:trade:${market.id}`);
			} catch {
			}
			// Clear comment text after successful bet
			if (comment) {
				commentText = '';
			}
		} catch (e: any) {
			error = e.message || String(e);
			if (loadingId) appToast.dismiss(loadingId);
			appToast.error(error);
		} finally {
			if (selectedOutcomeId) loading[selectedOutcomeId] = false;
		}
	}

	async function placeBetCoreAfterAck() {
		// Only run if inputs still valid
		if (!selectedOutcomeId) return;
		const amount = tradeAmount != null ? tradeAmount : 0;
		if (!amount || amount < DEFAULT_TRADE_AMOUNT) return;
		setAcknowledged();
		await placeBet();
	}

	async function claimWinnings() {
		if (!user) {
			redirectToLogin();
			return;
		}
		claimLoading = true;
		claimMsg = '';
		// capture user's winning shares before claiming so we can show a helpful message afterward
		const hadShares = market?.resolution_outcome_id
			? getUserShares(market.resolution_outcome_id)
			: 0;
		try {
			const res = await fetch('/api/claims', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id: market.id })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Claim failed');
			}
			const data = await res.json();
			const claimed = Number(data?.claimed ?? 0);
			if (claimed > 0) {
				claimedInfo = { hadShares: Number(hadShares) || 0, claimed };
				claimMsg = `Claimed ${claimed} credits.`;
				appToast(claimMsg, { icon: '💸' });
			} else {
				claimedInfo = null;
				claimMsg = 'Nothing to claim.';
				appToast.info(claimMsg);
			}
			invalidateAll();
		} catch (e: any) {
			claimMsg = e.message || 'Claim failed';
			appToast.error(claimMsg);
		} finally {
			claimLoading = false;
		}
	}

	function copyShareLink() {
		if (!lastTransactionId) return;
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const url = `${origin}/transaction/${lastTransactionId}`;
		navigator?.clipboard?.writeText(url)
			.then(() => {
				linkCopied = true;
			})
			.catch(() => {
				try {
					window?.prompt?.('Copy link', url);
					linkCopied = true;
				} catch {
				}
			});
	}
</script>

<div class="border-b-[0.5px] border-border pb-8">
	<h3>Place a bet</h3>
	{#if isClosed}
		<p class="text-sm font-medium text-muted">Market closed</p>
		{#if market.resolution_outcome_id && user}
			{@const winningShares = market.resolution_outcome_id
				? getUserShares(market.resolution_outcome_id)
				: 0}
			{#if winningShares > 0}
				<div class="text-sm text-base">You hold {Number(winningShares).toFixed(2)} winning shares.</div>
				<button
					class="mt-2 rounded-sm bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
					type="button"
					disabled={claimLoading}
					onclick={claimWinnings}>{claimLoading ? 'Claiming…' : 'Claim winnings'}</button
				>
				{#if claimMsg}
					<p class="mt-2 text-sm text-muted">{claimMsg}</p>
				{/if}
			{:else}
				{#if claimedInfo}
					<p class="mt-2 text-sm text-muted">You had {Number(claimedInfo.hadShares).toFixed(2)} winning shares. You
						claimed {Number(claimedInfo.claimed).toFixed(2)} credits.</p>
				{:else}
					<p class="mt-2 text-sm text-muted">No winnings to claim.</p>
				{/if}
			{/if}
		{/if}
	{:else}
		{@const rankedOutcomes = (outcomes || [])
			.map((o: any) => ({ o, p: getOutcomePrice(o.id) }))
			.sort((a: any, b: any) => b.p - a.p)}

		<fieldset class="mb-1 grid gap-1" role="radiogroup" aria-label="Choose outcome">
			<legend class="sr-only">Choose outcome</legend>
			{#each rankedOutcomes as r (r.o.id)}
				{@const o = r.o}
				{@const pOpt = r.p}
				{@const isSelected = selectedIdStr === String(o.id)}
				<RadioOption
					label={o.name}
					description={`${currency}${pOpt.toFixed(2)} each`}
					checked={isSelected}
					onSelect={() => chooseOutcome(String(o.id))}
				>
					{#snippet right()}
						<span class="text-sm font-medium tabular-nums">{Math.round(pOpt * 100)}%</span>
					{/snippet}
				</RadioOption>
			{/each}
		</fieldset>

		{#if user && selectedOutcomeId}
			{@const owned = getUserShares(selectedOutcomeId)}
			{#if owned > 0}
				<div class="mb-1 text-xs text-faint">You already own {owned} shares</div>
			{/if}
		{/if}
		<div class="flex items-center gap-2">
			<input
				class="w-full"
				type="number"
				placeholder={`Amount (${currency})`}
				value={tradeAmount ?? ''}
				oninput={handleAmountInput}
				onkeydown={preventInvalidKeys}
				inputmode="decimal"
				min={DEFAULT_TRADE_AMOUNT}
				step="0.01"
			/>
			<button
				class="app-button primary flex-nowrap"
				type="button"
				disabled={user ? (!selectedOutcomeId || !!loading[selectedOutcomeId] || !commentValid) : false}
				onclick={() => (user ? placeBet() : redirectToRegister())}
			>{user ? 'Buy' : 'Sign up to bet'}</button
			>
		</div>

		<div class="mt-2">
			<textarea
				class="min-h-16 w-full"
				bind:value={commentText}
				placeholder="Add a comment (required)"
			></textarea>
			<!-- <div class="mt-1 text-xs text-faint">{commentText.length} characters</div> -->
		</div>

		{#if tradeAmount && Number(tradeAmount) > 0 && selectedOutcomeId}
			<div class="mt-2 text-sm text-base">
				<!--				<div class="mt-1 flex items-center justify-between">-->
				<!--					<span class="text-muted">Odds</span>-->
				<!--					<span class="font-medium tabular-nums">{formatPct(selectedPrice)}</span>-->
				<!--				</div>-->
				<div class="mt-1 flex items-center justify-between">
					<span class="text-muted">Est. payout if win</span>
					<span class="font-medium tabular-nums"
					>{currency}{estPayout > 0 ? estPayout.toFixed(2) : '-'}</span
					>
				</div>
			</div>
		{/if}
	{/if}

	{#if lastTransactionId}
		<div class="mt-3 flex items-center gap-2">
			<input
				class="w-full rounded-sm border border-border px-2 py-2 text-sm text-base"
				readonly
				value={shareUrl}
			/>
			<button
				class="app-button h-10 w-10 flex items-center justify-center"
				title="Copy link"
				onclick={(e) => { e.preventDefault(); copyShareLink(); }}
			>
				<Icon icon={linkCopied ? 'bx:check' : 'bx:link'} />
			</button>
		</div>
	{/if}

	<!-- First-bet modal -->
	<FirstBetWarning
		open={firstBetOpen}
		onContinue={() => placeBetCoreAfterAck()}
		onCancel={() => { /* noop */ }}
	/>

</div>
