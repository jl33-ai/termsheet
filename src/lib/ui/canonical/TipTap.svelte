<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, posToDOMRect } from '@tiptap/core';
	import { StarterKit } from '@tiptap/starter-kit';
	import BubbleMenu from '@tiptap/extension-bubble-menu';
	import { MarketLink } from '$lib/editor/marketLink.ts';
	import '$lib/editor/tiptap.css';
	import { slugify } from '$lib/helpers.ts';
	import { fetchOutcome } from '$lib/helpers.ts';
    import { appToast } from '$lib/ui/toast.ts';

	// Props: content (HTML string), onUpdate(html), contractId for leg creation
	let {
		content = '',
		onUpdate = (html: string) => {},
		contractId = '',
		getOutcomeById,
		getPriceForOutcomeId,
		onHoverOutcome
	} = $props<{
		content?: string;
		onUpdate?: (html: string) => void;
		contractId?: string;
		getOutcomeById: (id: string) => Promise<import('$lib/types').OutcomeDetail | null>;
		getPriceForOutcomeId: (id: string) => Promise<number | null>;
		onHoverOutcome?: (p: { outcomeId: string; top: number; left: number } | null) => void;
	}>();

	let bubbleMenu = $state<HTMLDivElement | null>(null);
	let element = $state<HTMLElement | null>(null);
	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let suppressUpdate = false;
	// search state
	let q = $state('');
	let results = $state<any[]>([]);
	let outcomes = $state<any[]>([]);
	let selectedMarket = $state<any>(null);
	let selectedOutcomeId = $state<string | null>(null);
	let outcomeDetail = $state<import('$lib/types').OutcomeDetail | null>(null);
	let bubbleMode = $state<'view' | 'search'>('search');
	let createOpen = $state(false);
	let newTitle = $state('');
	let newResolution = $state('');
	let newImage = $state('');
	let newOutcomeLabel = $state('');
	let newOutcomeCode = $state('');
	let creating = $state(false);
	let createError = $state<string | null>(null);
	let searching = $state(false);

	function debounce<T extends (...args: any[]) => void>(fn: T, delay = 250) {
		let t: any;
		return (...args: Parameters<T>) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...args), delay);
		};
	}

	const runSearch = debounce(async () => {
		searching = true;
		try {
			const url = `/api/markets?search=${encodeURIComponent(q)}`;
			const res = await fetch(url);
			const data = await res.json();
			results = data.markets ?? [];
		} catch {
			results = [];
		} finally {
			searching = false;
		}
	}, 300);

	const debouncedAnnotate = debounce(async () => {
		await annotatePrices();
	}, 300);

	async function annotatePrices() {
		const root = element as HTMLElement | null;
		if (!root) return;
		const spans = Array.from(root.querySelectorAll('span[data-outcome-id]')) as HTMLElement[];
		if (!spans.length) return;
		const unique = Array.from(
			new Set(spans.map((s) => s.getAttribute('data-outcome-id') || '').filter(Boolean))
		);
		const prices = await Promise.all(unique.map((id) => getPriceForOutcomeId(id)));
		const byId = new Map<string, number | null>();
		unique.forEach((id, i) => byId.set(id, prices[i] ?? null));
		// Update mark attributes in document so TipTap preserves them across renders
		const ed = editorState.editor;
		if (ed) {
			for (const id of unique) {
				const p = byId.get(id);
				const val = p != null && isFinite(p) ? String(Number(p).toFixed(2)) : null;
				ed.commands.setLastPriceForOutcome({ outcome_id: id, last_price: val });
			}
		}
	}

	function onQueryInput() {
		runSearch();
	}

	async function loadOutcomes(marketId: string) {
		const res = await fetch(`/api/markets/${marketId}/outcomes`);
		const data = await res.json();
		outcomes = data.outcomes ?? [];
	}

	async function selectMarket(m: any) {
		selectedMarket = m;
		outcomes = [];
		// Dome API market: expose its two sides as selectable outcomes
		if (m?.source === 'dome') {
			const list: any[] = [];
			if (m?.side_a?.id && m?.side_a?.label) list.push({ _dome: true, side: m.side_a });
			if (m?.side_b?.id && m?.side_b?.label) list.push({ _dome: true, side: m.side_b });
			outcomes = list;
			return;
		}
		// Internal market: fetch outcomes from backend
		if (m?.id) await loadOutcomes(m.id);
	}

	async function selectOutcome(o: any) {
		try {
			let outcomeId = o?.id as string | null;
			// If this is a Dome side selection, create/reuse an outcome by external_ref (side id)
			if (o?._dome && o?.side?.id && o?.side?.label) {
				const label: string = o.side.label;
				const code = slugify(label);
				const res = await fetch('/api/outcomes', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ label, code, external_ref: o.side.id, status: 'trading' })
				});
				const data = await res.json();
				outcomeId = data?.outcome?.id ?? null;
			}

			if (outcomeId) {
				await fetch('/api/legs', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ contract_id: contractId, outcome_id: outcomeId })
				});
				editorState
					.editor!.chain()
					.focus()
					.extendMarkRange('marketLink')
					.setMark('marketLink', { outcome_id: outcomeId })
					.run();
				selectedOutcomeId = outcomeId;
				// show current link details
				try {
					outcomeDetail = await getOutcomeById(outcomeId);
					bubbleMode = outcomeDetail ? 'view' : 'search';
				} catch {}
			}
		} catch {}
		selectedMarket = null;
		q = '';
		results = [];
		outcomes = [];
	}

	async function createMarketAndOutcome() {
		createError = null;
		const title = newTitle.trim();
		const label = newOutcomeLabel.trim();
		const code = newOutcomeCode.trim();
		if (!title) {
			createError = 'Title required';
			appToast.warning(createError);
			return;
		}
		if (!label || !code) {
			createError = 'Outcome label and code required';
			appToast.warning(createError);
			return;
		}
		creating = true;
		try {
			// Create market
			const res1 = await fetch('/api/markets', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					title,
					resolution_criteria: newResolution.trim() || undefined,
					image: newImage.trim() || undefined
				})
			});
			if (!res1.ok) throw new Error(`Create market failed (${res1.status})`);
			const mk = await res1.json();
			const marketId = mk?.market?.id;
			if (!marketId) throw new Error('No market id');
			// Create outcome
			const res2 = await fetch(`/api/markets/${marketId}/outcomes`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ label, code })
			});
			if (!res2.ok) throw new Error(`Create outcome failed (${res2.status})`);
			const ok = await res2.json();
			const outcome = ok?.outcome;
			if (!outcome?.id) throw new Error('No outcome id');
			// Link selection
			await selectOutcome(outcome);
			// reset and close
			newTitle = newResolution = newImage = newOutcomeLabel = newOutcomeCode = '';
			createOpen = false;
		} catch (e: any) {
			createError = e?.message ?? 'Failed to create market';
			appToast.error(createError);
		} finally {
			creating = false;
		}
	}

	onMount(() => {
		editorState.editor = new Editor({
			element: element!,
			extensions: [
				StarterKit,
				MarketLink,
				BubbleMenu.configure({
					element: bubbleMenu!,
                tippyOptions: {
                    duration: 0,
                    placement: 'top',
                    theme: 'app',
                    moveTransition: 'transform 0.12s ease',
                    appendTo: () => document.body as any,
                    interactive: true
                },
					getReferenceClientRect: (opts: any) => {
						const { editor } = opts;
						const { from, to } = editor.state.selection;
						return posToDOMRect(editor.view, from, to);
					},
					shouldShow: (opts: any) => {
						const { editor, state, view } = opts;
						if (!editor.isEditable || !view?.hasFocus?.()) return false;
						const sel = state.selection;
						if (!sel.empty) return true; // non-empty selection
						// Caret: show only if caret is within a marketLink mark
						const marks = (state.storedMarks || sel.$from.marks()) ?? [];
						return marks.some((m: any) => m.type?.name === 'marketLink');
					}
				} as any)
			],
			content: content || '<p></p>',
			onTransaction: ({ editor }) => {
				// Emit HTML on every transaction without re-rendering menu
				if (!suppressUpdate) {
					try {
						onUpdate(editor.getHTML());
					} catch {}
				}
				debouncedAnnotate();
				try {
					const attrs = editor.getAttributes('marketLink') as any;
					const oid = attrs?.outcome_id || null;
					if (oid) {
						selectedOutcomeId = oid;
						fetchOutcome(oid).then((d) => {
							outcomeDetail = d ?? null;
							bubbleMode = outcomeDetail ? 'view' : 'search';
							// reset any search state when focusing a link
							selectedMarket = null;
							q = '';
							results = [];
							outcomes = [];
						});
					} else {
						outcomeDetail = null;
						bubbleMode = 'search';
					}
				} catch {}
			}
		});
	});

	$effect(() => {
		// When content prop changes, re-annotate after it is set
		debouncedAnnotate();
	});

	// Keep editor content in sync when `content` prop changes (e.g., after load)
	$effect(() => {
		const ed = editorState.editor;
		if (!ed) return;
		const incoming = content || '<p></p>';
		const current = ed.getHTML();
		// If current is the empty paragraph or differs from incoming, sync
		const isEmpty = current.replace(/\s+/g, '') === '<p></p>';
		if (incoming !== current || (isEmpty && incoming.trim().length > 0)) {
			suppressUpdate = true;
			ed.commands.setContent(incoming, false as any);
			suppressUpdate = false;
		}
	});

	onDestroy(() => {
		editorState.editor?.destroy();
	});

	function handleMouseOver(e: MouseEvent) {
		const el = element as HTMLElement | null;
		if (!el) return;
		const t = e.target as HTMLElement | null;
		if (!t) return;
		const span = t.closest('span[data-outcome-id]') as HTMLElement | null;
		if (!span) {
			onHoverOutcome?.(null);
			return;
		}
		const rect = span.getBoundingClientRect();
		const base = el.getBoundingClientRect();
		const top = rect.top - base.top;
		const left = rect.left - base.left;
		const outcomeId = span.getAttribute('data-outcome-id') || '';
		if (outcomeId) onHoverOutcome?.({ outcomeId, top, left });
	}

	function handleMouseOut(e: MouseEvent) {
		const el = element as HTMLElement | null;
		if (!el) {
			onHoverOutcome?.(null);
			return;
		}
		const to = (e.relatedTarget as HTMLElement) || null;
		if (!to || !el.contains(to)) onHoverOutcome?.(null);
	}
