import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await safeJson<{ transaction_id?: string }>(request);
  const transaction_id = ensureUuid('transaction_id', body?.transaction_id);
  const { id: userId } = await requireUser(cookies);

  // Ensure transaction exists and belongs to the user
  const rows = await db
    .select({ id: schema.transactions.id, user_id: schema.transactions.userId })
    .from(schema.transactions)
    .where(eq(schema.transactions.id, transaction_id))
    .limit(1);
  const tx = rows?.[0];
  if (!tx) throw error(404, 'transaction not found');
  if (String(tx.user_id) !== String(userId)) throw error(403, 'cannot pin another user\'s transaction');

  try {
    await db.insert(schema.pinnedTransactions).values({ userId, transactionId: transaction_id });
  } catch (e: any) {
    if (e?.code === '23505') {
      // already pinned; treat as success
      return json({ success: true, pinned: true });
    }
    throw error(500, e?.message || 'failed to pin transaction');
  }
  return json({ success: true, pinned: true });
};
