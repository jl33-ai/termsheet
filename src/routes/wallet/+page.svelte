<script lang="ts">
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';
	import InfoTooltip from '$lib/ui/canonical/InfoTooltip.svelte';
	import { X_PADDING } from '$lib/constant.ts';
	import { formatMoney } from '$lib/currency';
	import { formatDateTime, formatRelative } from '$lib/date';


	let { data } = $props<{ data: any }>();
</script>

<SplitPane>
	{#snippet leftHeader()}
		<BackWithText text="Wallet" inline={false} />
	{/snippet}
	{#snippet left()}
		<div class="w-full">
			<div class="{X_PADDING} py-6 flex flex-col items-start gap-4">
				<div class="w-full">
					<div class="flex items-center gap-2">
						<div class="text-sm text-muted">Balance</div>
						<InfoTooltip
							text="Credits are play money used in-app. They are non-withdrawable; all money goes to charity or entrepreneurs."
						/>
					</div>
					<div class="text-lg font-medium text-title">{data?.balance_credits ?? 0} credits</div>
				</div>

				<IconAndText icon="bx:wallet" text="Crypto deposits are coming soon." />

				<div class="text-sm text-muted">History</div>
				{#if (data.wallet_transactions?.length || data.transactions?.length) && data.wallet_transactions.length + data.transactions.length > 0}
					<div class="divide-y divide-border w-full">
						{#each [...(data.wallet_transactions || []), ...(data.transactions || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as t}
							<div class="flex items-center justify-between py-2 text-sm">
								<div>
									{#if t.type === 'DEPOSIT'}
										<div class="font-medium">Deposit</div>
										<div class="text-xs text-faint" title={formatDateTime(t.created_at)}>
											{formatRelative(t.created_at)}
										</div>
									{:else}
										<div
											class={`font-medium ${t.type === 'BUY' ? 'text-accent' : t.type === 'CLAIM' ? 'text-title' : ''}`}>{t.type}</div>
										<div class="text-xs text-faint" title={formatDateTime(t.created_at)}>
											{formatRelative(t.created_at)}
										</div>
									{/if}
								</div>
								<div class="text-right">
									<div>{formatMoney(Number(t.amount_credits || 0))}</div>
									{#if t.tx_hash}
										<div class="max-w-[180px] truncate text-xs text-faint">{t.tx_hash}</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-muted">No transactions yet.</div>
				{/if}
			</div>
		</div>
	{/snippet}
	{#snippet right()}
		<div class="mt-8 w-full p-3 flex flex-col gap-2 text-sm text-muted">
			<div>Wallet features are temporarily disabled.</div>
		</div>
		<!--		<div class="pt-8 text-sm text-muted">-->
		<!--			<div>Network: {DEFAULT_CHAIN.name}</div>-->
		<!--			{#if PUBLIC_TREASURY_ADDRESS}-->
		<!--				<div class="mt-2 break-all text-xs text-faint">Treasury: {PUBLIC_TREASURY_ADDRESS}</div>-->
		<!--			{/if}-->
		<!--		</div>-->
	{/snippet}
</SplitPane>


