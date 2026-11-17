import type { PageServerLoad } from './$types';
import { db, schema, eq, desc } from '$lib/server/db.ts';
import { getSessionUser } from '$lib/server/admin';
import { userBalanceSelect } from '$lib/server/selects';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('session_token') || '';
	if (!token) return { transactions: [], wallet_transactions: [] };

    const sess = await getSessionUser(cookies);
    const user_id = sess?.id as string | undefined;
	if (!user_id) return { transactions: [], wallet_transactions: [], balance_credits: 0 };

    const [txRows, wtxRows, userRows] = await Promise.all([
        db
            .select({
                id: schema.transactions.id,
                created_at: schema.transactions.createdAt,
                type: schema.transactions.type,
                amount_credits: schema.transactions.amountCredits,
                shares_change: schema.transactions.sharesChange,
                market_id: schema.transactions.marketId,
                outcome_id: schema.transactions.outcomeId,
                original_tx_id: schema.transactions.originalTxId,
                refunded_at: schema.transactions.refundedAt,
            })
            .from(schema.transactions)
            .where(eq(schema.transactions.userId, user_id))
            .orderBy(desc(schema.transactions.createdAt)),
        db
            .select({
                id: schema.walletTransactions.id,
                created_at: schema.walletTransactions.createdAt,
                type: schema.walletTransactions.type,
                amount_credits: schema.walletTransactions.amountCredits,
                tx_hash: schema.walletTransactions.txHash,
            })
            .from(schema.walletTransactions)
            .where(eq(schema.walletTransactions.userId, user_id))
            .orderBy(desc(schema.walletTransactions.createdAt)),
        db
            .select(userBalanceSelect)
            .from(schema.users)
            .where(eq(schema.users.id, user_id))
            .limit(1),
    ]);

	return {
        transactions: txRows ?? [],
        wallet_transactions: wtxRows ?? [],
        balance_credits: userRows?.[0]?.balance_credits != null ? Number(userRows[0].balance_credits) : 0
    };
};
