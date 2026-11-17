<script lang="ts">
  import BackButton from '$lib/ui/canonical/BackButton.svelte';
  import CopyLinkButton from '$lib/ui/canonical/CopyLinkButton.svelte';
  import { X_PADDING } from '$lib/constant.ts';

  let {
    text = '',
    href = '',
    showBack = true,
    inline = true,
    containerClass = `${X_PADDING} pt-3`,
    titleClass = '',
    copyClass = 'text-sm'
  } = $props<{
    text?: string | null;
    href?: string | null;
    showBack?: boolean;
    inline?: boolean; // true = inline row; false = stacked like Wallet
    containerClass?: string | null;
    titleClass?: string | null;
    copyClass?: string | null;
  }>();

  const safeText = $derived((text ?? '').toString());
  const hasHref = $derived(Boolean((href ?? '').toString().trim()));
</script>

<div class={containerClass || `${X_PADDING} pt-3`}>
  {#if inline}
    <span class="flex items-center gap-2 text-base text-lg font-medium">
      {#if showBack}
        <BackButton />
      {/if}
      <span class={`truncate ${titleClass || ''}`}>{safeText}</span>
      {#if hasHref}
        <CopyLinkButton class={`${copyClass || ''}`} href={(href ?? '') as string} title="Copy link" />
      {/if}
    </span>
  {:else}
    {#if showBack}
      <BackButton />
    {/if}
    <div class="mt-2">
      <div class={`text-lg font-medium ${titleClass || ''}`}>{safeText}</div>
      {#if hasHref}
        <CopyLinkButton class={`${copyClass || ''}`} href={(href ?? '') as string} title="Copy link" />
      {/if}
    </div>
  {/if}
</div>
