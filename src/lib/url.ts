// Minimal URL helpers used across pages/components
// Keeps navigation-building logic out of Svelte components

export function withQuery(
  url: URL,
  changes: Record<string, string | null | undefined>
): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(changes)) {
    if (v == null || v === '') u.searchParams.delete(k);
    else u.searchParams.set(k, String(v));
  }
  const q = u.searchParams.toString();
  return q ? `${u.pathname}?${q}${u.hash}` : `${u.pathname}${u.hash}`;
}

