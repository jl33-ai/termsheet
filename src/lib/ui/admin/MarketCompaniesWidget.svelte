<script lang="ts">
  let {
    marketId,
    onMarketIdInput,
    onLoadCompanies,
    companies,
    selectedCompanyIds,
    onToggleCompany,
    loading,
    onSubmit,
    updatedMarketId,
    onCopy
  }: {
    marketId: string;
    onMarketIdInput: (v: string) => void;
    onLoadCompanies: () => void | Promise<void>;
    companies: { id: string; name: string; slug: string }[];
    selectedCompanyIds: string[];
    onToggleCompany: (id: string) => void;
    loading: boolean;
    onSubmit: (e: Event) => void | Promise<void>;
    updatedMarketId?: string;
    onCopy: (id: string) => void;
  } = $props();
</script>

<div class="rounded-lg border border-border bg-white p-6">
  <h2 class="mb-4 text-lg font-medium text-title">Manage Market Companies</h2>
  <form
    class="space-y-4"
    onsubmit={(e) => {
      e.preventDefault();
      onSubmit?.(e);
    }}
  >
    <div>
      <label class="mb-1 block text-sm font-medium text-title" for="mc-market-id">Market ID</label>
      <div class="flex gap-2">
        <input
          placeholder="UUID"
          value={marketId}
          id="mc-market-id"
          oninput={(e: Event) => onMarketIdInput?.((e.target as HTMLInputElement).value)}
          class="flex-1 rounded-sm border border-border px-3 py-2"
        />
        <button
          type="button"
          onclick={onLoadCompanies}
          class="rounded-sm border border-border px-3 py-2 text-base"
        >
          Load Companies
        </button>
      </div>
    </div>

    {#if companies?.length > 0}
      <div>
        <label class="mb-2 block text-sm font-medium text-title">Associated Companies</label>
        <div class="max-h-60 space-y-1 overflow-y-auto rounded-sm border border-border p-3">
          {#each companies as company}
            <label class="flex cursor-pointer items-center gap-2 rounded-sm p-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedCompanyIds.includes(company.id)}
                onchange={() => onToggleCompany?.(company.id)}
                class="rounded"
              />
              <span class="text-sm text-base">{company.name}</span>
              <span class="text-xs text-muted">({company.slug})</span>
            </label>
          {/each}
        </div>
        <p class="mt-1 text-xs text-muted">{selectedCompanyIds.length} companies selected</p>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <button
        type="submit"
        disabled={loading || !marketId?.trim?.()}
        class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60"
      >
        {loading ? 'Updating…' : 'Update Market Companies'}
      </button>
    </div>

    {#if updatedMarketId}
      <div class="mt-2 flex items-center gap-3">
        <span class="text-xs text-muted">Updated market:</span>
        <code class="text-xs">{updatedMarketId}</code>
        <button
          type="button"
          class="text-xs text-accent underline"
          onclick={() => onCopy?.(updatedMarketId)}
        >
          Copy ID
        </button>
        <a class="text-xs text-accent underline" href={`/market/${updatedMarketId}`}>View</a>
      </div>
    {/if}
  </form>
</div>
