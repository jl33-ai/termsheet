import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import { ensureUuid } from '$lib/server/input';
import type { CreateCommentBody } from '$lib/types';
import { transactionIdUserMarketCommentSelect } from '$lib/server/selects';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const body = await safeJson<CreateCommentBody>(request);
    const market_id = ensureUuid('market_id', body.market_id);

	const content = typeof body?.content === 'string' ? body.content.trim() : '';
	if (!content) throw error(400, 'content is required');
    const parent_id = typeof body?.parent_id === 'string' && body.parent_id.trim().length > 0 ? ensureUuid('parent_id', body.parent_id) : null;
    const transaction_id = typeof body?.transaction_id === 'string' && body.transaction_id.trim().length > 0 ? ensureUuid('transaction_id', body.transaction_id) : null;
    const { id: userId } = await requireUser(cookies);

    // Replies must not set transaction_id
    if (parent_id) {
        const rows = await db
            .insert(schema.comments)
            .values({
                marketId: market_id,
                content,
                userId,
                parentId: parent_id,
            })
            .returning();
        const inserted = rows?.[0];
        if (!inserted) throw error(500, 'Failed to insert reply');
        return json(inserted);
    }

    // Top-level comment: if transaction_id provided, update the auto-created root comment
    if (transaction_id) {
        // Verify transaction exists and belongs to this market + user
        const tx = await db
            .select(transactionIdUserMarketCommentSelect)
            .from(schema.transactions)
            .where(eq(schema.transactions.id, transaction_id))
            .limit(1);
        const row = tx?.[0];
        if (!row) throw error(400, 'transaction not found');
        if (String(row.market_id) !== String(market_id)) throw error(400, 'transaction does not belong to market');
        if (String(row.user_id) !== String(userId)) throw error(403, 'cannot edit another user\'s transaction');
        if (!row.comment_id) throw error(500, 'transaction comment not initialized');

        const updated = await db
            .update(schema.comments)
            .set({ content })
            .where(eq(schema.comments.id, row.comment_id))
            .returning();
        const rec = updated?.[0];
        if (!rec) throw error(500, 'failed to update transaction comment');
        return json(rec);
    }

    // Plain top-level comment with no transaction association
    const rows = await db
        .insert(schema.comments)
        .values({ marketId: market_id, content, userId })
        .returning();
    const inserted = rows?.[0];
    if (!inserted) throw error(500, 'Failed to insert comment');
    return json(inserted);
};
