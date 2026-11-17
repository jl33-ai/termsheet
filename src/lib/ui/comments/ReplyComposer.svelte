<script lang="ts">
	import { page } from '$app/state';
	import { appToast } from '$lib/ui/toast.ts';
	import CommentAddedToast from '$lib/ui/comments/CommentAddedToast.svelte';

	let {
		placeholder = 'Write a reply...',
		submitLabel = 'Reply',
		maxLength = 280,
		onSubmit = undefined as undefined | ((content: string) => void | Promise<void>),
		onCancel = undefined as undefined | (() => void),
		autoFocus = true,
		// Optional avatar shown to the left when provided
		avatarUrl = undefined as string | null | undefined
	} = $props<{
		placeholder?: string;
		submitLabel?: string;
		maxLength?: number;
		onSubmit?: (content: string) => void | Promise<void>;
		onCancel?: () => void;
		autoFocus?: boolean;
		avatarUrl?: string | null;
	}>();

	let text = $state('');
	let submitting = $state(false);
	let inputEl = $state<HTMLTextAreaElement | null>(null);

	import { tick } from 'svelte';
	import { redirectToLogin } from '$lib/auth/client.ts';

	async function focusIfNeeded() {
		if (!autoFocus) return;
		await tick();
		inputEl?.focus();
		const v = inputEl?.value ?? '';
		inputEl?.setSelectionRange?.(v.length, v.length);
	}

	$effect(() => {
		void focusIfNeeded();
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			void submit();
			return;
		}
		if (e.key === 'Escape') {
			onCancel?.();
		}
	}

	async function submit() {
		const content = text.trim();
		if (!content || submitting) return;

		// Prefer parent-provided handler when available
		if (onSubmit) {
			submitting = true;
			try {
				await onSubmit(content);
				text = '';
			} finally {
				submitting = false;
			}
			return;
		}

		// Default behavior: if on the trade page with a main comment, reply to it
		const marketId = page.data?.market?.id;
		const parentCommentId = page.data?.comment?.id;
		const sessionUserId = page.data?.user?.id;

		if (!sessionUserId) {
			redirectToLogin();
			return;
		}

		if (marketId && parentCommentId) {
			submitting = true;
			try {
				const res = await fetch('/api/comments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ market_id: marketId, content, parent_id: parentCommentId })
				});
				if (!res.ok) {
					// Surface minimal error; do not throw to avoid breaking UX
					console.warn('Failed to post reply');
					return;
				}
				const row = await res.json().catch(() => ({} as any));
				text = '';
				// Success toast with link back to this transaction page
				const txId = (page.params?.id as string | undefined) || (page.data?.trade?.id as string | undefined) || null;
				if (txId) {
					appToast.success(CommentAddedToast as any, {
						props: {
							transactionId: txId,
							commentId: (row as any)?.id ?? null
						}
					});
				} else {
					appToast.success('Reply posted');
				}
			} catch (e) {
				console.warn('submit reply failed', e);
			} finally {
				submitting = false;
			}
			return;
		}
	}


	// Fallback to current logged-in user's avatar when no prop provided
	const pageUser = $derived(page.data?.user);
	const displayAvatarUrl = $derived.by(() =>
		avatarUrl !== undefined ? (avatarUrl ?? null) : (pageUser?.avatar_url ?? null)
	);
</script>

<div class="flex w-full items-start gap-2">
	<div class="flex-1">
    <textarea
			class=" min-h-16 w-full"
			bind:value={text}
			bind:this={inputEl}
			maxlength={maxLength}
			placeholder={placeholder}
			onkeydown={onKeydown}
		></textarea>
		<div class="mt-2 mb-3 flex items-center gap-2">
			<button
				class="rounded-sm border border-border px-3 py-2 text-sm font-medium text-title"
				type="button"
				onclick={submit}
				disabled={submitting}
			>{submitLabel}
			</button>
			<button
				class="text-sm text-muted app-text-button"
				type="button"
				onclick={() => onCancel?.()}
			>Cancel
			</button>
		</div>
		<slot />
		<!-- slot for additional actions if needed -->
		<style></style>
	</div>
</div>
