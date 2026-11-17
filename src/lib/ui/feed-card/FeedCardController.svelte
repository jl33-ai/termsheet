<script lang="ts">
	import type { FeedItem, OutcomeRow } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getCurrencySymbol } from '$lib/currency';
	import { placeBet } from '$lib/trade';
	import { DEFAULT_TRADE_AMOUNT } from '$lib/trade/constants';
	import { appToast } from '$lib/ui/toast.ts';
	import { getModal } from '$lib/stores/ui-modal.svelte.ts';
	import FirstBetWarning from '$lib/ui/canonical/FirstBetWarning.svelte';

	const modal = getModal();

	let { item } = $props<{ item: FeedItem }>();

	const marketUrl = $derived(`/market/${item.market.id}`);
	const commentsUrl = $derived(`${marketUrl}#comments`);
	const PLACEHOLDER_IMG = '/images/placeholder/landscape.svg';
	const thumbnailUrl = $derived(
		item.market.thumbnail_url && item.market.thumbnail_url.length > 0
			? item.market.thumbnail_url
			: PLACEHOLDER_IMG
	);

	const isResolved = $derived(Boolean(item.market.resolution_outcome_id));
	const isClosedTrading = $derived(Boolean(item.market.closed_at) && !isResolved);
	const statusLabel = $derived(isResolved ? 'Resolved' : (isClosedTrading ? 'Closed' : null));

	// Local state shared by consumers
	let loadingIntent = $state<null | 'yes' | 'no'>(null);
	let loadingOutcomeId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let didExecute = $state(false);
	let pickedBinaryIntent = $state<null | 'yes' | 'no'>(null);
	let pickedOutcomeId = $state<string | null>(null);
	let betCount = $state(0);
	const currency = getCurrencySymbol();

	// First bet modal (local, simple)
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
	let resumeAction: (() => void) | null = null;

	// Use layout balance to gate quick-buys (null when logged out)
	const balanceCredits = $derived(page.data.balance_credits);
	const hasFunds = $derived(balanceCredits == null ? true : Number(balanceCredits) >= 1);
	const actionsDisabled = $derived(Boolean(isResolved || isClosedTrading || didExecute || !hasFunds));

	// Outcomes + prices
	let outcomes = $state<OutcomeRow[]>([]);
	let outcomesLoaded = $state(false);
	// centralized color helpers handle hashing/indexing; no index map needed here

	let outcomePrices = $state<Record<string, number>>({});
	let pricesLoaded = $state(false);
	let price_history = $state<any[]>([]);

	function refreshMarketPrices() {
		pricesLoaded = false;
		yesLoaded = false;
		if (item.market.market_type === 'BINARY') {
			loadYesProbability();
		} else {
			loadOutcomePrices();
		}
	}

	async function ensureOutcomesLoaded() {
		if (outcomesLoaded) return;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(item.market.id)}/outcomes`);
			const data = await res.json().catch(() => ({ outcomes: [] }));
			outcomes = Array.isArray(data?.outcomes) ? data.outcomes : [];
			outcomesLoaded = true;
		} catch {
			outcomesLoaded = true;
		}
	}

	async function loadOutcomePrices() {
		if (pricesLoaded) return;
		try {
			const res = await fetch(`/api/markets/${encodeURIComponent(item.market.id)}/prices`);
			const data = await res.json().catch(() => ({ price_history: [] }));
			const rows = (data?.price_history as any[]) || [];
			price_history = rows;
			const lastByOutcome: Record<string, any> = {};
			for (const r of rows) lastByOutcome[r.outcome_id] = r;
			let map: Record<string, number> = {};
			Object.entries(lastByOutcome).forEach(([oid, r]: any) => {
				const p = Number(r?.price);
				if (Number.isFinite(p)) map[oid] = p;
			});
			// Fallback to current pool balances if history empty
			if (Object.keys(map).length === 0) {
				try {
					const res2 = await fetch(`/api/markets/${encodeURIComponent(item.market.id)}/pool_balances`);
					const d2 = await res2.json().catch(() => ({ pool_balances: [] }));
					const pool = (d2?.pool_balances as any[]) || [];
					const total = pool.reduce((acc, b) => acc + Number(b.balance || 0), 0);
					if (total > 0) {
						map = {};
						for (const b of pool) map[b.outcome_id] = Number(b.balance) / total;
					}
				} catch {
				}
			}
			outcomePrices = map;
		} catch {
			// ignore
		} finally {
			pricesLoaded = true;
		}
	}

	// Binary gauge value (0..100)
	let yesPct = $state<number | null>(null);
	let yesLoaded = $state(false);

	function findOutcomeIdFor(intent: 'yes' | 'no'): string | null {
		if (!outcomes || outcomes.length === 0) return null;
		const yes =
			outcomes.find((o: any) => String(o.short_code || '').toUpperCase() === 'YES') ||
			outcomes.find((o: any) => String(o.name || '').trim().toLowerCase() === 'yes') ||
			outcomes.find((o: any) => o.index_id === 0);
		const no =
			outcomes.find((o: any) => String(o.short_code || '').toUpperCase() === 'NO') ||
			outcomes.find((o: any) => String(o.name || '').trim().toLowerCase() === 'no') ||
			outcomes.find((o: any) => o.index_id === 1);
		if (intent === 'yes') return yes?.id || null;
		return no?.id || null;
	}

	async function loadYesProbability() {
		if (yesLoaded) return;
		try {
			await ensureOutcomesLoaded();
			const yesId = findOutcomeIdFor('yes');
			if (!yesId) {
				yesLoaded = true;
				return;
			}
			await loadOutcomePrices();
			const p = outcomePrices?.[yesId];
			if (typeof p === 'number' && isFinite(p)) yesPct = p * 100;
		} catch {
		}
		yesLoaded = true;
	}

	$effect(() => {
		if (item.market.market_type === 'BINARY') {
			loadYesProbability();
		}
	});

	$effect(() => {
		if (item.market.market_type !== 'BINARY') {
			ensureOutcomesLoaded();
			loadOutcomePrices();
		} else {
			// For binary, still load outcomes/prices for list/graph usage
			ensureOutcomesLoaded();
			loadOutcomePrices();
		}
	});

	async function quickBet(intent: 'yes' | 'no') {
		if (isResolved || isClosedTrading) {
			goto(marketUrl);
			return;
		}
		if (!hasAcknowledgedFirstBet()) {
			firstBetOpen = true;
			resumeAction = () => {
				setAcknowledged();
				void quickBet(intent);
			};
			return;
		}
		loadingIntent = intent;
		error = null;
		success = null;
		try {
			await ensureOutcomesLoaded();
			const outcomeId = findOutcomeIdFor(intent);
			if (!outcomeId) throw new Error('Could not find outcome.');
			const amount = DEFAULT_TRADE_AMOUNT;
			const result = await placeBet({ market_id: item.market.id, outcome_id: outcomeId, amount_credits: amount });
			const outcome = (outcomes || []).find((o) => o.id === outcomeId);
			const label = (outcome?.name || outcome?.short_code || 'Outcome');
			success = `${label} for ${currency}${amount.toFixed(2)}`;
			showBetSuccessToast(success, (result as any)?.transaction_id ?? null);
			didExecute = true;
			pickedBinaryIntent = intent;
			pickedOutcomeId = outcomeId;
			betCount += 1;
			refreshMarketPrices();
		} catch (e: any) {
			error = e?.message || String(e);
			appToast.error(error);
		} finally {
			loadingIntent = null;
		}
	}

	async function quickBetOutcome(outcomeId: string) {
		if (isResolved || isClosedTrading) {
			goto(marketUrl);
			return;
		}
		if (!outcomeId) return;
		if (!hasAcknowledgedFirstBet()) {
			firstBetOpen = true;
			resumeAction = () => {
				setAcknowledged();
				void quickBetOutcome(outcomeId);
			};
			return;
		}
		loadingOutcomeId = outcomeId;
		error = null;
		success = null;
		try {
			const amount = DEFAULT_TRADE_AMOUNT;
			const result = await placeBet({ market_id: item.market.id, outcome_id: outcomeId, amount_credits: amount });
			const outcome = (outcomes || []).find((o) => o.id === outcomeId);
			const label = (outcome?.name || outcome?.short_code || 'Outcome');
			success = `${label} for ${currency}${amount.toFixed(2)}`;
			showBetSuccessToast(success, (result as any)?.transaction_id ?? null);
			didExecute = true;
			pickedOutcomeId = outcomeId;
			pickedBinaryIntent = null;
			betCount += 1;
			refreshMarketPrices();
		} catch (e: any) {
			error = e?.message || String(e);
			appToast.error(error);
		} finally {
			loadingOutcomeId = null;
		}
	}

  async function showBetSuccessToast(message: string, txId: string | null) {
    // Defer success toast until user clicks in modal.
    if (txId && modal) {
      modal.show({ kind: 'addComment', marketId: item.market.id, transactionId: txId, message });
      return;
    }
    // Fallback if no transaction id
    appToast.success(message);
  }
</script>

<slot
	{item}
	{marketUrl}
	{commentsUrl}
	{thumbnailUrl}
	{PLACEHOLDER_IMG}
	{isResolved}
	{isClosedTrading}
	{statusLabel}
	{loadingIntent}
	{loadingOutcomeId}
	{error}
	{success}
	{didExecute}
	{pickedBinaryIntent}
	{pickedOutcomeId}
	{betCount}
	{currency}
	{balanceCredits}
	{hasFunds}
	{actionsDisabled}
	{outcomes}
	{outcomesLoaded}
	{outcomePrices}
	{pricesLoaded}
	{price_history}
	{yesPct}
	{ensureOutcomesLoaded}
	{loadOutcomePrices}
	{quickBet}
	{quickBetOutcome}
></slot>

<!-- First-bet modal -->
{#if firstBetOpen}
	<FirstBetWarning
		open={firstBetOpen}
		onContinue={() => { setAcknowledged(); const fn = resumeAction; resumeAction = null; firstBetOpen = false; fn?.(); }}
		onCancel={() => { resumeAction = null; firstBetOpen = false; }}
	/>
{/if}
