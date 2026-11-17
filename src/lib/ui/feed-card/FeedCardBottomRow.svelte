<script lang="ts">
  let {
    betCount,
    balanceCredits,
    hasFunds,
    error,
    success,
  } = $props<{ betCount: number; balanceCredits: number | null; hasFunds: boolean; error: string | null; success: string | null }>();
</script>

{#if (balanceCredits != null && !hasFunds) || error || success}
  <div class="flex items-center">
    {#if balanceCredits != null && !hasFunds}
      <p class="mt-2 text-xs text-muted">Insufficient balance</p>
    {/if}
    {#if error}
      <p class="text-sm text-accent">{error}</p>
    {/if}
    {#if success}
      <p class="text-sm text-accent">{success}</p>
    {/if}
  </div>
{:else}
  <div class="mt-2 text-xs text-muted">Bets: {betCount}</div>
{/if}

