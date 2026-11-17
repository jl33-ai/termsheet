<script lang="ts">
	import UserIdentity from '$lib/ui/canonical/UserIdentity.svelte';
	import type { UserLite } from '$lib/types';

	let { user, showBorder = true } = $props<{
		user: UserLite;
		showBorder?: boolean;
	}>();

	const avatarUrl = $derived(user?.x_avatar_url ?? user?.avatar_url ?? null);
	const uname = $derived((user?.username ?? user?.x_username ?? '').toString());
	const xHandle = $derived((user?.x_username ?? null) as string | null);
	const joinedAt = $derived(user?.created_at ?? null);

	const correct = $derived(Number(user?.correct_bets_count ?? user?.correctBetsCount ?? 0));
	const pending = $derived(Number(user?.pending_bets_count ?? user?.pendingBetsCount ?? 0));
	const incorrect = $derived(Number(user?.incorrect_bets_count ?? user?.incorrectBetsCount ?? 0));

	const xUrl = $derived(xHandle ? `https://x.com/${xHandle}` : null);
</script>

<div
	class="group pb-8 hover-highlight-secondary transition-colors duration-[144ms] ease-out {showBorder ? 'border-b-[0.5px] border-border' : ''}">
	<div class="flex items-center justify-between gap-3">
		<UserIdentity username={uname} avatarUrl={avatarUrl} joinedAt={joinedAt} />
	</div>


	<div class="mt-4 ml-12 flex flex-col">
		<span class="text-base text-sm">
			{correct} correct prediction{correct !== 1 ? 's' : ''},
			{incorrect} wrong one{incorrect !== 1 ? 's' : ''},
			{pending} pending.
		</span>

		{#if xUrl}
			<a class="mt-4 app-button x-connect" href={xUrl} target="_blank" rel="noopener noreferrer">View on X</a>
		{/if}
	</div>
</div>
