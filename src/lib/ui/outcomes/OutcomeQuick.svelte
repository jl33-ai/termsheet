<script lang="ts">
  import type { OutcomeRow, OutcomeWithPrice } from '$lib/types';
  import { outcomeColorHex } from '$lib/colors.ts';
  import Icon from '@iconify/svelte';
  import { tooltip } from '$lib/ui/tooltip.ts';
  import Loading from '$lib/ui/canonical/Loading.svelte';

  // Unified props (formerly OutcomeQuick + OutcomeQuickList)
  let {
    marketType,
    // shared status
    isResolved,
    isClosedTrading,
    statusLabel,
    actionsDisabled,
    // binary state (optional)
    loadingIntent,
    didExecute,
    pickedBinaryIntent,
    onQuickBet,
    // list state
    outcomes,
    outcomesLoaded,
    loadingOutcomeId,
    pickedOutcomeId,
    commentsUrl,
    outcomePrices,
    onBuy,
    lastTransactionId,
    showCopyLink,
    // list-specific
    limitHeight,
  } = $props<{
    marketType?: string;
    isResolved: boolean;
    isClosedTrading: boolean;
    statusLabel: string | null;
    actionsDisabled: boolean;
    loadingIntent?: 'yes' | 'no' | null;
    didExecute: boolean;
    pickedBinaryIntent?: 'yes' | 'no' | null;
    onQuickBet?: (intent: 'yes' | 'no') => void;
    outcomes: (OutcomeRow | OutcomeWithPrice)[];
    outcomesLoaded: boolean;
    loadingOutcomeId: string | null;
    pickedOutcomeId: string | null;
    commentsUrl: string;
    outcomePrices?: Record<string, number>;
    onBuy: (outcomeId: string) => void;
    lastTransactionId?: string | null;
    showCopyLink?: boolean;
    limitHeight?: boolean;
  }>();

  // Derived helpers for list rendering
  // colors derived via centralized helper
  const OUTCOME_QUERY = 'outcome';
  const marketUrlBase = $derived.by(() => {
    const url = commentsUrl || '';
    const hashIdx = url.indexOf('#');
    return hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  });
  function hrefForOutcome(outcomeId: string): string {
    const base = marketUrlBase;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}${OUTCOME_QUERY}=${encodeURIComponent(outcomeId)}`;
  }
  const pctText = (o: OutcomeRow | OutcomeWithPrice): string => {
    const id = (o as any).id as string;
    const price = (outcomePrices && outcomePrices[id] != null)
      ? outcomePrices[id]!
      : (o as any).price;
    if (typeof price === 'number' && isFinite(price)) {
      const pct = Math.round(Math.max(0, Math.min(1, price)) * 100);
      return `${pct}%`;
    }
    return '—';
  };
</script>

<div class="flex items-start justify-center ml-14">
  <div class="w-full">
    {#if  isResolved || isClosedTrading}
      <div class="text-sm text-muted">{statusLabel}</div>
    {:else if !outcomesLoaded}
      <div class="w-full h-44 flex justify-center items-center"><Loading /></div>
    {:else if outcomes.length === 0}
      <a href={commentsUrl} class="text-sm text-accent" onclick={(e) => e.stopPropagation()}>View market</a>
    {:else}
      <div class="flex flex-col gap-1 overflow-y-auto scrollbar-hide {limitHeight ? 'max-h-[130px]' : ''}">
        {#each outcomes as o (o.id)}
          <div class="flex items-center">
            <div class="flex-1">
              <a
                href={hrefForOutcome(o.id)}
                class="leading-tight text-title hover:underline"
                use:tooltip={o.name}
                onclick={(e) => e.stopPropagation()}
              >{o.name}</a>
            </div>
            <div class="w-14 text-right tabular-nums font-medium text-title">
              {pctText(o)}
            </div>
            <button
              type="button"
              class="app-button ml-3 h-9 w-12 inline-flex items-center justify-center px-4"
              style={`--btn-color:${outcomeColorHex({
                explicitHex: (o as any)?.color_hex ?? (o as any)?.colorHex ?? null,
                indexId: (o as any)?.index_id ?? (o as any)?.indexId ?? null,
                id: (o as any)?.id ?? null,
                name: (o as any)?.name ?? null,
                shortCode: (o as any)?.short_code ?? (o as any)?.shortCode ?? null,
              }) || '#e5e7eb'};`}
              disabled={loadingOutcomeId != null || actionsDisabled}
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(o.id); }}
            >
              {#if loadingOutcomeId === o.id}
                <Icon icon="bx:loader-alt" class="animate-spin" />
              {:else if didExecute && pickedOutcomeId === o.id}
                <Icon icon="bx:check" />
              {:else}
                <span class="text-sm">Bet</span>
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Retain the original BINARY quick actions block (commented) for reference -->
<!--
<div class="flex w-full items-center justify-center gap-2">
  {#if isResolved || isClosedTrading}
    <div class="text-sm text-muted">{statusLabel}</div>
  {:else}
    <div class="flex gap-2">
      {#each [{ label: 'Yes', intent: 'yes', klass: 'affirmative' }, { label: 'No', intent: 'no', klass: 'negative' }] as a}
        <button
          type="button"
          class={`app-button ${a.klass} w-32 flex flex-1 h-10 items-center justify-center`}
          disabled={loadingIntent != null || actionsDisabled}
          onclick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickBet?.(a.intent); }}
        >
          {#if loadingIntent === a.intent}
            <Icon icon="bx:loader-alt" class="animate-spin" />
          {:else if didExecute && pickedBinaryIntent === a.intent}
            <Icon icon="bx:check" />
          {:else}
            {a.label}
          {/if}
        </button>
      {/each}
    </div>
    {#if didExecute && lastTransactionId && showCopyLink !== false}
      <button
        type="button"
        class="app-button naked h-10 w-10 flex items-center justify-center"
        title="Copy share link"
        onclick={(e) => { e.preventDefault(); e.stopPropagation(); copyShareLink(); }}
      >
        <Icon icon={linkCopied ? 'bx:check' : 'bx:link'} />
      </button>
    {/if}
  {/if}
</div>
-->
