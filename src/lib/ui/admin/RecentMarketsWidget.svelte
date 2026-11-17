<script lang="ts">
  let {
    markets,
    loading,
    onRefresh,
    onUse,
    onCopy
  }: {
    markets: { id: string; question: string; created_at: string }[];
    loading: boolean;
    onRefresh: () => void | Promise<void>;
    onUse: (id: string, target: 'close' | 'resolve' | 'link') => void;
    onCopy: (id: string) => void;
  } = $props();

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  };
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6">
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-lg font-medium text-title">Recent Markets</h2>
    <button
      onclick={onRefresh}
      disabled={loading}
      class="rounded-sm border border-border px-3 py-1 text-sm text-accent disabled:opacity-60"
    >
      {loading ? 'Loading…' : 'Refresh'}
    </button>
  </div>

  {#if markets?.length > 0}
    <div class="space-y-2">
      {#each markets as market}
        <div class="rounded-sm border border-border bg-gray-50 p-3">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="text-sm font-medium text-title">{market.question}</div>
              <div class="mt-1 text-xs text-muted">ID: {market.id}</div>
              <div class="text-xs text-muted">Created: {fmtDate(market.created_at)}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <a class="text-xs text-accent underline" href={`/market/${market.id}`}>View</a>
              <button
                class="rounded-sm border border-border px-2 py-1 text-xs text-base"
                onclick={() => onCopy(market.id)}
              >
                Copy ID
              </button>
              <button
                class="rounded-sm border border-border px-2 py-1 text-xs text-base"
                onclick={() => onUse(market.id, 'close')}
              >
                Use in Close
              </button>
              <button
                class="rounded-sm border border-border px-2 py-1 text-xs text-base"
                onclick={() => onUse(market.id, 'resolve')}
              >
                Use in Resolve
              </button>
              <button
                class="rounded-sm border border-border px-2 py-1 text-xs text-base"
                onclick={() => onUse(market.id, 'link')}
              >
                Use in Link
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-sm text-muted">No recent markets found.</p>
  {/if}
</div>

