// Minimal input guards/parsers. No deps.
import { error } from '@sveltejs/kit';

export function ensureUuid(name: string, v: unknown): string {
  const s = String(v || '').trim();
  // UUID v4-ish: accept hex + dashes only, length 36
  const ok = /^[0-9a-fA-F-]{36}$/.test(s);
  if (!ok) throw error(400, `${name} must be a UUID`);
  return s;
}

export function ensureNonEmpty(name: string, v: unknown): string {
  const s = String(v || '').trim();
  if (!s) throw error(400, `${name} is required`);
  return s;
}

export function toNumberOr(name: string, v: unknown, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return n;
}

