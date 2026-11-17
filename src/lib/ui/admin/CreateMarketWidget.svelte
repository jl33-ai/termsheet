<script lang="ts">
    import { appToast } from '$lib/ui/toast.ts';
    import { onMount } from 'svelte';
    import { companies as companiesStore, refreshCompanies } from '$lib/stores/companies';
    import Textarea from '$lib/ui/Textarea.svelte';
    import type { MarketType, DefaultMarketTemplate } from '$lib/types';

    // Companies source-of-truth via shared store
    const companies = $derived.by(() => $companiesStore);

    onMount(async () => {
        if (!companies?.length) await refreshCompanies();
    });

    let question = $state('');
    let rules = $state('');
    let thumbnail_url = $state('');
    let market_type = $state<MarketType>('BINARY');
    let expires_at = $state('');
    let heat_score_input = $state(''); // optional 1-5
    let selectedCompanyId = $state<string>('');
    let outcomes = $state<
        {
            name: string;
            short_code: string;
            color_hex?: string;
            min_value?: number | null;
            max_value?: number | null;
            rep_value?: number | null;
        }[]
    >([]);
    let newOutcomeName = $state('');

    let marketLoading = $state(false);
    let marketError = $state('');
    let success_market_id = $state('');
    let rulesGenerating = $state(false);

    // AI generation state
    let aiPrompt = $state('');
    let aiBusy = $state(false);

    // Sources (optional): attach after market creation
    type NewSource = { url: string; label?: string; author_username?: string; content?: string };
    let sources = $state<NewSource[]>([]);
    let newSource = $state<NewSource>({ url: '', label: '', author_username: '', content: '' });

    function normalizeUrl(input: string) {
        const raw = input.trim();
        if (!raw) return '';
        try {
            const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
            return u.toString();
        } catch {
            return '';
        }
    }

    function addSource() {
        const u = normalizeUrl(newSource.url);
        if (!u) {
            appToast.warning('Enter a valid URL');
            return;
        }
        if (sources.some((s) => s.url === u)) {
            newSource = { url: '', label: '', author_username: '', content: '' };
            return;
        }
        sources = [
            ...sources,
            {
                url: u,
                label: (newSource.label || '').trim() || undefined,
                author_username: (newSource.author_username || '').trim() || undefined,
                content: (newSource.content || '').trim() || undefined
            }
        ];
        newSource = { url: '', label: '', author_username: '', content: '' };
    }

    function removeSource(i: number) {
        sources = sources.filter((_, idx) => idx !== i);
    }

    // ---- Expiry helpers (always use UTC) ----
    function pad(n: number) {
        return n < 10 ? `0${n}` : String(n);
    }

    function addMonthsUTC(base: Date, months: number) {
        const y = base.getUTCFullYear();
        const m = base.getUTCMonth();
        const d = base.getUTCDate();
        const hh = base.getUTCHours();
        const mm = base.getUTCMinutes();
        const dt = new Date(Date.UTC(y, m + months, d, hh, mm, 0, 0));
        return dt;
    }

    function formatDatetimeLocalFromUTC(d: Date) {
        // returns `YYYY-MM-DDTHH:mm` using UTC parts (for datetime-local input)
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    }

    function datetimeLocalToUTCISOString(s: string) {
        // Parse `YYYY-MM-DDTHH:mm` as UTC
        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
        if (!m) return undefined;
        const [, Y, Mo, D, H, Mi] = m;
        const dt = new Date(Date.UTC(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), 0, 0));
        return dt.toISOString();
    }

    async function generateMarketAI() {
        if (!aiPrompt.trim()) {
            appToast.warning('Enter a prompt first');
            return;
        }
        aiBusy = true;
        try {
            const res = await fetch('/api/admin/generate-market', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt.trim(),
                    market_type,
                    company_id: selectedCompanyId || null
                })
            });
            if (!res.ok) throw new Error('Failed to generate market');
            const data = await res.json();
            const t = data?.template as DefaultMarketTemplate | undefined;
            if (t?.market_type) market_type = t.market_type;
            if (typeof t?.question === 'string') question = t.question;
            if (typeof t?.rules === 'string') rules = t.rules;
            // Prefer explicit UTC expiry from the model when provided
            if (typeof data?.expires_at_utc === 'string') {
                const d = new Date(data.expires_at_utc);
                if (!Number.isNaN(d.getTime())) {
                    expires_at = formatDatetimeLocalFromUTC(d);
                }
            } else if (typeof t?.expires_months === 'number' && Number.isFinite(t.expires_months)) {
                // Add calendar months accurately in UTC and format for datetime-local
                const nowUTC = new Date();
                const expUTC = addMonthsUTC(nowUTC, Math.max(0, Math.floor(t.expires_months)));
                expires_at = formatDatetimeLocalFromUTC(expUTC);
            }
            if (Array.isArray(t?.outcomes)) outcomes = t.outcomes as any[];
            appToast.success('Draft populated from AI');
        } catch (e: any) {
            appToast.error(e?.message || 'AI generation failed');
        } finally {
            aiBusy = false;
        }
    }

    function addOutcome() {
        if (newOutcomeName.trim() && market_type !== 'BINARY') {
            const short_code = newOutcomeName.trim().toUpperCase().replace(/\s+/g, '_');
            outcomes = [
                ...outcomes,
                {
                    name: newOutcomeName.trim(),
                    short_code,
                    min_value: null,
                    max_value: null,
                    rep_value: null
                }
            ];
            newOutcomeName = '';
        }
    }

    function removeOutcome(index: number) {
        outcomes = outcomes.filter((_, i) => i !== index);
    }

    function moveOutcomeUp(i: number) {
        if (i <= 0) return;
        const arr = [...outcomes];
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        outcomes = arr;
    }

    function moveOutcomeDown(i: number) {
        if (i >= outcomes.length - 1) return;
        const arr = [...outcomes];
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        outcomes = arr;
    }

    async function generateRules() {
        if (!question.trim()) {
            appToast.warning('Please enter a question first');
            return;
        }

        rulesGenerating = true;
        try {
            // Build payload including current rules text and categorical/scalar options when applicable
            const payload: any = { question: question.trim(), market_type, rules: rules?.trim?.() || '' };
            if (market_type === 'CATEGORICAL') {
                payload.categorical = outcomes.map((o) => ({
                    name: o.name,
                    short_code: o.short_code
                }));
            }
            if (market_type === 'SCALAR_BUCKET') {
                payload.scalar_buckets = outcomes.map((o) => ({
                    name: o.name,
                    short_code: o.short_code,
                    min_value: o.min_value ?? null,
                    max_value: o.max_value ?? null,
                    rep_value: o.rep_value ?? null
                }));
            }

            const response = await fetch('/api/admin/generate-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to generate rules');
            }

            const data = await response.json();
            rules = data.rules;
            appToast.success('Rules generated successfully');
        } catch (error: any) {
            appToast.error('Failed to generate rules: ' + error.message);
        } finally {
            rulesGenerating = false;
        }
    }

    async function handleMarketSubmit(e: Event) {
        e.preventDefault();
        marketLoading = true;
        marketError = '';
        success_market_id = '';

        const body: any = {
            question,
            rules,
            thumbnail_url: (thumbnail_url?.trim() || null),
            market_type,
            expires_at: expires_at ? datetimeLocalToUTCISOString(expires_at) : undefined,
            company_id: selectedCompanyId || null
        };

        // Optional curated heat score (1-5)
        const hs = heat_score_input.trim();
        if (hs.length > 0) {
            const n = Math.max(1, Math.min(5, Math.floor(Number(hs))));
            if (!Number.isNaN(n)) body.heat_score = n;
        }

        if (market_type === 'CATEGORICAL' || market_type === 'SCALAR_BUCKET') {
            if (outcomes.length < 2) {
                marketError = 'Please define at least two outcomes.';
                appToast.warning(marketError);
                marketLoading = false;
                return;
            }
            body.outcomes = outcomes.map((o) => ({
                name: o.name,
                short_code: o.short_code,
                color_hex: o.color_hex && typeof o.color_hex === 'string' && o.color_hex.trim().length > 0 ? o.color_hex.trim() : null,
                min_value: market_type === 'SCALAR_BUCKET' ? (o.min_value ?? null) : null,
                max_value: market_type === 'SCALAR_BUCKET' ? (o.max_value ?? null) : null,
                rep_value: market_type === 'SCALAR_BUCKET' ? (o.rep_value ?? null) : null
            }));
        }

        try {
            const res = await fetch('/api/markets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            success_market_id = data.market_id;
            // If sources provided, attach them sequentially (simple feedback)
            if (Array.isArray(sources) && sources.length > 0) {
                let ok = 0;
                for (const s of sources) {
                    try {
                        const r = await fetch(`/api/markets/${encodeURIComponent(success_market_id)}/external-links`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: s.url,
                                label: s.label ?? null,
                                author_username: s.author_username ?? null,
                                content: s.content ?? null
                            })
                        });
                        if (r.ok) ok++;
                    } catch {}
                }
                if (ok > 0) appToast.success(`Attached ${ok} source${ok === 1 ? '' : 's'}.`);
            }
            appToast.success('Market created.');
        } catch (e: any) {
            marketError = e.message;
            appToast.error(marketError);
        } finally {
            marketLoading = false;
        }
    }

    $effect(() => {
        if (market_type === 'BINARY') {
            outcomes = [];
        }
    });