</script>

<div style="position: relative" class="app">
	{#if editorState.editor}
		<!--    <div class="fixed-menu">-->
		<!--      <button onclick={() => editorState.editor!.chain().focus().toggleHeading({ level: 1 }).run()} class:active={editorState.editor!.isActive('heading', { level: 1 })}>H1</button>-->
		<!--      <button onclick={() => editorState.editor!.chain().focus().toggleHeading({ level: 2 }).run()} class:active={editorState.editor!.isActive('heading', { level: 2 })}>H2</button>-->
		<!--      <button onclick={() => editorState.editor!.chain().focus().setParagraph().run()} class:active={editorState.editor!.isActive('paragraph')}>P</button>-->
		<!--    </div>-->
	{/if}

	<div
		bind:this={element}
		class="tiptap"
		onmouseover={handleMouseOver}
		onmouseout={handleMouseOut}
	></div>

	<!-- Bubble menu for linking selection to markets -->
	<div class="bubble-menu" bind:this={bubbleMenu}>
		{#if editorState.editor}
			<div class="linker">
				{#if bubbleMode === 'view' && outcomeDetail}
					<div class="current">
						<!--						<div class="hint">Linked outcome</div>-->
						<div class="curr-title">
							{outcomeDetail.market?.title ?? outcomeDetail.market?.resolution_criteria ?? ''}
						</div>
						<div class="curr-label">{outcomeDetail.label}</div>
						{#if outcomeDetail.last_price != null}
							<div class="hint">Last price: {outcomeDetail.last_price}</div>
						{/if}
						<div class="row">
							<button
								onclick={() => {
									bubbleMode = 'search';
									selectedMarket = null;
									q = '';
									results = [];
									outcomes = [];
								}}>Change link</button
							>
							<button
								onclick={() => {
									editorState
										.editor!.chain()
										.focus()
										.extendMarkRange('marketLink')
										.unsetMark('marketLink')
										.run();
									outcomeDetail = null;
									selectedOutcomeId = null;
									bubbleMode = 'search';
								}}>Unlink</button
							>
						</div>
					</div>
				{:else if !selectedMarket}
					<input
						placeholder="Search markets"
						bind:value={q}
						oninput={onQueryInput}
						onfocus={onQueryInput}
					/>
					{#if searching}
						<div class="hint">Searching…</div>
					{/if}
					{#if results.length > 0}
						<ul>
							{#each results as m}
								<li>
									<button onclick={() => selectMarket(m)}>{m.title}</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if !searching && results.length === 0}
						<div class="hint">No results</div>
					{/if}
					<div class="row">
						<button onclick={() => (createOpen = !createOpen)}
							>{createOpen ? 'Cancel' : 'Create new market'}</button
						>
					</div>
					{#if createOpen}
						<div class="create">
					<!-- Inline errors replaced by toasts -->
							<input placeholder="Title" bind:value={newTitle} />
							<textarea placeholder="Resolution criteria" bind:value={newResolution} />
							<input placeholder="Image URL" bind:value={newImage} />
							<div class="row">
								<input placeholder="Outcome label" bind:value={newOutcomeLabel} />
								<input placeholder="Outcome code" bind:value={newOutcomeCode} />
							</div>
							<div class="row">
								<button onclick={createMarketAndOutcome} disabled={creating}
									>{creating ? 'Creating…' : 'Create & link'}</button
								>
							</div>
						</div>
					{/if}
				{:else}
					<div class="hint">Select outcome for “{selectedMarket.title}”</div>
					{#if outcomes.length > 0}
						<ul>
							{#each outcomes as o}
								{@const label = o?.label ?? o?.side?.label}
								<li>
									<button onclick={() => selectOutcome(o)}>{label}</button>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="hint">No outcomes</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	button.active {
		background: black;
		color: white;
	}

	.bubble-menu {
		background: white;
		border: 1px solid #ddd;
		padding: 0.5rem;
		border-radius: 4px;
		/* hidden until tippy shows it */
		visibility: hidden;
		opacity: 0;
	}
	.tippy-box .bubble-menu {
		visibility: visible;
		opacity: 1;
	}

	.bubble-menu input {
		width: 16rem;
	}

	.bubble-menu ul {
		max-height: 12rem;
		overflow: auto;
		margin: 0.25rem 0;
	}

	.bubble-menu li {
		padding: 0.125rem 0;
	}

	.bubble-menu .hint {
		color: #666;
		font-size: 0.85rem;
	}

	.bubble-menu .row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
</style>
