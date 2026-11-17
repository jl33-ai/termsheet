<script lang="ts">
  let {
    // Close props
    closeMarketId,
    closeLoading,
    closeMsg,
    lastClosedMarketId,
    onCloseMarketIdInput,
    onClose,
    // Resolve props
    resolveMarketId,
    resolveOutcomeId,
    resolveOutcomes,
    resolveCutoff,
    resolveLoading,
    resolveMsg,
    lastResolvedMarketId,
    onResolveMarketIdInput,
    onLoadOutcomes,
    onResolveOutcomeIdChange,
    onResolveCutoffInput,
    onResolve,
    // shared
    onCopy
  }: {
    closeMarketId: string;
    closeLoading: boolean;
    closeMsg: string;
    lastClosedMarketId: string;
    onCloseMarketIdInput: (v: string) => void;
    onClose: () => void | Promise<void>;
    resolveMarketId: string;
    resolveOutcomeId: string;
    resolveOutcomes: { id: string; name: string }[];
    resolveCutoff: string;
    resolveLoading: boolean;
    resolveMsg: string;
    lastResolvedMarketId: string;
    onResolveMarketIdInput: (v: string) => void;
    onLoadOutcomes: () => void | Promise<void>;
    onResolveOutcomeIdChange: (v: string) => void;
    onResolveCutoffInput: (v: string) => void;
    onResolve: () => void | Promise<void>;
    onCopy: (id: string) => void;
  } = $props();
</script>

<div class="rounded-lg border border-border bg-white p-6">
  <h2 class="mb-4 text-lg font-medium text-title">Close / Resolve Market</h2>
  <div class="grid gap-6 md:grid-cols-2">
    <!-- Close -->
    <form
      class="space-y-4"
      onsubmit={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-title" for="close-market-id">Market ID</label>
        <input
          type="text"
          placeholder="UUID"
          value={closeMarketId}
          id="close-market-id"
          oninput={(e: Event) => onCloseMarketIdInput?.((e.target as HTMLInputElement).value)}
          class="w-full rounded-sm border border-border px-3 py-2"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={closeLoading}
          class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60"
        >
          {closeLoading ? 'Closing…' : 'Close Market'}
        </button>
      </div>
      {#if closeMsg && lastClosedMarketId}
        <div class="mt-2 flex items-center gap-3">
          <span class="text-xs text-muted">Closed:</span>
          <code class="text-xs">{lastClosedMarketId}</code>
          <button
            type="button"
            class="text-xs text-accent underline"
            onclick={() => onCopy?.(lastClosedMarketId)}
          >
            Copy ID
          </button>
          <a class="text-xs text-accent underline" href={`/market/${lastClosedMarketId}`}>View</a>
        </div>
      {/if}
    </form>

    <!-- Resolve -->
    <form
      class="space-y-4"
      onsubmit={(e) => {
        e.preventDefault();
        onResolve?.();
      }}
    >
      <div>
        <label class="mb-1 block text-sm font-medium text-title" for="resolve-market-id">Market ID</label>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="UUID"
            value={resolveMarketId}
            id="resolve-market-id"
            oninput={(e: Event) => onResolveMarketIdInput?.((e.target as HTMLInputElement).value)}
            class="flex-1 rounded-sm border border-border px-3 py-2"
          />
          <button
            type="button"
            onclick={onLoadOutcomes}
            class="rounded-sm border border-border px-3 py-2 text-base"
          >
            Load Outcomes
          </button>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-title" for="resolve-outcome">Winning Outcome</label>
        <select
          id="resolve-outcome"
          value={resolveOutcomeId}
          oninput={(e: Event) => onResolveOutcomeIdChange?.((e.target as HTMLSelectElement).value)}
          class="w-full rounded-sm border border-border px-3 py-2"
        >
          <option value="">Select outcome…</option>
          {#each resolveOutcomes as o}
            <option value={o.id}>{o.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-title" for="resolve-cutoff">Cutoff (optional)</label>
        <input
          id="resolve-cutoff"
          type="datetime-local"
          value={resolveCutoff}
          oninput={(e: Event) => onResolveCutoffInput?.((e.target as HTMLInputElement).value)}
          class="w-full rounded-sm border border-border px-3 py-2"
        />
        <p class="mt-1 text-xs text-muted">Buys after this time are refunded.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="submit"
          disabled={resolveLoading || !resolveOutcomeId}
          class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60"
        >
          {resolveLoading ? 'Resolving…' : 'Resolve Market'}
        </button>
        <span class="text-xs text-muted">If open, this will close and resolve.</span>
      </div>
      {#if resolveMsg && lastResolvedMarketId}
        <div class="mt-2 flex items-center gap-3">
          <span class="text-xs text-muted">Resolved:</span>
          <code class="text-xs">{lastResolvedMarketId}</code>
          <button
            type="button"
            class="text-xs text-accent underline"
            onclick={() => onCopy?.(lastResolvedMarketId)}
          >
            Copy ID
          </button>
          <a class="text-xs text-accent underline" href={`/market/${lastResolvedMarketId}`}>View</a>
        </div>
      {/if}
    </form>
  </div>
</div>
