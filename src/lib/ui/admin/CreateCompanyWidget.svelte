<script lang="ts">
  let {
    name,
    slug,
    bio,
    logoUrl,
    onNameInput,
    onSlugInput,
    onBioInput,
    onLogoUrlInput,
    defaultTemplates,
    selectedTemplateIndexes,
    onToggleTemplate,
    onSelectAll,
    onClearAll,
    loading,
    onSubmit,
    successCompanyId,
    successCompanyUrl,
    onCopy
  }: {
    name: string;
    slug: string;
    bio: string;
    logoUrl: string;
    onNameInput: (v: string) => void;
    onSlugInput: (v: string) => void;
    onBioInput: (v: string) => void;
    onLogoUrlInput: (v: string) => void;
    defaultTemplates: { question: string; market_type: string }[];
    selectedTemplateIndexes: number[];
    onToggleTemplate: (i: number) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    loading: boolean;
    onSubmit: (e: Event) => void | Promise<void>;
    successCompanyId?: string;
    successCompanyUrl?: string;
    onCopy: (id: string) => void;
  } = $props();
</script>

<div class="rounded-lg border border-border bg-white p-6">
  <h2 class="mb-4 text-lg font-medium text-title">Create Company</h2>
  <form
    class="space-y-4"
    onsubmit={(e) => {
      e.preventDefault();
      onSubmit?.(e);
    }}
  >
    <div>
      <label class="mb-1 block text-sm font-medium text-title" for="companyName">Name</label>
      <input
        id="companyName"
        required
        value={name}
        oninput={(e: Event) => onNameInput?.((e.target as HTMLInputElement).value)}
        class="w-full rounded-sm border border-border px-3 py-2"
      />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-title" for="companySlug">Slug</label>
      <input
        id="companySlug"
        required
        value={slug}
        oninput={(e: Event) => onSlugInput?.((e.target as HTMLInputElement).value)}
        class="w-full rounded-sm border border-border px-3 py-2"
      />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-title" for="companyBio">Bio</label>
      <textarea
        id="companyBio"
        oninput={(e: Event) => onBioInput?.((e.target as HTMLTextAreaElement).value)}
        class="h-28 w-full rounded-sm border border-border px-3 py-2"
      >{bio}</textarea>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-title" for="companyLogoUrl">Logo URL</label>
      <input
        id="companyLogoUrl"
        type="url"
        value={logoUrl}
        oninput={(e: Event) => onLogoUrlInput?.((e.target as HTMLInputElement).value)}
        class="w-full rounded-sm border border-border px-3 py-2"
      />
    </div>
    <div>
      <label class="mb-2 block text-sm font-medium text-title">Default markets to create</label>
      <div class="max-h-56 overflow-y-auto rounded-sm border border-border p-3">
        {#each defaultTemplates as t, i}
          <label class="flex cursor-pointer items-start gap-2 rounded-sm p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedTemplateIndexes.includes(i)}
              onchange={() => onToggleTemplate?.(i)}
              class="mt-0.5 rounded"
            />
            <div class="flex-1">
              <p class="text-sm font-medium text-base">{t.question.replace('[company_name]', name.trim() || 'Company')}</p>
              <p class="text-xs text-muted">Type: {t.market_type}</p>
            </div>
          </label>
        {/each}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={onSelectAll}>Select all</button>
        <button type="button" class="rounded-sm border border-border px-2 py-1 text-xs" onclick={onClearAll}>Clear</button>
        <span class="text-xs text-muted">{selectedTemplateIndexes.length} selected</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="submit"
        disabled={loading}
        class="rounded-sm border border-border px-4 py-2 text-base disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create'}
      </button>
    </div>

    {#if successCompanyId}
      <div class="mt-3 flex items-center gap-3">
        <span class="text-sm text-muted">Created:</span>
        <code class="text-xs">{successCompanyId}</code>
        <button
          type="button"
          class="text-xs text-accent underline"
          onclick={() => onCopy?.(successCompanyId)}
        >
          Copy ID
        </button>
        {#if successCompanyUrl}
          <a class="text-xs text-accent underline" href={successCompanyUrl}>View</a>
        {/if}
      </div>
    {/if}
  </form>
  
</div>
