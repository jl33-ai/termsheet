<script lang="ts">
  let {
    loading,
    message,
    error,
    onSeed
  }: {
    loading: boolean;
    message: string;
    error: string;
    onSeed: () => void | Promise<void>;
  } = $props();
</script>

<div class="rounded-lg border border-border bg-white p-6">
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-lg font-medium text-title">Seed Database</h2>
    <div class="text-xs text-muted">Creates sample data for development</div>
  </div>

  <div class="space-y-4">
    <p class="text-sm text-base">
      This creates sample companies, users, and markets. Safe to run multiple times.
    </p>

    <div class="flex items-center gap-4">
      <button
        onclick={onSeed}
        disabled={loading}
        class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60"
      >
        {loading ? 'Seeding…' : 'Seed Database'}
      </button>

      {#if message}
        <div class="rounded-sm bg-green-50 px-3 py-2 text-sm text-base">
          {message}
        </div>
      {/if}

      {#if error}
        <div class="rounded-sm bg-red-50 px-3 py-2 text-sm text-base">
          {error}
        </div>
      {/if}
    </div>
  </div>
</div>

