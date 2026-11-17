<script lang="ts">
    import type { Market, MarketPanelSection } from '$lib/types';

	let { mode, section, normalizeProb, formatMoney, onClear, onSearchInput, onLink }: {
		mode: 'edit' | 'preview';
		section: MarketPanelSection;
		normalizeProb: (v: number | null | undefined) => number | null;
		formatMoney: (n: number | null) => string;
		onClear: () => void;
		onSearchInput: (v: string) => void;
		onLink: (a: Market) => void;
	} = $props();

	import Input from '$lib/ui/admin-page/Input.svelte';
	import Textarea from '$lib/ui/Textarea.svelte';
import Button from '$lib/ui/admin-page/Button.svelte';
import { appToast } from '$lib/ui/toast.ts';

	let activeIndex = $state(-1);
	const resultsLen = $derived(section?.searchResults?.length ?? 0);
	$effect(() => {
		if (activeIndex >= resultsLen) activeIndex = Math.max(-1, resultsLen - 1);
	});

	function handleFocus() {
		if (!section) return;
		const hasResults = (section.searchResults?.length ?? 0) > 0;
		const hasTerm = Boolean(section.searchTerm && section.searchTerm.length > 0);
		if (!hasResults && !hasTerm && !section.searching) {
			onSearchInput('');
		}
	}

	function moveActive(delta: number) {
		if (!resultsLen) return;
		if (activeIndex === -1) {
			activeIndex = delta > 0 ? 0 : resultsLen - 1;
			return;
		}
		activeIndex = (activeIndex + delta + resultsLen) % resultsLen;
	}

	function keyNav(e: KeyboardEvent) {
		if (!section) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			moveActive(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			moveActive(-1);
		} else if (e.key === 'Tab') {
			e.preventDefault();
			moveActive(e.shiftKey ? -1 : 1);
		} else if (e.key === 'Enter') {
			if (resultsLen > 0 && section.searchResults) {
				e.preventDefault();
				const picked = section.searchResults[activeIndex];
				if (picked) onLink(picked);
			}
		}
	}

	function handleInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		activeIndex = -1;
		onSearchInput(v);
	}

	// Create-new form state
	let createOpen = $state(false);
	let newTitle = $state('');
	let newResolution = $state('');
	let newImage = $state('');
	let newOdds = $state('');
	let creating = $state(false);
  let createError = $state<string | null>(null);

  async function createMarket() {
    createError = null;
    const title = newTitle.trim();
    if (!title) {
      createError = 'Title is required';
      appToast.warning(createError);
      return;
    }
		creating = true;
		try {
			const res = await fetch('/api/markets', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					title,
					image: newImage.trim() || undefined,
					resolution_criteria: newResolution.trim() || undefined,
					odds: newOdds ? Number(newOdds) : undefined
				})
			});
			if (!res.ok) throw new Error(`Create failed (${res.status})`);
			const data = await res.json();
			if (data?.market) {
				onLink(data.market);
				// reset form
				newTitle = '';
				newResolution = '';
				newImage = '';
				newOdds = '';
				createOpen = false;
			}
    } catch (e: any) {
      createError = e?.message ?? 'Failed to create market';
      appToast.error(createError);
    } finally {
      creating = false;
    }
  }
</script>