</script>

<div class="rounded-lg border border-border bg-white p-6">
    <!-- AI generator section: fills the form below without submitting -->
    <div class="mb-4">
        <div class="mb-2 text-sm text-title font-medium">AI Prompt</div>
        <input
            class="w-full rounded-sm border border-border px-3 py-2"
            placeholder="Describe the market you want to create"
            bind:value={aiPrompt}
        />
        <div class="mt-2">
            <label class="mb-1 block text-sm font-medium text-title">Type</label>
            <select class="w-full rounded-sm border border-border px-3 py-2" bind:value={market_type}>
                <option value="BINARY">Binary</option>
                <option value="CATEGORICAL">Categorical</option>
                <option value="SCALAR_BUCKET">Scalar Buckets</option>
            </select>
        </div>
        <div class="mt-2 flex items-center gap-2">
            <button
                type="button"
                disabled={aiBusy || !aiPrompt.trim()}
                onclick={generateMarketAI}
                class="rounded-sm border border-border px-3 py-1 text-sm text-accent disabled:opacity-60"
            >
                {aiBusy ? 'Generating…' : 'Generate Draft'}
            </button>
            <span class="text-xs text-muted">Fills fields below, does not submit.</span>
        </div>
    </div>

    <form class="space-y-4" onsubmit={handleMarketSubmit}>
        <div>
            <label class="mb-1 block text-sm font-medium text-title" for="marketQuestion">Question</label>
            <input
                id="marketQuestion"
                required
                class="w-full rounded-sm border border-border px-3 py-2"
                bind:value={question}
            />
        </div>

        <div>
            <label class="mb-1 block text-sm font-medium text-title" for="marketRules">Rules</label>
            <Textarea
                id="marketRules"
                class="w-full"
                placeholder="How is this market resolved? What counts?"
                value={rules}
                oninput={(e: Event) => (rules = (e.target as HTMLTextAreaElement).value)}
            />
            <div class="mt-2">
                <button type="button" class="rounded-sm border border-border px-3 py-1 text-sm"
                        onclick={generateRules} disabled={rulesGenerating}>
                    {rulesGenerating ? 'Generating…' : 'Suggest Rules'}
                </button>
            </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <div>
                <label class="mb-1 block text-sm font-medium text-title" for="marketThumb">Thumbnail URL</label>
                <input id="marketThumb" class="w-full rounded-sm border border-border px-3 py-2" bind:value={thumbnail_url} />
            </div>
            <div>
                <label class="mb-1 block text-sm font-medium text-title" for="marketExpires">Expires (UTC)</label>
                <input id="marketExpires" type="datetime-local" class="w-full rounded-sm border border-border px-3 py-2" bind:value={expires_at} />
            </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <div>
                <label class="mb-1 block text-sm font-medium text-title">Company (optional)</label>
                <select class="w-full rounded-sm border border-border px-3 py-2" bind:value={selectedCompanyId}>
                    <option value="">None</option>
                    {#each (companies || []) as c}
                        <option value={c.id}>{c.name}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label class="mb-1 block text-sm font-medium text-title" for="heat_score">Heat Score (1–5, optional)</label>
                <input id="heat_score" type="number" min="1" max="5" placeholder="e.g., 3"
                       bind:value={heat_score_input}
                       class="w-full rounded-sm border border-border px-3 py-2" />
                <p class="mt-1 text-xs text-muted">Leave blank to auto-compute from activity.</p>
            </div>
        </div>

        {#if market_type !== 'BINARY'}
            <div>
                <div class="mb-1 text-sm font-medium text-title">Outcomes</div>
                <div class="space-y-2">
                    {#each outcomes as outcome, i}
                        <div class="rounded-sm border border-border p-3">
                            <div class="grid gap-2 md:grid-cols-3">
                                <div>
                                    <label class="mb-1 block text-xs text-muted">Name</label>
                                    <input class="w-full rounded-sm border border-border px-3 py-2" bind:value={outcome.name} />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs text-muted">Code</label>
                                    <input class="w-full rounded-sm border border-border px-3 py-2" bind:value={outcome.short_code} />
                                </div>
                                <div>
                                    <label class="mb-1 block text-xs text-muted">Color (hex)</label>
                                    <input class="w-full rounded-sm border border-border px-3 py-2" bind:value={outcome.color_hex} />
                                </div>
                            </div>

                            <div class="mt-2 flex items-center gap-2">
                                <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={() => moveOutcomeUp(i)}>Up</button>
                                <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={() => moveOutcomeDown(i)}>Down</button>
                                <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={() => removeOutcome(i)}>Remove</button>
                            </div>

                            {#if market_type === 'SCALAR_BUCKET'}
                                <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <div>
                                        <label class="mb-1 block text-xs text-muted">Min Value</label>
                                        <input type="number" step="any"
                                               class="w-full rounded-sm border border-border px-3 py-2"
                                               bind:value={outcome.min_value}
                                               oninput={(e: Event) => {
                                                   const v = (e.target as HTMLInputElement).value;
                                                   const num = parseFloat(v);
                                                   outcomes[i].min_value = v.trim() === '' || Number.isNaN(num) ? null : num;
                                               }} />
                                    </div>
                                    <div>
                                        <label class="mb-1 block text-xs text-muted">Max Value</label>
                                        <input type="number" step="any"
                                               class="w-full rounded-sm border border-border px-3 py-2"
                                               bind:value={outcome.max_value}
                                               oninput={(e: Event) => {
                                                   const v = (e.target as HTMLInputElement).value;
                                                   const num = parseFloat(v);
                                                   outcomes[i].max_value = v.trim() === '' || Number.isNaN(num) ? null : num;
                                               }} />
                                    </div>
                                    <div>
                                        <label class="mb-1 block text-xs text-muted">Representative</label>
                                        <input type="number" step="any"
                                               class="w-full rounded-sm border border-border px-3 py-2"
                                               bind:value={outcome.rep_value}
                                               oninput={(e: Event) => {
                                                   const v = (e.target as HTMLInputElement).value;
                                                   const num = parseFloat(v);
                                                   outcomes[i].rep_value = v.trim() === '' || Number.isNaN(num) ? null : num;
                                               }} />
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}

                    <div class="mt-3 flex gap-2">
                        <input
                            type="text"
                            placeholder="New outcome name"
                            bind:value={newOutcomeName}
                            onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
                            class="flex-1 rounded-sm border border-border px-3 py-2"
                        />
                        <button type="button" onclick={addOutcome} class="rounded-sm border border-border px-3 py-2 text-sm">Add</button>
                    </div>
                </div>
            </div>
        {/if}

        <div>
            <div class="mb-1 text-sm text-base">Sources (optional)</div>
            <div class="grid gap-2">
                <input
                    placeholder="https://example.com/article"
                    class="w-full rounded-sm border border-border px-3 py-2"
                    bind:value={newSource.url}
                    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addSource(); } }}
                />
                <div class="flex gap-2">
                    <input
                        placeholder="Label (e.g., Article title)"
                        class="flex-1 rounded-sm border border-border px-3 py-2"
                        bind:value={newSource.label}
                    />
                    <input
                        placeholder="Author username (e.g., @alice)"
                        class="flex-1 rounded-sm border border-border px-3 py-2"
                        bind:value={newSource.author_username}
                    />
                </div>
                <Textarea
                    class="w-full"
                    placeholder="Short content/summary (optional)"
                    value={newSource.content}
                    oninput={(e: Event) => (newSource.content = (e.target as HTMLTextAreaElement).value)}
                />
                <div>
                    <button type="button" class="rounded-sm border border-border px-3 py-1 text-sm text-accent" onclick={addSource}>Add</button>
                </div>
            </div>

            {#if sources.length > 0}
                <ul class="mt-2 space-y-1">
                    {#each sources as s, i}
                        <li class="rounded-sm border border-border p-3">
                            <div class="mb-2 flex items-center justify-between gap-2">
                                <input class="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-title"
                                       bind:value={s.url}
                                       onchange={(e: Event) => { const v = normalizeUrl((e.target as HTMLInputElement).value); if (v) sources[i].url = v; }} />
                                <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={() => removeSource(i)}>Remove</button>
                            </div>
                            {#if s.label || s.author_username || s.content}
                                <div class="grid gap-2 md:grid-cols-2">
                                    {#if s.label}
                                        <input class="rounded-sm border border-border px-3 py-2 text-sm" bind:value={s.label} />
                                    {/if}
                                    {#if s.author_username}
                                        <input class="rounded-sm border border-border px-3 py-2 text-sm" bind:value={s.author_username} />
                                    {/if}
                                </div>
                                {#if s.content}
                                    <Textarea class="mt-2 w-full" value={s.content} oninput={(e: Event) => (sources[i].content = (e.target as HTMLTextAreaElement).value)} />
                                {/if}
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>

        <div class="flex items-center gap-3">
            <button type="submit" disabled={marketLoading} class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60">
                {marketLoading ? 'Creating…' : 'Create Market'}
            </button>
            {#if marketError}
                <span class="text-sm text-error">{marketError}</span>
            {/if}
        </div>

        {#if success_market_id}
            <div class="mt-3 flex items-center gap-3">
                <span class="text-sm text-muted">Created:</span>
                <code class="text-xs">{success_market_id}</code>
                <button type="button" class="text-xs text-accent underline"
                        onclick={() => navigator.clipboard.writeText(success_market_id).then(() => appToast.success('Market ID copied!'))}>
                    Copy ID
                </button>
                <a class="text-xs text-accent underline" href={`/market/${success_market_id}`}>View</a>
            </div>
        {/if}
    </form>
</div>
