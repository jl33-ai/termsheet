import { tick } from 'svelte';

// Normalize a URL hash to an element id, optionally stripping a prefix
export function normalizedHashId(hash: string, stripPrefix?: string): string | null {
  if (!hash) return null;
  const raw = (hash.startsWith('#') ? hash.slice(1) : hash).trim();
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (stripPrefix && decoded.startsWith(stripPrefix)) return decoded.slice(stripPrefix.length);
  return decoded;
}

// Smooth-scroll to an element id derived from the hash. Centers in viewport.
export async function scrollToHash(
  hash: string,
  { stripPrefix }: { stripPrefix?: string } = {}
) {
  if (typeof window === 'undefined') return;
  const id = normalizedHashId(hash, stripPrefix);
  if (!id) return;
  window.scrollTo(0, 0);
  await tick();
  const el = document.getElementById(id) as HTMLElement | null;
  el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

