<script lang="ts">
	import { getCurrencySymbol } from '$lib/currency.ts';
	import type { OutcomeLike } from '$lib/types';
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import Username from '$lib/ui/canonical/Username.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import CopyLinkButton from '$lib/ui/canonical/CopyLinkButton.svelte';
	import { formatDateShortRelative, formatDateTime } from '$lib/date.ts';
	import OutcomeAmount from '$lib/ui/comments/OutcomeAmount.svelte';
	import LikeButton from '$lib/ui/canonical/LikeButton.svelte';
	import { X_PADDING } from '$lib/constant.ts';

	let {
		comment,
		onReply,
		outcomes = [],
		clickable = true,
		hoverHighlight = true,
		isNested = false,
		variant = 'default'
	} = $props<{
		comment: any;
		onReply?: () => void;
		outcomes?: OutcomeLike[];
		clickable?: boolean;
		hoverHighlight?: boolean;
		isNested?: boolean;
		variant?: 'default' | 'expanded';
	}>();

	// Element ref for scrolling
	let el: HTMLDivElement | null = null;

	const currency = getCurrencySymbol();

	const created = $derived.by(() =>
		comment?.created_at
			? { short: formatDateShortRelative(comment.created_at), full: formatDateTime(comment.created_at) }
			: null
	);

	async function goToComment(e?: MouseEvent) {
		e?.preventDefault?.();
		// If user is selecting text, do not navigate
		if (typeof window !== 'undefined') {
			const sel = window.getSelection?.();
			if (sel && sel.type === 'Range' && sel.toString().trim().length > 0) {
				return;
			}
		}
		let tx = (comment as any)?.transaction_id as string | undefined | null;
		// Fallback: resolve transaction_id by comment id when missing (older RPCs)
		if (!tx && (comment as any)?.id) {
			try {
				const res = await fetch(`/api/comments/${encodeURIComponent((comment as any).id)}`);
				if (res.ok) {
					const row = await res.json();
					tx = row?.transaction_id ?? null;
				}
			} catch {
			}
		}
		if (tx) goto(`/transaction/${encodeURIComponent(String(tx))}`);
	}

	// color now handled inside OutcomeAmount via outcomeColorHex

	// Treat as a comment row only if it clearly has comment-like fields
	const isCommentEntity = $derived.by(() => {
		const c = comment || {};
		return 'likes_count' in c || 'liked' in c || 'reply_count' in c || 'content' in c;
	});


	// Build a permalink that points to the trade page when possible
	const commentPermalink = $derived.by(() => {
		try {
			const cid = String(comment?.id ?? '').trim();
			const anchor = cid ? `#comment-${encodeURIComponent(cid)}` : '';
			const tx = (comment as any)?.transaction_id as string | undefined | null;
			if (tx) {
				return `/transaction/${encodeURIComponent(String(tx))}${anchor}`;
			}
			// Fallback to current page (e.g., market page) with anchor
			const base = `${page.url.pathname}${page.url.search}`;
			return `${base}${anchor}`;
		} catch {
			return '';
		}
	});


	// If URL hash matches this comment id, scroll into view and highlight with fade-out
	onMount(() => {
		if (typeof window === 'undefined') return;

		const maybeFocusFromHash = () => {
			const raw = window.location.hash || '';
			if (!raw) return;
			const h = (raw.startsWith('#') ? raw.slice(1) : raw).trim();
			if (!h) return;
			const decoded = decodeURIComponent(h);
			const targetId = decoded.startsWith('comment-') ? decoded.slice('comment-'.length) : decoded;
			if (targetId && comment?.id && String(targetId) === String(comment.id)) {
				// Start at top, then gently center this comment
				window.scrollTo({ top: 0 });
				const doScroll = () => {
					el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
					el?.classList.add('comment-highlight', 'comment-highlight-fade');
					setTimeout(() => {
						el?.classList.remove('comment-highlight-fade');
						el?.classList.remove('comment-highlight');
					}, 2200);
				};
				setTimeout(doScroll, 50);
				setTimeout(doScroll, 400); // fallback attempt after layout settles
			}
		};

		// Run on mount and on hash changes
		maybeFocusFromHash();
		window.addEventListener('hashchange', maybeFocusFromHash);
		return () => window.removeEventListener('hashchange', maybeFocusFromHash);
	});
</script>


<div
	class={`${X_PADDING} py-5 group grid grid-cols-[40px_1fr] gap-2 transition-colors duration-[140ms] ease-out ${hoverHighlight ? 'hover-highlight-secondary' : ''} ${clickable ? 'cursor-pointer' : ''} ${variant === 'expanded' ? 'rounded-sm px-2' : ''}`}
	id={comment?.id}
	bind:this={el}
	role={clickable ? 'link' : undefined}
	tabindex={clickable ? 0 : undefined}
	onclick={clickable ? goToComment : undefined}
	onkeydown={clickable ? ((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToComment(); } }) : undefined}
	style="scroll-margin-top: 72px;"
>
	<div class="mt-2 h-10 w-10 overflow-hidden rounded-full">
		<AppImage src={comment?.avatar_url || null} size={40} alt="avatar" />
	</div>
	<div>
		<div class="mb-0.5">
			<Username variant="black" user={comment} />
			{#if created}
				<span class="ml-1 text-sm text-faint" title={created.full}>{created.short}</span>
			{/if}
		</div>
		<p class="mt-0.5 leading-snug text-base text-sm">
			{#if comment?.outcome_name || comment?.amount_credits || comment?.shares}
				<OutcomeAmount
					outcomeId={comment?.outcome_id ?? null}
					outcomeName={comment?.outcome_name ?? null}
					amount={comment?.amount_credits ?? null}
					shares={comment?.shares ?? null}
					{outcomes}
					mode="compact"
				/>
			{/if}
			{#if comment?.content}
				<span>{comment?.content}</span>
			{/if}
		</p>
		{#if isCommentEntity}
			<div class="mt-3 flex items-center gap-3 text-sm text-muted">
				<LikeButton
					comment_id={comment.id}
					initialLikes={Number(comment?.likes_count ?? 0)}
					initialIsLiked={Boolean(comment?.liked)}
					onResult={(liked, likes_count) => {
						(comment as any).liked = liked;
						(comment as any).likes_count = likes_count;
					}}
				/>
				{#if onReply}
					<button
						class="inline-flex items-center gap-1 app-text-button"
						type="button"
						onclick={(e) => { e.stopPropagation(); onReply?.(); }}
					>
						<span>Reply</span>
					</button>
				{/if}

				<span class="opacity-0 group-hover:opacity-100" role="button" tabindex="0" onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
					<CopyLinkButton href={commentPermalink} title="Copy comment link" />
				</span>
			</div>
		{/if}
	</div>
</div>
