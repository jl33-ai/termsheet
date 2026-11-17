<script lang="ts">
	import ForSelf from './CommentThread.svelte';
	import Comment from '$lib/ui/comments/Comment.svelte';
	import { redirectToLogin } from '$lib/auth/client.ts';
  import ReplyComposer from '$lib/ui/comments/ReplyComposer.svelte';

	let {
		comment,
		market_id,
		user,
		level = 0,
		outcomes = [],
		autoExpand = false
	} = $props<{
		comment: any;
		market_id: string;
		user: any;
		level?: number;
		outcomes?: any[];
		autoExpand?: boolean;
	}>();

	// local state for this node
	let expanded = $state(false);
	let loading = $state(false);
	let replies = $state<any[] | null>(null);
	let replyOpen = $state(false);
	let replyCount = $state<number>(Number(comment.reply_count || 0));

	async function loadReplies(force = false) {
		if (!force && replies && Array.isArray(replies)) return;
		loading = true;
		try {
			const res = await fetch(`/api/comments/${encodeURIComponent(comment.id)}/replies`);
			if (!res.ok) {
				console.warn('loadReplies: non-OK response', res.status);
				replies = [];
				return;
			}
			const rows = (await res.json()) || [];
			// Oldest → newest
			replies = (rows as any[])
				.slice()
				.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
			replyCount = Array.isArray(replies) ? replies.length : 0;
		} catch (e) {
			console.warn('loadReplies: failed', e);
			replies = [];
		} finally {
			loading = false;
		}
	}

	async function toggle() {
		expanded = !expanded;
		if (expanded) {
			await loadReplies();
		}
	}

	async function onReplyClick() {
		if (!user) {
			redirectToLogin();
			return;
		}
		replyOpen = !replyOpen;
	}

	async function submitReply(content: string) {
		if (!content) return;
		// optimistic insert
		const temp = {
			id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			content,
			created_at: new Date().toISOString(),
			user_id: user?.id ?? null,
			username: 'You',
			avatar_url: user?.avatar_url ?? null,
			shares: null,
			outcome_id: null,
			outcome_name: null,
			amount_credits: null,
			parent_id: comment.id,
			reply_count: 0,
			likes_count: 0,
			liked: false
		};
		// Append to end to keep chronological order (oldest → newest)
		replies = [...((replies as any[]) ?? []), temp];
		replyCount = (replyCount || 0) + 1;
		replyOpen = false;
		expanded = true; // ensure visible
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id, content, parent_id: comment.id })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to post reply');
			}
			// Refresh from server to replace temp with real row
			await loadReplies(true);
		} catch (e) {
			// rollback
			replies = (replies as any[]).filter((r) => r.id !== temp.id);
			replyCount = Math.max(0, (replyCount || 0) - 1);
			console.error(e);
		}
	}

	// Kept simple: no auto-expansion by hash or post-auth intent

	$effect(() => {
		if (autoExpand && !expanded) {
			expanded = true;
			void loadReplies();
		}
	});
</script>

<Comment
	{comment}
	{outcomes}
	clickable={level === 0}
	hoverHighlight={level === 0}
	isNested={level > 0}
	onReply={level === 0 && comment?.id !== (comment as any)?.transaction_id ? onReplyClick : undefined}
/>

{#if replyCount > 0 || (replies && replies.length > 0)}
	<button
		class={`ml-12 inline-flex items-center gap-1 text-sm text-faint app-text-button ${!expanded ? 'mb-3' : ''}`}
		type="button"
		onclick={toggle}
	>
		{expanded ? 'Hide replies' : `View replies (${replyCount})`}
	</button>
{/if}

{#if level === 0 && replyOpen && user}
	<div class="mt-2 ml-12">
		<ReplyComposer
			placeholder="Write a reply..."
			submitLabel="Reply"
			avatarUrl={user?.avatar_url || null}
			onSubmit={submitReply}
			onCancel={() => (replyOpen = false)}
		/>
	</div>
{/if}

{#if expanded}
	<div class="mt-2 ml-12">
		{#if loading}
			<div class="text-xs text-faint">Loading…</div>
		{:else if replies && replies.length > 0}
			<div class="gap-1">
				{#each replies as r (r.id)}
					<ForSelf comment={r} {market_id} {user} level={level + 1} {outcomes} />
				{/each}
			</div>
		{/if}
	</div>
{/if}
