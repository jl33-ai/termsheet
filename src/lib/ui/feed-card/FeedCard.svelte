<script lang="ts">
	import type { FeedItem } from '$lib/types';
	import FeedCardController from '$lib/ui/feed-card/FeedCardController.svelte';
	import OutcomeQuick from '$lib/ui/outcomes/OutcomeQuick.svelte';
	import BinaryGauge from '$lib/ui/charts/BinaryGauge.svelte';
	import CopyLinkButton from '$lib/ui/canonical/CopyLinkButton.svelte';
	import AppImage from '$lib/ui/canonical/AppImage.svelte';

	let { item, class: klass, onClickOutcome, isNaked } = $props<{
		item: FeedItem;
		class?: string;
		onClickOutcome?: (item: FeedItem) => void;
		isNaked?: boolean
	}>();
</script>

<FeedCardController {item}>
	<svelte:fragment
		let:item
		let:marketUrl
		let:commentsUrl
		let:thumbnailUrl
		let:isResolved
		let:isClosedTrading
		let:statusLabel
		let:actionsDisabled
		let:loadingIntent
		let:loadingOutcomeId
		let:didExecute
		let:pickedBinaryIntent
		let:pickedOutcomeId
		let:outcomes
		let:outcomesLoaded
		let:outcomePrices
		let:quickBet
		let:quickBetOutcome
		let:yesPct
	>
		<div class="relative group">
			<a
				class="min-h-48 h-full
				{isNaked ? 'pt-5': 'p-5 bg-white border-border border-[0.5px]'}
				 cursor-pointer flex flex-col hover-highlight-secondary
				transition-colors duration-[144ms] ease-out {klass}"
				href={marketUrl}
			>
				<div class="h-16 flex items-start gap-3">
					<div class="flex items-center gap-3 w-full">
						<AppImage src={thumbnailUrl} alt="" />

						<span
							class="w-full text-left flex-1 leading-tight font-bold text-title md:text-md hover:underline line-clamp-3"
						>{item.market.question}</span>
					</div>

					{#if item.market.market_type === 'BINARY' && yesPct != null}
						<BinaryGauge value={yesPct ?? 0} />
					{/if}
				</div>

				<OutcomeQuick
					marketType={item.market.market_type}
					isResolved={isResolved}
					isClosedTrading={isClosedTrading}
					statusLabel={statusLabel}
					actionsDisabled={actionsDisabled}
					loadingIntent={loadingIntent}
					didExecute={didExecute}
					pickedBinaryIntent={pickedBinaryIntent}
					onQuickBet={(intent) => { quickBet(intent); }}
					outcomes={outcomes}
					outcomesLoaded={outcomesLoaded}
					loadingOutcomeId={loadingOutcomeId}
					pickedOutcomeId={pickedOutcomeId}
					commentsUrl={commentsUrl}
					outcomePrices={outcomePrices}
					onBuy={(id) => { quickBetOutcome(id); }}
					lastTransactionId={null}
					limitHeight
					showCopyLink={false}
				/>
			</a>

			<div class="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
				<CopyLinkButton href={marketUrl} />
			</div>
		</div>
	</svelte:fragment>
</FeedCardController>
