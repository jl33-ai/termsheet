<script lang="ts">
	import BackWithText from '$lib/ui/canonical/BackWithText.svelte';
	// tooltips handled via Username component where needed
	import AppImage from '$lib/ui/canonical/AppImage.svelte';
	import Username from '$lib/ui/canonical/Username.svelte';
	import AccuracyKD from '$lib/ui/canonical/AccuracyKD.svelte';
	import SplitPane from '$lib/ui/layout/SplitPane.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { formatDateShort, formatDateTime } from '$lib/date';
	import { appToast } from '$lib/ui/toast.ts';
	import TransactionItem from '$lib/ui/transactions/TransactionItem.svelte';
	import { X_PADDING } from '$lib/constant.ts';
	import TabSwitch from '$lib/ui/TabSwitch.svelte';
	import XAuthButton from '$lib/ui/canonical/XAuthButton.svelte';
	import { page } from '$app/state';
	import IconAndText from '$lib/ui/canonical/IconAndText.svelte';
	import InfoTooltip from '$lib/ui/canonical/InfoTooltip.svelte';

	let { data } = $props();
	const profile = $derived(data.profile);
	const isOwner = $derived(!!data.isOwner);
	const trades_open = $derived(data.trades_open || []);
	const trades_closed = $derived(data.trades_closed || []);
	const trades_resolved = $derived(data.trades_resolved || []);
	const pinned = $derived(data.pinned || []);
	const pinned_ids = $derived(data.pinned_ids || []);

	let currentTab = $state<'Pinned' | 'Open' | 'Closed'>('Pinned');
	const trades_closed_all = $derived.by(() => {
		const a = Array.isArray(trades_closed) ? trades_closed : [];
		const b = Array.isArray(trades_resolved) ? trades_resolved : [];
		return [...a, ...b].sort((x: any, y: any) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
	});

	const tabOptions = $derived.by(() => {
		const opts: { value: 'Pinned' | 'Open' | 'Closed'; label: string; icon?: string }[] = [
			{ value: 'Pinned', label: 'Pinned', icon: 'bx:pin' }
		];
		// if (isOwner) {
		opts.push({ value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' });
		// }
		return opts;
	});

	$effect(() => {
		const allowed = tabOptions.map((o) => o.value);
		if (!allowed.includes(currentTab)) currentTab = 'Pinned';
	});

	const displayUsername = $derived.by(() => (profile ? (profile.username ?? profile.x_username ?? '') : ''));
	let usernameEdit = $state(displayUsername);
	let usernameEditing = $state(false);
	let saving = $state(false);
	let unameError = $state('');

	// Bio editing
	const bioText = $derived.by(() => (profile?.bio || '').trim());
	let bioEdit = $state((profile?.bio ?? '') as string);
	let bioEditing = $state(false);
	let bioSaving = $state(false);
	let bioError = $state('');


	let pinLoading: Record<string, boolean> = $state({});

	const joined = $derived.by(() => {
		const ts = profile?.created_at;
		return ts ? { short: formatDateShort(ts), full: formatDateTime(ts) } : null;
	});

	function onUsernameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveUsername();
		if (e.key === 'Escape') cancelUsernameEdit();
	}

	function startUsernameEdit() {
		unameError = '';
		usernameEdit = displayUsername;
		usernameEditing = true;
	}

	function cancelUsernameEdit() {
		usernameEdit = displayUsername;
		usernameEditing = false;
	}

	async function saveUsername() {
		if (!usernameEdit) return;
		saving = true;
		unameError = '';
		try {
			const res = await fetch('/api/user/username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: usernameEdit })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update username');
			}
			await res.json();
			appToast.success('Username updated!');
			// Navigate to the new handle if it changed
			const newPath = `/${usernameEdit}`;
			if (window.location.pathname !== newPath) {
				// Important: navigate first and invalidate within goto to avoid
				// briefly reloading the old URL (which now 404s) before redirecting.
				await goto(newPath, { replaceState: true, invalidateAll: true });
			}
			usernameEditing = false;
		} catch (e: any) {
			unameError = e.message;
			appToast.error(unameError);
		} finally {
			saving = false;
		}
	}

	function onBioKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveBio();
		if (e.key === 'Escape') cancelBioEdit();
	}

	function startBioEdit() {
		bioError = '';
		bioEdit = (profile?.bio ?? '') as string;
		bioEditing = true;
	}

	function cancelBioEdit() {
		bioEdit = (profile?.bio ?? '') as string;
		bioEditing = false;
	}

	async function saveBio() {
		const v = (bioEdit || '').trim();
		bioSaving = true;
		bioError = '';
		try {
			const res = await fetch('/api/user/bio', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bio: v })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Failed to update bio');
			}
			await res.json();
			appToast.success('Bio updated!');
			bioEditing = false;
			await invalidateAll();
		} catch (e: any) {
			bioError = e.message;
			appToast.error(bioError);
		} finally {
			bioSaving = false;
		}
	}

	async function logout() {
		try {
			await fetch('/auth/logout', { method: 'POST' });
		} finally {
			invalidateAll();
			goto('/');
		}
	}

	async function pinTx(id: string) {
		if (!isOwner) return;
		pinLoading[id] = true;
		try {
			const res = await fetch('/api/user/pins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transaction_id: id })
			});
			if (!res.ok) throw new Error('Failed to pin');
			appToast.success('Pinned');
			await invalidateAll();
		} catch (e: any) {
			appToast.error(e?.message || 'Failed to pin');
		} finally {
			pinLoading[id] = false;
		}
	}

	async function unpinTx(id: string) {
		if (!isOwner) return;
		pinLoading[id] = true;
		try {
			const res = await fetch(`/api/user/pins/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to unpin');
			appToast.success('Unpinned');
			await invalidateAll();
		} catch (e: any) {
			appToast.error(e?.message || 'Failed to unpin');
		} finally {
			pinLoading[id] = false;
		}
	}

</script>


<SplitPane>
	{#snippet leftHeader()}
		<BackWithText text={profile.username} />
	{/snippet}
	{#snippet left()}
		<div class="w-full">
			<div class="{X_PADDING} py-6 flex flex-col items-start">
				<AppImage src={profile?.x_avatar_url || null} size={72} alt="avatar" />
				<div class="flex items-center gap-2 mt-4">
					{#if isOwner && usernameEditing}
						<div class="w-48">
							<input
								class="w-full"
								bind:value={usernameEdit}
								maxlength="20"
								placeholder="username"
								onkeydown={onUsernameKeydown}
							/>
							<div class="mt-1 flex items-center gap-2">
								<button class="app-button primary" disabled={saving} onclick={saveUsername}
								>{saving ? 'Saving…' : 'Save'}</button>
								<button class="app-button" onclick={cancelUsernameEdit}>Cancel</button>
							</div>
						</div>
					{:else}
						<Username extraClass="text-lg" user={profile} />
						{#if isOwner}
							<button class="translate-y-[1px] text-xs text-faint hover:underline" onclick={startUsernameEdit}>Edit
							</button>
						{/if}
					{/if}
				</div>

				{#if profile}
					<AccuracyKD
						correct={Number(profile.correct_bets_count ?? 0)}
						pending={Number(profile.pending_bets_count ?? 0)}
						incorrect={Number(profile.incorrect_bets_count ?? 0)}
						showZeros={true}
						verbose
					/>
				{/if}

				<div class="flex flex-col gap-1 mt-4">
					{#if isOwner && bioEditing}
						<div>
							<textarea
								class="w-full"
								rows={3}
								bind:value={bioEdit}
								placeholder="Add a short bio"
								onkeydown={onBioKeydown}
							/>
							<div class="mt-1 flex items-center gap-2">
								<button class="app-button primary" disabled={bioSaving} onclick={saveBio}
								>{bioSaving ? 'Saving…' : 'Save'}</button>
								<button class="app-button" onclick={cancelBioEdit}>Cancel</button>
							</div>
						</div>
					{:else}
						{#if bioText}
							<div class="text-base text-xs whitespace-pre-line">
								{bioText}
								{#if isOwner}
									<button class="text-xs text-faint hover:underline ml-2" title="Edit bio" onclick={startBioEdit}>Edit
									</button>
								{/if}
							</div>
						{:else}
							{#if isOwner}
								<button class="text-xs text-faint hover:underline self-start" onclick={startBioEdit}>Add a bio</button>
							{/if}
						{/if}
					{/if}
				</div>
			</div>

			<div class="">
				<TabSwitch bind:value={currentTab} options={tabOptions} />

				<div class="flex flex-col">
					{#if currentTab === 'Pinned'}
						{#if pinned && pinned.length > 0}
							{#each pinned as p (p.transaction_id)}
								<TransactionItem
									trade={{
							id: p.transaction_id,
							market_id: p.market_id,
							market_question: p.market_question,
							outcome_id: p.outcome_id,
							outcome_name: p.outcome_name,
							outcome_color_hex: p.outcome_color_hex,
							outcome_index_id: (p as any)?.outcome_index_id ?? null,
							amount_credits: p.amount_credits != null ? Number(p.amount_credits) : null,
							created_at: p.tx_created_at,
							comment_content: p.comment_content,
						}}
									isOwner={isOwner}
									isPinned={true}
									loading={Boolean(pinLoading[p.transaction_id])}
									onUnpin={(id) => unpinTx(id)}
								/>
							{/each}
						{:else}
							<IconAndText icon="bx:bar-chart-alt-2" text="No pinned transactions."></IconAndText>
						{/if}
					{:else if currentTab === 'Open'}
						{#if trades_open && trades_open.length > 0}
							{#each trades_open as t (t.id)}
								<TransactionItem
									trade={{
							id: t.id,
							market_id: t.market_id,
							market_question: t.market_question,
							outcome_id: t.outcome_id,
							outcome_name: t.outcome_name,
							outcome_color_hex: t.outcome_color_hex,
							outcome_index_id: (t as any)?.outcome_index_id ?? null,
							amount_credits: t.amount_credits != null ? Number(t.amount_credits) : null,
							created_at: t.created_at,
							comment_content: t.comment_content,
						}}
									isOwner={isOwner}
									isPinned={(pinned_ids || []).includes(t.id)}
									loading={Boolean(pinLoading[t.id])}
									onPin={(id) => pinTx(id)}
									onUnpin={(id) => unpinTx(id)}
								/>
							{/each}
						{:else}
							<IconAndText icon="bx:bar-chart-alt-2" text="No open transactions."></IconAndText>
						{/if}
					{:else}
						{#if trades_closed_all && trades_closed_all.length > 0}
							{#each trades_closed_all as t (t.id)}
								<TransactionItem
									trade={{
							id: t.id,
							market_id: t.market_id,
							market_question: t.market_question,
							outcome_id: t.outcome_id,
							outcome_name: t.outcome_name,
							outcome_color_hex: t.outcome_color_hex,
							outcome_index_id: (t as any)?.outcome_index_id ?? null,
							amount_credits: t.amount_credits != null ? Number(t.amount_credits) : null,
							created_at: t.created_at,
							comment_content: t.comment_content,
						}}
									isOwner={isOwner}
									isPinned={(pinned_ids || []).includes(t.id)}
									loading={Boolean(pinLoading[t.id])}
									onPin={(id) => pinTx(id)}
									onUnpin={(id) => unpinTx(id)}
								/>
							{/each}
						{:else}
							<IconAndText icon="bx:bar-chart-alt-2" text="No closed transactions."></IconAndText>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/snippet}
	{#snippet right()}
		<div class="mt-8 w-full p-3 flex flex-col gap-2">

			<span class="inline">
			{#if joined}
				<span class="text-sm text-faint" title={joined.full}>Joined on {joined.short}</span>
			{/if}
				<InfoTooltip text="All bets are public and immutable."/>
			</span>

			{#if profile?.x_username}
				<a
					class="app-button x-connect"
					href={`https://x.com/${profile.x_username}`}
					target="_blank"
					rel="noopener noreferrer">View on X</a>
			{/if}

			{#if isOwner}
				<button class="app-button" onclick={logout}>Logout</button>
			{:else if !page.data?.session?.user}
				<XAuthButton class="app-button" />
			{/if}
		</div>
	{/snippet}
</SplitPane>
