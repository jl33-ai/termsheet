<script lang="ts">
	import Icon from '@iconify/svelte';
	import { redirectToLogin } from '$lib/auth/client.ts';

	let {
		comment_id,
		initialLikes = undefined as number | undefined,
		initialIsLiked = undefined as boolean | undefined,
		autoLoad = true,
		onResult = undefined as undefined | ((liked: boolean, likes_count: number) => void)
	} = $props<{
		comment_id: string;
		initialLikes?: number;
		initialIsLiked?: boolean;
		autoLoad?: boolean;
		onResult?: (liked: boolean, likes_count: number) => void;
	}>();

	let likes = $state<number>(typeof initialLikes === 'number' ? initialLikes : 0);
	let liked = $state<boolean>(typeof initialIsLiked === 'boolean' ? initialIsLiked : false);
	let loading = $state(false);
	let hasInteracted = $state(false);

	async function loadInitial() {
		if (!autoLoad || !comment_id) return;
		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(comment_id)}/likes`, { credentials: 'same-origin' });
			if (!res.ok) return;
			const j = await res.json().catch(() => null);
			if (!hasInteracted && j) {
				const lc = Number(j?.likes_count ?? 0);
				const lk = Boolean(j?.liked);
				likes = lc;
				liked = lk;
				onResult?.(liked, likes);
				if (typeof window !== 'undefined') {
					window.dispatchEvent(new CustomEvent('termsheet:comment-like-changed'));
				}
			}
		} catch {
		}
	}

	$effect(() => {
		// Fetch summary when the component mounts or when comment_id changes
		void loadInitial();
	});

	// Keep it simple: initialize from props once; maintain local state thereafter.

	async function toggleLike(e?: MouseEvent) {
		e?.stopPropagation?.();
		if (!comment_id || loading) return;

		loading = true;
		const prevLiked = liked;
		const prevLikes = likes;

		// Optimistic local update; derive from previous values
		liked = !prevLiked;
		likes = Math.max(0, prevLikes + (liked ? 1 : -1));
		onResult?.(liked, likes);
		hasInteracted = true;

		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(comment_id)}/like`, {
				method: 'POST',
				credentials: 'same-origin'
			});


			if (res.status === 401) {
				liked = prevLiked;
				likes = prevLikes;
				onResult?.(liked, likes);
				redirectToLogin();
				return;
			}
			if (!res.ok) throw new Error('Failed to like');
			// Ignore response body; keep optimistic state.
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('termsheet:comment-like-changed'));
			}
		} catch {
			// Revert on failure
			liked = prevLiked;
			likes = prevLikes;
			onResult?.(liked, likes);
		} finally {
			loading = false;
		}
	}
</script>

<button
	class="group/like inline-flex items-center gap-1 p-1 rounded-sm disabled:opacity-50"
	type="button"
	onclick={(e) => toggleLike(e)}
	disabled={loading}
	aria-label={liked ? 'Unlike' : 'Like'}
	title={liked ? 'Unlike' : 'Like'}
	aria-pressed={liked}
>
    <span class="inline-flex h-4 w-4 items-center justify-center">
        <Icon
					icon={liked ? 'bxs:heart' : 'bx:heart'}
					class={`transition-colors ${liked ? 'text-error' : 'text-faint group-hover/like:text-error'}`}
				/>
    </span>
	<span
		class={`min-w-[1ch] tabular-nums transition-colors ${liked ? 'text-error font-medium' : 'text-faint group-hover/like:text-error'}`}>
        {likes}
    </span>
</button>
