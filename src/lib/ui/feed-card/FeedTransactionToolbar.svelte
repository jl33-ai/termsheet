<script lang="ts">
	import Icon from '@iconify/svelte';
	import LikeButton from '$lib/ui/canonical/LikeButton.svelte';

	let { commentId, initialLikes, initialIsLiked, commentCount, onClickComment, onClickCopy } = $props<{
		commentId?: string | null;
		initialLikes?: number;
		initialIsLiked?: boolean;
		commentCount?: number;
		onClickComment?: (e: MouseEvent) => void;
		onClickCopy?: (e: MouseEvent) => void;
	}>();

	const count = $derived.by(() => (Number(commentCount ?? 0) || 0));
	const cid = $derived.by(() => (typeof commentId === 'string' ? commentId : null));
</script>

<div class="w-full grid grid-cols-3 text-sm text-faint">
	{#if cid}
		<LikeButton
			comment_id={cid}
			initialLikes={Number(initialLikes ?? 0)}
			initialIsLiked={Boolean(initialIsLiked)}
		/>
	{/if}

	<button class="flex items-center gap-2 app-text-button" onclick={onClickComment}>
		<Icon icon="bx:comment" />
		<span class="tabular-nums">{count}</span>
	</button>

	<button class="flex items-center gap-2 app-text-button" onclick={onClickCopy}>
		<Icon icon="bx:link" />
		<span>Copy</span>
	</button>
</div>
