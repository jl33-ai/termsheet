<script lang="ts">
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import Username from '$lib/ui/canonical/Username.svelte';
	import { formatDateShort, formatDateTime } from '$lib/date.ts';

	let { username, avatarUrl = null, joinedAt = null } = $props<{
		username: string;
		avatarUrl?: string | null;
		joinedAt?: string | Date | null;
	}>();

	const userObj = $derived({ username });
	const joined = $derived.by(() =>
		joinedAt ? { short: formatDateShort(joinedAt), full: formatDateTime(joinedAt) } : null
	);
</script>

<div class="flex gap-2 items-center">
	<AppImage src={avatarUrl} size={40} alt="avatar" />
	<div class="flex flex-col">
		<Username user={userObj} variant="black" />
		{#if joined}
			<span class="text-sm text-faint" title={joined.full}>Joined {joined.short}</span>
		{/if}
	</div>
</div>
