<script lang="ts">
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import ReplyComposer from '$lib/ui/comments/ReplyComposer.svelte';
	import { redirectToLogin } from '$lib/auth/client.ts';
	import { appToast } from '$lib/ui/toast.ts';
	import { X_PADDING } from '$lib/constant.ts';

	let {
		user = null,
		market_id = '',
		parent_id = null as null | string,
		// Optional optimistic update hooks so parent can insert/remove temp rows
		onOptimisticAdd = undefined as undefined | ((row: any) => void),
		onOptimisticRemove = undefined as undefined | ((row: { id: string }) => void),
		// Optional: callback after successful submit (e.g., refresh replies)
		onAfterSubmit = undefined as undefined | (() => void),
		// Disable composer (e.g., require bet before commenting)
		disabled = false,
		disabledTooltip = 'You must place a bet to comment'
	} = $props<{
		user?: any;
		market_id?: string;
		parent_id?: string | null;
		onOptimisticAdd?: (row: any) => void;
		onOptimisticRemove?: (row: { id: string }) => void;
		onAfterSubmit?: () => void;
		disabled?: boolean;
		disabledTooltip?: string;
	}>();

	let open = $state(false);

	function onOpen() {
		if (disabled) return;
		if (!user) {
			redirectToLogin();
			return;
		}
		open = true;
	}

	function onDisabledClick() {
		if (disabled) {
			appToast.info(disabledTooltip);
		}
	}

	async function submit(content: string) {
		// optimistic insert of a top-level comment
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
			parent_id: parent_id,
			reply_count: 0,
			likes_count: 0,
			liked: false
		};

		// Only optimistically add for top-level comments where desired by parent
		if (!parent_id) onOptimisticAdd?.(temp);
		open = false;

		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id, content, parent_id })
			});
			if (!res.ok) throw new Error('Failed to post comment');
			onAfterSubmit?.();
			appToast.success('Comment added');
			// Optionally, parent can refresh; we keep optimistic until data reload.
		} catch (e) {
			if (!parent_id) onOptimisticRemove?.({ id: temp.id });
			console.error(e);
		}
	}
</script>

<div class="flex w-full items-start gap-2 py-4 {X_PADDING}">
	<div class="h-10 w-10 overflow-hidden rounded-full shrink-0">
		<AppImage src={user?.avatar_url || null} size={40} alt="avatar" />
	</div>

	{#if !open}
		{#if disabled}
			<button type="button" class="flex-1" onclick={onDisabledClick}>
				<div
					class="w-full text-left rounded-sm border border-border px-3 py-2 text-faint text-sm cursor-not-allowed opacity-70">
					You must place a bet to comment
				</div>
			</button>
		{:else}
			<button type="button" class="flex-1 text-left" onclick={onOpen}>
				<div class="w-full rounded-sm border border-border px-3 py-2 text-faint text-sm">Write a comment…</div>
			</button>
		{/if}
	{:else}
		<div class="flex-1">
			<ReplyComposer
				placeholder="Write a comment..."
				submitLabel="Comment"
				onSubmit={submit}
				onCancel={() => (open = false)}
			/>
		</div>
	{/if}
</div>
