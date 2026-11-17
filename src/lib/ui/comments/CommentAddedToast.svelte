<script lang="ts">
  import { appToast } from '$lib/ui/toast.ts';
  import { invalidateAll } from '$app/navigation';

  let {
    transactionId,
    commentId = null as string | null,
    message = 'Success',
    showUndo = false
  } = $props<{
    transactionId: string;
    commentId?: string | null;
    message?: string;
    showUndo?: boolean;
  }>();

  const href = $derived.by(() => {
    const base = `/transaction/${encodeURIComponent(String(transactionId))}`;
    const hash = commentId ? `#comment-${encodeURIComponent(String(commentId))}` : '';
    return `${base}${hash}`;
  });
</script>

<div class="flex items-center gap-3">
  <span class="text-sm text-title">{message}</span>
  <a class="text-sm text-title font-medium hover:underline" href={href}>{commentId ? 'View comment' : 'View'}</a>
  {#if showUndo}
    <button
      class="text-sm text-accent font-medium hover:underline"
      type="button"
      onclick={async () => {
        try {
          const res = await fetch(`/api/transactions/${encodeURIComponent(transactionId)}/undo`, { method: 'POST' });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.message || 'Undo failed');
          }
          appToast.success('Bet undone');
          invalidateAll();
        } catch (e: any) {
          appToast.error(e?.message || 'Undo failed');
        }
      }}
    >Undo</button>
  {/if}
</div>