{#snippet LabeledInput({ label, value, placeholder = '', textarea = false, onInput }: { label: string; value: string; placeholder?: string; textarea?: boolean; onInput: (e: Event) => void })}
  <div>
    <label class="mb-1 block text-xs text-base">{label}</label>
    {#if textarea}
      <Textarea value={value} oninput={onInput} placeholder={placeholder} />
    {:else}
      <Input value={value} oninput={onInput} placeholder={placeholder} />
    {/if}
  </div>
{/snippet}

{#if section}
	{#if mode === 'edit'}
		<div class="text-sm leading-relaxed">
			<div class="mb-1 font-medium">Market</div>
			{#if section.market}
				<div class="mb-3 rounded-sm border border-border p-3">
					<div class="font-medium">{section.market.title}</div>
					{#if section.market.resolution_criteria}
						<div class="mt-1 whitespace-pre-wrap text-base">
							{section.market.resolution_criteria}
						</div>
					{/if}
					{#if (section.odds_at_time_of_writing ?? section.market.odds) != null}
						{@const p = normalizeProb(section.odds_at_time_of_writing ?? section.market.odds)}
						{#if p !== null && p > 0 && p < 1}
							<div class="mt-2">YES {p.toFixed(2)}</div>
							<div>$100 -> {formatMoney(100 / p)}</div>
							<div class="h-2"></div>
							<div>NO {(1 - p).toFixed(2)}</div>
							<div>$100 -> {formatMoney(100 / (1 - p))}</div>
						{/if}
					{/if}
					<div class="mt-2 flex justify-end">
						<Button variant="secondary" onclick={onClear}>Unlink</Button>
					</div>
				</div>
			{/if}
			<div class="grid gap-2">
				<Input
					value={section.searchTerm}
					oninput={handleInput}
					onkeydown={keyNav}
					onfocus={handleFocus}
					placeholder="Search markets"
				/>
				{#if section.searching}
					<div class="text-xs text-faint">Searching…</div>
				{/if}
				{#if (section.searchResults ?? []).length > 0}
					<ul class="max-h-64 overflow-auto" role="listbox">
						{#each section.searchResults as m, i}
								<li
									class="cursor-pointer py-1"
									role="option"
									data-active={i === activeIndex ? '1' : '0'}
									aria-selected={i === activeIndex}
									onclick={() => onLink(m)}
								>
								<div class="font-medium">{m.title}</div>
							</li>
						{/each}
					</ul>
				{/if}

				<div class="mt-2">
					<Button variant="secondary" onclick={() => (createOpen = !createOpen)}
						>{createOpen ? 'Cancel' : 'Create a new market'}</Button
					>
					{#if createOpen}
						<div class="mt-2 grid gap-2">
                    <!-- Inline errors replaced by toasts -->
							{@render LabeledInput({
								label: 'Title',
								value: newTitle,
								placeholder: 'e.g. Will X happen by Y?',
								onInput: (e: Event) => (newTitle = (e.target as HTMLInputElement).value)
							})}
							{@render LabeledInput({
								label: 'Resolution criteria',
								value: newResolution,
								placeholder: 'How the market resolves',
								onInput: (e: Event) => (newResolution = (e.target as HTMLTextAreaElement).value),
								textarea: true
							})}
							{@render LabeledInput({
								label: 'Image URL',
								value: newImage,
								placeholder: 'https://...',
								onInput: (e: Event) => (newImage = (e.target as HTMLInputElement).value)
							})}
							{@render LabeledInput({
								label: 'Initial odds (0–1)',
								value: newOdds,
								placeholder: '0.5',
								onInput: (e: Event) => (newOdds = (e.target as HTMLInputElement).value)
							})}
							<div>
								<Button onclick={createMarket} disabled={creating}
									>{creating ? 'Creating…' : 'Create market'}</Button
								>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else if section.market}
		<div class="text-sm leading-relaxed">
			<div class="font-medium">{section.market.title}</div>
			{#if section.market.resolution_criteria}
				<div class="mt-1 whitespace-pre-wrap text-base">
					{section.market.resolution_criteria}
				</div>
			{/if}
			{#if (section.odds_at_time_of_writing ?? section.market.odds) != null}
				{@const p = normalizeProb(section.odds_at_time_of_writing ?? section.market.odds)}
				{#if p !== null && p > 0 && p < 1}
					<div>YES {p.toFixed(2)}</div>
					<div>$100 -> {formatMoney(100 / p)}</div>
					<div class="h-2"></div>
					<div>NO {(1 - p).toFixed(2)}</div>
					<div>$100 -> {formatMoney(100 / (1 - p))}</div>
				{/if}
			{/if}
		</div>
	{/if}
{/if}
