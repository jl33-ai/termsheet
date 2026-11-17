<script lang="ts">
  import Modal from '$lib/ui/canonical/Modal.svelte';
  import { getModal } from '$lib/stores/ui-modal.svelte.ts';
  import { appToast } from '$lib/ui/toast.ts';
  import XAuthButton from '$lib/ui/canonical/XAuthButton.svelte';
  import CommentAddedToast from '$lib/ui/comments/CommentAddedToast.svelte';

  const modal = getModal();

  // Local input states per modal kind
  let commentText = $state('');
  let submitting = $state(false);
  let contributeUrl = $state('');
  let commentTextarea: HTMLTextAreaElement | null = null;

  $effect(() => {
    // Reset local state when modal changes
    if (!modal?.open) {
      commentText = '';
      contributeUrl = '';
      submitting = false;
    }
  });

  // Focus comment box when addComment opens
  $effect(() => {
    if (modal?.open && modal.data?.kind === 'addComment') {
      // Ensure DOM is ready before focusing
      setTimeout(() => commentTextarea?.focus(), 0);
    }
  });

  async function submitAddComment() {
    if (!modal || !modal.data || modal.data.kind !== 'addComment') return;
    const text = commentText.trim();
    if (!text || submitting) return;
    submitting = true;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: modal.data.marketId,
          transaction_id: modal.data.transactionId,
          content: text
        })
      });
      if (!res.ok) throw new Error('Failed to post comment');
      // Response is the inserted/updated comment row
      const row = await res.json().catch(() => ({} as any));
      if (modal.data.transactionId) {
        appToast.success(CommentAddedToast as any, {
          props: {
            transactionId: modal.data.transactionId,
            commentId: (row as any)?.id ?? null,
            message: (modal.data as any)?.message ?? 'Bet placed',
            showUndo: true
          },
          duration: 8000
        });
      } else {
        appToast.success('Comment added');
      }
      modal.close();
    } catch (e: any) {
      appToast.error(e?.message || 'Failed to add comment');
    } finally {
      submitting = false;
    }
  }

  async function submitContributeSource() {
    if (!modal || !modal.data || modal.data.kind !== 'contributeSource') return;
    const url = contributeUrl.trim();
    if (!url) { modal.close(); return; }
    try {
      const res = await fetch(`/api/markets/${modal.data.marketId}/external-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error('Failed to submit link');
      appToast.success('Link submitted');
    } catch (e: any) {
      appToast.error(e?.message || 'Failed to submit link');
    } finally {
      modal.close();
      contributeUrl = '';
    }
  }
</script>

{#if modal?.open && modal?.data}
  {#if modal.data.kind === 'addComment'}
    <Modal open={true} onClose={() => modal?.close()}>
      {#snippet header()}
        <div class="text-title font-medium">Add a comment</div>
      {/snippet}
      {#snippet children()}
        <div class="flex flex-col gap-2">
          <p class="text-sm text-muted">{(modal.data as any).message ?? ''}</p>
          <textarea
            class="min-h-24 w-full"
            bind:this={commentTextarea}
            bind:value={commentText}
            maxlength={280}
            placeholder="Write a comment..."
            onkeydown={(e: KeyboardEvent) => {
              if (e.metaKey && e.key === 'Enter') {
                e.preventDefault();
                submitAddComment();
              }
            }}
          ></textarea>
          <div class="flex items-center gap-3">
            <button
              class="app-button primary"
              type="button"
              onclick={submitAddComment}
              disabled={submitting || !commentText.trim()}
            >Comment</button>
            <button
              class="app-text-button"
              type="button"
              onclick={() => {
                const data: any = modal?.data ?? {};
                if (data?.kind === 'addComment' && data?.transactionId) {
                  appToast.success(CommentAddedToast as any, {
                    props: {
                      transactionId: data.transactionId,
                      message: data?.message ?? 'Bet placed',
                      showUndo: true
                    },
                    duration: 8000
                  });
                }
                modal?.close();
              }}
            >Not now</button>
          </div>
        </div>
      {/snippet}
    </Modal>
  {:else if modal.data.kind === 'contributeSource'}
    <Modal open={true} onClose={() => modal?.close()}>
      {#snippet header()}
        <h3 class="text-title">Contribute a source</h3>
      {/snippet}
      {#snippet children()}
        <div class="mt-1">
          <label class="mb-1 block text-xs text-muted" for="contrib-link">Link</label>
          <input
            class="w-64"
            placeholder="https://example.com/article"
            id="contrib-link"
            value={contributeUrl}
            oninput={(e) => (contributeUrl = (e.currentTarget as HTMLInputElement).value)}
            type="url"
          />
        </div>
      {/snippet}
      {#snippet footer()}
        <div class="mt-3 flex justify-end gap-2">
          <button class="app-button naked" type="button" onclick={() => modal?.close()}>Cancel</button>
          <button class="app-button" type="button" onclick={submitContributeSource}>Submit</button>
        </div>
      {/snippet}
    </Modal>
  {:else if modal.data.kind === 'register'}
    <Modal open={true} onClose={() => modal?.close()}>
      {#snippet header()}
        <h3 class="text-title font-medium">Login</h3>
      {/snippet}
      {#snippet children()}
        <div class="grid gap-3">
          <p class="text-sm text-muted">You can only use X/Twitter</p>
          <XAuthButton />
        </div>
      {/snippet}
    </Modal>
  {/if}
{/if}
