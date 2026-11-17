<script lang="ts">
    import { tooltip, tooltipContent } from '$lib/ui/tooltip.ts';
    import type { ExternalLinkRow } from '$lib/types';

	let {
		marketId,
		links = undefined,
		class: className = '',
		nestedInsideLink = false // when true, render non-anchor chips safe for nesting
    }: {
        marketId?: string;
        links?: ExternalLinkRow[] | undefined;
        class?: string;
        nestedInsideLink?: boolean;
    } = $props();

    import { appToast } from '$lib/ui/toast.ts';
    let loading = $state(false);
    let error = $state<string | null>(null);
	let data = $state<ExternalLinkRow[]>([]);

	$effect(() => {
        error = null;
        if (Array.isArray(links)) {
            data = links;
            return;
        }
        if (!marketId) return;
        loading = true;
        const mid = marketId as string;
        void (async function run() {
            try {
                const res = await fetch(`/api/markets/${mid}/external-links`);
                if (res.ok) {
                    const json = await res.json();
                    data = (json?.external_links ?? []) as ExternalLinkRow[];
                } else {
                    error = 'Failed to load sources';
                    appToast.error(error);
                }
            } catch (e) {
                error = 'Failed to load sources';
                appToast.error(error);
            } finally {
                loading = false;
            }
        })();
    });

	const ORDER: Array<ExternalLinkRow['source']> = ['x', 'hackernews', 'website'];
	const LABEL: Record<ExternalLinkRow['source'], string> = {
		x: 'X',
		hackernews: 'HN',
		website: 'Source'
	};

	function asSource(val: any): ExternalLinkRow['source'] | null {
		const s = Array.isArray(val) ? val[0] : val;
		if (s === 'x' || s === 'hackernews' || s === 'website') return s;
		return null;
	}

	function groupBySource(list: ExternalLinkRow[]) {
		const groups: Record<ExternalLinkRow['source'], ExternalLinkRow[]> = { x: [], hackernews: [], website: [] };
		for (const it of list) {
			const key = asSource((it as any).source);
			if (!key) continue;
			groups[key].push({ ...it, source: key });
		}
		return groups;
	}

	function labelForLink(l: ExternalLinkRow) {
		try {
			const url = new URL(l.url);
			return url.hostname.replace(/^www\./, '');
		} catch {
			return 'Link';
		}
	}

	function displayLabel(l: ExternalLinkRow) {
		const lbl = (l.label || '').trim();
		if (lbl) return lbl;
		const u = (l.author_username || '').trim();
		if (u) return u.startsWith('@') ? u : `@${u}`;
		return labelForLink(l);
	}

	function authorTitle(l: ExternalLinkRow) {
		const uRaw = (l.author_username ?? '').trim();
		const u = uRaw ? (uRaw.startsWith('@') ? uRaw : `@${uRaw}`) : '';
		const lbl = (l.label ?? '').trim();
		if (u && lbl) return `${u} ${lbl}`;
		return u || lbl || '';
	}

	function contentOrFallback(l: ExternalLinkRow) {
		const c = (l.content ?? '').toString().trim();
		return c ? c : 'No content provided';
	}

	function openExternal(url: string) {
		window.open(url, '_blank', 'noopener');
	}

	function handleLinkClick(e: MouseEvent, url: string) {
		e.preventDefault();
		e.stopPropagation();
		openExternal(url);
	}

	function handleLinkKeydown(e: KeyboardEvent, url: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			openExternal(url);
		}
	}

	const groups = $derived.by(() => groupBySource(data));
</script>

{#snippet SourceLink({ l, isLast, nestedInsideLink }: { l: ExternalLinkRow; isLast: boolean; nestedInsideLink: boolean })}
	{#if !nestedInsideLink}
		<a
			href={l.url}
			target="_blank"
			rel="noopener noreferrer"
			class="hover-highlight hover:underline inline-block align-baseline"
			use:tooltip={tooltipContent(authorTitle(l), contentOrFallback(l))}
			>{displayLabel(l)}</a>
		{#if !isLast}<span class="select-none">, </span>{/if}
	{:else}
		<span
			role="link"
			tabindex="0"
			class="hover-highlight hover:underline inline-block align-baseline cursor-pointer"
			use:tooltip={tooltipContent(authorTitle(l), contentOrFallback(l))}
			onclick={(e) => handleLinkClick(e, l.url)}
			onkeydown={(e) => handleLinkKeydown(e, l.url)}
			>{displayLabel(l)}</span>
		{#if !isLast}<span class="select-none"> </span>{/if}
	{/if}
{/snippet}

{#if !loading && data.length > 0}
	<div class="{className} break-words text-title text-sm leading-normal">
		{#each ORDER as src (src)}
			{#if groups[src]?.length}
				<div class="mb-1">
					<span class="font-medium text-accent mr-1">{LABEL[src]}:</span>
					{#each groups[src] as l, i (l.id)}
						{@render SourceLink({ l, isLast: i === groups[src].length - 1, nestedInsideLink })}
					{/each}
				</div>
			{/if}
		{/each}
	</div>
{/if}
