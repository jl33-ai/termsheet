import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';
import { positionsUndoBet } from '$lib/server/sql/functions.ts';

export const POST: RequestHandler = async ({ params, cookies }) => {
  const tx_id = ensureUuid('id', params.id);
  const { id: user_id } = await requireUser(cookies);

  const data = await positionsUndoBet({ user_id, transaction_id: tx_id });
  if (!data || (data as any)?.error) {
    throw error(400, (data as any)?.error || 'Undo failed');
  }
  return json(data);
};

