import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, and, eq } from '$lib/server/db.ts';
import { requireUser } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const transaction_id = ensureUuid('id', params.id);
  const { id: userId } = await requireUser(cookies);
  const res = await db
    .delete(schema.pinnedTransactions)
    .where(and(eq(schema.pinnedTransactions.userId, userId), eq(schema.pinnedTransactions.transactionId, transaction_id)))
    .returning({ transaction_id: schema.pinnedTransactions.transactionId });
  if (!res?.[0]) throw error(404, 'pin not found');
  return json({ success: true, pinned: false });
};

