<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import XAuthButton from '$lib/ui/canonical/XAuthButton.svelte';
	import { appToast } from '$lib/ui/toast.ts';
	import MarketOpsWidget from '$lib/ui/admin/MarketOpsWidget.svelte';
	import RecentMarketsWidget from '$lib/ui/admin/RecentMarketsWidget.svelte';
	import SeedDatabaseWidget from '$lib/ui/admin/SeedDatabaseWidget.svelte';
	import CloseResolveWidget from '$lib/ui/admin/CloseResolveWidget.svelte';
	import MarketCompaniesWidget from '$lib/ui/admin/MarketCompaniesWidget.svelte';
	import CreateMarketWidget from '$lib/ui/admin/CreateMarketWidget.svelte';
	import CreateCompanyWidget from '$lib/ui/admin/CreateCompanyWidget.svelte';
	import { DEFAULT_MARKET_TEMPLATES } from '$lib/config/default-markets';
	import { companies as companiesStore, refreshCompanies } from '$lib/stores/companies';
	import type { LayoutData } from '../../../.svelte-kit/types/src/routes/$types';
	import { copyMarketId } from './helpers.ts';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// ======== Recent Markets Widget ========
	let recentMarkets = $state<{ id: string, question: string, created_at: string }[]>([]);
	let loadingRecentMarkets = $state(false);


	async function loadRecentMarkets() {
		loadingRecentMarkets = true;
		try {
			const res = await fetch('/api/markets');
			if (!res.ok) throw new Error('Failed to load recent markets');
			const data = await res.json();
			recentMarkets = data.markets || [];
		} catch (e: any) {
			appToast.error('Failed to load recent markets: ' + e.message);
		} finally {
			loadingRecentMarkets = false;
		}
	}


	function fillMarketId(marketId: string, target: 'close' | 'resolve' | 'link') {
		if (target === 'close') {
			closeMarketId = marketId;
		} else if (target === 'resolve') {
			resolveMarketId = marketId;
			loadResolveOutcomes();
		} else if (target === 'link') {
			linkMarketId = marketId;
			loadMarketCompanies();
		}
		appToast.success('Market ID filled!');
	}

	// ======== Company Form ========
	let companyName = $state('');
	let companySlug = $state('');
	let companyBio = $state('');
	let companyLogoUrl = $state('');
	// Default market templates selection (none selected by default)
	const defaultTemplates = DEFAULT_MARKET_TEMPLATES;
	let selectedDefaultTemplates = $state<number[]>([]);
	let companyLoading = $state(false);
	let companyError = $state('');
	let companySuccess = $state('');
	let success_company_id = $state('');
	let success_company_url = $state('');

	async function handleCompanySubmit(e: Event) {
		e.preventDefault();
		companyLoading = true;
		companyError = '';
		companySuccess = '';

		try {
			// normalize inputs
			const name = companyName.trim();
			const slug = companySlug.trim();
			const bio = companyBio.trim();
			const logo = companyLogoUrl.trim();
			const res = await fetch('/api/companies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					slug,
					bio,
					logo_url: logo || null,
					default_market_indexes: selectedDefaultTemplates
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to create company');
			}
			const result = await res.json();
			const marketsText = result.markets_created ? ` ${result.markets_created} default markets created.` : '';
			companySuccess = `Company created successfully!${marketsText}`;
			appToast.success(companySuccess);

			// Add link info to success message
			if (result.company_url) {
				companySuccess += ` Visit: ${result.company_url}`;
			}
			success_company_id = result.id ?? '';
			success_company_url = result.company_url ?? '';

				await refreshCompanies(); // Refresh company list
		} catch (e: any) {
			companyError = e.message;
			appToast.error(companyError);
		} finally {
			companyLoading = false;
		}
	}

	function toggleDefaultTemplate(i: number) {
		if (selectedDefaultTemplates.includes(i)) {
			selectedDefaultTemplates = selectedDefaultTemplates.filter((x) => x !== i);
		} else {
			selectedDefaultTemplates = [...selectedDefaultTemplates, i].sort((a, b) => a - b);
		}
	}

	function selectAllDefaults() {
		selectedDefaultTemplates = defaultTemplates.map((_, i) => i);
	}

	function clearAllDefaults() {
		selectedDefaultTemplates = [];
	}


	// Companies source-of-truth via shared store
	const companies = $derived.by(() => $companiesStore);


	// Initialize from server data (SSR) for immediate render
	try {
		const preloaded = (data as any)?.recent_markets;
		if (Array.isArray(preloaded)) {
			recentMarkets = preloaded;
		}
	} catch {}

	onMount(async () => {
		await refreshCompanies();
		// Refresh on mount to keep fresh data
		await loadRecentMarkets();
	});

	// removed local loader in favor of refreshCompanies()

	// ======== Market-Company Associations ========
	let linkMarketId = $state('');
	let linkCompanyIds = $state<string[]>([]);
	let linkLoading = $state(false);
	let linkError = $state('');
	let linkSuccess = $state('');
	let currentMarketCompanies = $state<string[]>([]);

	async function loadMarketCompanies() {
		if (!linkMarketId.trim() || !isUuid(linkMarketId.trim())) return;
		try {
			const res = await fetch(`/api/admin/markets/${encodeURIComponent(linkMarketId.trim())}/companies`);
			if (!res.ok) throw new Error('Failed to load market companies');
			const data = await res.json();
			currentMarketCompanies = data.companyIds || [];
			linkCompanyIds = [...currentMarketCompanies];
		} catch (e: any) {
			linkError = e.message;
			appToast.error(linkError);
		}
	}

	async function handleMarketCompaniesSubmit(e: Event) {
		e.preventDefault();
		linkLoading = true;
		linkError = '';
		linkSuccess = '';

		try {
			const res = await fetch('/api/admin/markets/companies', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					market_id: linkMarketId.trim(),
					company_ids: linkCompanyIds
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to update market companies');
			}
			linkSuccess = 'Market companies updated successfully!';
			appToast.success(linkSuccess);
			currentMarketCompanies = [...linkCompanyIds];
		} catch (e: any) {
			linkError = e.message;
			appToast.error(linkError);
		} finally {
			linkLoading = false;
		}
	}

	function toggleCompanyLink(companyId: string) {
		if (linkCompanyIds.includes(companyId)) {
			linkCompanyIds = linkCompanyIds.filter(id => id !== companyId);
		} else {
			linkCompanyIds = [...linkCompanyIds, companyId];
		}
	}

	// ======== Seed Database ========
	let seedLoading = $state(false);
	let seedMessage = $state('');
	let seedError = $state('');

	async function handleSeedDatabase(e?: Event) {
		e?.preventDefault?.();
		seedLoading = true;
		seedError = '';
		seedMessage = '';

		try {
			const res = await fetch('/api/admin/seed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!res.ok) {
				if (res.status === 401) {
					throw new Error('Please sign in to seed the database.');
				}
				if (res.status === 403) {
					throw new Error('Admin access required to seed the database.');
				}
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Seed failed');
			}

			const result = await res.json();
			if (result.success) {
				seedMessage = `${result.message}. Created ${result.details.companies_created} companies, ${result.details.users_created} users, and ${result.details.markets_created} markets.`;
				appToast.success('Database seeded successfully!');
				loadRecentMarkets(); // Refresh the markets list
			} else {
				throw new Error(result.error || 'Seed failed');
			}
		} catch (e: any) {
			seedError = e.message || 'Seed failed';
			appToast.error(seedError);
		} finally {
			seedLoading = false;
		}
	}

	// ======== Close / Resolve Markets ========
	let closeMarketId = $state('');
	let closeLoading = $state(false);
	let closeMsg = $state('');
	let closeErr = $state('');
	let lastClosedMarketId = $state('');

	async function handleCloseMarket(e?: Event) {
		e?.preventDefault?.();
		closeErr = '';
		closeMsg = '';
		if (!closeMarketId.trim()) {
			closeErr = 'Market ID required';
			appToast.warning(closeErr);
			return;
		}
		if (!isUuid(closeMarketId.trim())) {
			closeErr = 'Enter a valid market UUID';
			appToast.warning(closeErr);
			return;
		}
		closeLoading = true;
		try {
			const res = await fetch('/api/admin/markets/close', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id: closeMarketId.trim() })
			});
			if (!res.ok) {
				if (res.status === 401) {
					throw new Error('Please sign in to close markets.');
				}
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Close failed');
			}
			closeMsg = 'Market closed.';
			lastClosedMarketId = closeMarketId.trim();
			appToast.success(closeMsg);
		} catch (e: any) {
			closeErr = e.message || 'Close failed';
			appToast.error(closeErr);
		} finally {
			closeLoading = false;
		}
	}

	let resolveMarketId = $state('');
	let resolveOutcomeId = $state('');
	let resolveLoading = $state(false);
	let resolveMsg = $state('');
	let resolveErr = $state('');
	let resolveOutcomes = $state<any[]>([]);
	let resolveCutoff = $state('');
	let lastResolvedMarketId = $state('');

	function isUuid(v: string) {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
	}

	async function loadResolveOutcomes() {
		resolveOutcomes = [];
		resolveOutcomeId = '';
		resolveErr = '';
		try {
			const id = resolveMarketId.trim();
			if (!id) return;
			if (!isUuid(id)) {
				resolveErr = 'Enter a valid market UUID';
				appToast.warning(resolveErr);
				return;
			}
			const res = await fetch(`/api/markets/${encodeURIComponent(id)}/outcomes`);
			if (!res.ok) throw new Error('Failed to load outcomes');
			const data = await res.json();
			resolveOutcomes = data.outcomes || [];
		} catch (e: any) {
			resolveErr = e.message || 'Failed to load outcomes';
			appToast.error(resolveErr);
		}
	}

	async function handleResolveMarket(e?: Event) {
		e?.preventDefault?.();
		resolveErr = '';
		resolveMsg = '';
		const mid = resolveMarketId.trim();
		const oid = resolveOutcomeId.trim();
		if (!mid) {
			resolveErr = 'Market ID required';
			appToast.warning(resolveErr);
			return;
		}
		if (!isUuid(mid)) {
			resolveErr = 'Enter a valid market UUID';
			appToast.warning(resolveErr);
			return;
		}
		if (!oid) {
			resolveErr = 'Select a winning outcome';
			appToast.warning(resolveErr);
			return;
		}
		resolveLoading = true;
		try {
			// Ensure market is closed before resolving; allow doing both at once
			const closeRes = await fetch('/api/admin/markets/close', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ market_id: mid })
			});
			if (!closeRes.ok) {
				if (closeRes.status === 401) {
					throw new Error('Please sign in to resolve markets.');
				}
				// If already closed, proceed; otherwise surface error
				let proceed = false;
				try {
					const err = await closeRes.json();
					const msg = String(err?.message || '').toLowerCase();
					if (msg.includes('already') || msg.includes('closed')) proceed = true;
				} catch {
				}
				if (!proceed) {
					throw new Error('Close failed before resolve');
				}
			}

			const res = await fetch('/api/admin/markets/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					market_id: mid,
					outcome_id: oid,
					cutoff: resolveCutoff ? new Date(resolveCutoff).toISOString() : undefined
				})
			});
			if (!res.ok) {
				if (res.status === 401) {
					throw new Error('Please sign in to resolve markets.');
				}
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Resolve failed');
			}
			resolveMsg = 'Market closed and resolved.';
			lastResolvedMarketId = resolveMarketId.trim();
			appToast.success(resolveMsg);
		} catch (e: any) {
			resolveErr = e.message || 'Resolve failed';
			appToast.error(resolveErr);
		} finally {
			resolveLoading = false;
		}
	}
