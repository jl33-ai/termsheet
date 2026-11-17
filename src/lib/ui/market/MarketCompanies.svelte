<script lang="ts">
	import { tooltip, tooltipContent } from '$lib/ui/tooltip.ts';
	import { appToast } from '$lib/ui/toast.ts';
    import type { CompanyLite } from '$lib/types';

	let {
		marketId,
		companies = undefined,
		class: className = '',
		nestedInsideLink = false
	}: {
		marketId?: string;
		companies?: CompanyLite[] | undefined;
		class?: string;
		nestedInsideLink?: boolean;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let data = $state<CompanyLite[]>([]);

	$effect(() => {
		error = null;
		if (Array.isArray(companies)) {
			data = companies;
			return;
		}
		if (!marketId) return;
		loading = true;
		const mid = marketId as string;
		void (async function run() {
			try {
				const res = await fetch(`/api/markets/${mid}/companies`);
				if (res.ok) {
					const json = await res.json();
					data = (json?.companies ?? []) as CompanyLite[];
				} else {
					error = 'Failed to load companies';
					appToast.error(error);
				}
			} catch (e) {
				error = 'Failed to load companies';
				appToast.error(error);
			} finally {
				loading = false;
			}
		})();
	});

	function companyUrl(company: CompanyLite) {
		return `/company/${encodeURIComponent(company.slug)}`;
	}

	function companyTooltip(company: CompanyLite) {
		const bio = company.bio?.trim();
		return bio || '';
	}

	function handleCompanyClick(e: MouseEvent, company: CompanyLite) {
		e.preventDefault();
		e.stopPropagation();
		window.location.href = companyUrl(company);
	}

	function handleCompanyKeydown(e: KeyboardEvent, company: CompanyLite) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			e.stopPropagation();
			window.location.href = companyUrl(company);
		}
	}
</script>

{#snippet CompanyLink({ company, isLast, nestedInsideLink }: { company: CompanyLite; isLast: boolean; nestedInsideLink: boolean })}
	{#if !nestedInsideLink}
		<a
			href={companyUrl(company)}
			class="hover-highlight hover:underline inline-block align-baseline"
			use:tooltip={companyTooltip(company)}
		>{company.name}</a>
		{#if !isLast}<span class="select-none">, </span>{/if}
	{:else}
		<span
			role="link"
			tabindex="0"
			class="hover-highlight hover:underline inline-block align-baseline cursor-pointer"
			use:tooltip={companyTooltip(company)}
			onclick={(e) => handleCompanyClick(e, company)}
			onkeydown={(e) => handleCompanyKeydown(e, company)}
		>{company.name}</span>
		{#if !isLast}<span class="select-none">, </span>{/if}
	{/if}
{/snippet}

{#if !loading && data.length > 0}
	<div class="{className} break-words text-title text-sm leading-normal">
		<div class="mb-1">
			<span class="font-medium text-accent mr-1">Companies:</span>
			{#each data as company, i (company.id)}
				{@render CompanyLink({ company, isLast: i === data.length - 1, nestedInsideLink })}
			{/each}
		</div>
	</div>
{/if}
