<script lang="ts">
  import type { FeedItem } from '$lib/types';
  import FeedCardController from '$lib/ui/feed-card/FeedCardController.svelte';
  import OutcomeQuick from '$lib/ui/outcomes/OutcomeQuick.svelte';
  import MarketSources from '$lib/ui/market/MarketSources.svelte';
  import FeedCardBottomRow from '$lib/ui/feed-card/FeedCardBottomRow.svelte';
  import MarketTrendGraph from '$lib/ui/market/MarketTrendGraph.svelte';
  import CopyLinkButton from '$lib/ui/canonical/CopyLinkButton.svelte';

  let { item } = $props<{ item: FeedItem }>();
</script>

<FeedCardController {item}>
  <svelte:fragment
    let:item
    let:marketUrl
    let:commentsUrl
    let:thumbnailUrl
    let:PLACEHOLDER_IMG
    let:isResolved
    let:isClosedTrading
    let:statusLabel
    let:actionsDisabled
    let:loadingOutcomeId
    let:didExecute
    let:pickedOutcomeId
    let:outcomes
    let:outcomesLoaded
    let:outcomePrices
    let:price_history
    let:quickBetOutcome
    let:betCount
    let:balanceCredits
    let:hasFunds
    let:error
    let:success
  >
    <div class="w-full border border-border rounded-sm bg-white p-4 relative group">
      <div class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyLinkButton href={marketUrl} />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left column: image + title + list + sources + bottom row -->
        <div class="flex flex-col">
          <div class="flex items-start gap-3">
            <img
              src={thumbnailUrl}
              alt=""
              class="h-20 w-20 rounded-sm border-border object-cover"
              onerror={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                if (el && !el.src.endsWith(PLACEHOLDER_IMG)) el.src = PLACEHOLDER_IMG;
              }}
            />
            <a href={marketUrl} class="block flex-1 text-left leading-tight font-bold tracking-tight text-title md:text-xl hover:underline">
              {item.market.question}
            </a>
          </div>

          <div class="mt-4 flex-1 flex">
            <OutcomeQuick
              outcomes={outcomes}
              outcomesLoaded={outcomesLoaded}
              isResolved={isResolved}
              isClosedTrading={isClosedTrading}
              statusLabel={statusLabel}
              actionsDisabled={actionsDisabled}
              loadingOutcomeId={loadingOutcomeId}
              didExecute={didExecute}
              pickedOutcomeId={pickedOutcomeId}
              commentsUrl={commentsUrl}
              outcomePrices={outcomePrices}
              onBuy={(id) => quickBetOutcome(id)}
            />
          </div>

          <div class="mt-4">
            <MarketSources marketId={item.market.id} class="text-sm" />
          </div>

<!--          <div class="mt-2">-->
<!--            <FeedCardBottomRow-->
<!--              betCount={betCount}-->
<!--              balanceCredits={balanceCredits}-->
<!--              hasFunds={hasFunds}-->
<!--              error={error}-->
<!--              success={success}-->
<!--            />-->
<!--          </div>-->
        </div>

        <!-- Right column: trend graph -->
        <div>
          <div class="h-full w-full">
            <MarketTrendGraph outcomes={outcomes} price_history={price_history} height={320} />
          </div>
        </div>
      </div>
    </div>
  </svelte:fragment>
</FeedCardController>
