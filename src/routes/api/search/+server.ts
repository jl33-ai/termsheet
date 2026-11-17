import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { marketsSearch } from '$lib/server/sql/functions.ts';
import { toNumberOr } from '$lib/server/input';

// GET /api/search?q=term&limit=10
// For now, only searches markets.
export const GET: RequestHandler = async ({ url }) => {
  const raw = url.searchParams.get('q') ?? url.searchParams.get('search') ?? '';
  const term = raw?.trim() || '';
  const limit = toNumberOr('limit', url.searchParams.get('limit'), term ? 10 : 5);

  const markets = await marketsSearch(term || null, limit).catch(() => []);
  return json({ markets });
};