</script>

<div class="max-w-4xl mx-auto p-6 space-y-6 app-scrollable-page">
	<h1 class="text-3xl font-bold mb-8">Admin</h1>

	{#if !page.data.session}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between">
				<p class="text-gray-600">You must be signed in to manage markets.</p>
				<XAuthButton />
			</div>
		</div>
	{/if}
	{#if page.data.session && !page.data.allowed}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<p class="text-gray-600">You do not have access to admin tools.</p>
		</div>
	{/if}
	{#if page.data.allowed}
		{@render children?.()}

		<!-- Active Market Ops Widget -->
		<MarketOpsWidget />

		<!-- Create Market Widget -->
		<CreateMarketWidget />

		<RecentMarketsWidget
			markets={recentMarkets}
			loading={loadingRecentMarkets}
			onRefresh={loadRecentMarkets}
			onUse={fillMarketId}
			onCopy={copyMarketId}
		/>

		<SeedDatabaseWidget
			loading={seedLoading}
			message={seedMessage}
			error={seedError}
			onSeed={() => handleSeedDatabase()}
		/>

		<CloseResolveWidget
			closeMarketId={closeMarketId}
			closeLoading={closeLoading}
			closeMsg={closeMsg}
			lastClosedMarketId={lastClosedMarketId}
			onCloseMarketIdInput={(v) => (closeMarketId = v)}
			onClose={() => handleCloseMarket()}
			resolveMarketId={resolveMarketId}
			resolveOutcomeId={resolveOutcomeId}
			resolveOutcomes={resolveOutcomes}
			resolveCutoff={resolveCutoff}
			resolveLoading={resolveLoading}
			resolveMsg={resolveMsg}
			lastResolvedMarketId={lastResolvedMarketId}
			onResolveMarketIdInput={(v) => (resolveMarketId = v)}
			onLoadOutcomes={loadResolveOutcomes}
			onResolveOutcomeIdChange={(v) => (resolveOutcomeId = v)}
			onResolveCutoffInput={(v) => (resolveCutoff = v)}
			onResolve={() => handleResolveMarket()}
			onCopy={copyMarketId}
		/>

		<MarketCompaniesWidget
			marketId={linkMarketId}
			onMarketIdInput={(v) => (linkMarketId = v)}
			onLoadCompanies={loadMarketCompanies}
			companies={companies}
			selectedCompanyIds={linkCompanyIds}
			onToggleCompany={toggleCompanyLink}
			loading={linkLoading}
			onSubmit={handleMarketCompaniesSubmit}
			updatedMarketId={linkSuccess && isUuid(linkMarketId.trim()) ? linkMarketId.trim() : ''}
			onCopy={copyMarketId}
		/>

		<CreateCompanyWidget
			name={companyName}
			slug={companySlug}
			bio={companyBio}
			logoUrl={companyLogoUrl}
			onNameInput={(v) => (companyName = v)}
			onSlugInput={(v) => (companySlug = v)}
			onBioInput={(v) => (companyBio = v)}
			onLogoUrlInput={(v) => (companyLogoUrl = v)}
			defaultTemplates={defaultTemplates}
			selectedTemplateIndexes={selectedDefaultTemplates}
			onToggleTemplate={toggleDefaultTemplate}
			onSelectAll={selectAllDefaults}
			onClearAll={clearAllDefaults}
			loading={companyLoading}
			onSubmit={handleCompanySubmit}
			successCompanyId={success_company_id}
			successCompanyUrl={success_company_url}
			onCopy={(id) => navigator.clipboard.writeText(id).then(() => appToast.success('Company ID copied!'))}
		/>
	{/if}
</div>
