import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { walletTransactionsDeposit } from '$lib/server/sql/functions.ts';
import { requireUser, safeJson } from '$lib/server/http';
import type { WalletDepositBody } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<WalletDepositBody>(request);
	const amount = typeof body?.amount === 'number' ? body.amount : 0;
	const tx_hash = typeof body?.tx_hash === 'string' ? body.tx_hash : null;
	const chain_id = typeof body?.chain_id === 'number' ? body.chain_id : null;
	const from_address = typeof body?.from_address === 'string' ? body.from_address : null;
	const to_address = typeof body?.to_address === 'string' ? body.to_address : null;
	if (amount <= 0) throw error(400, 'amount must be a positive number');

	const { id: userId } = await requireUser(cookies);

	const res = await walletTransactionsDeposit({
		user_id: userId,
		amount,
		tx_hash,
		chain_id,
		from_address,
		to_address
	});
	const newBalance = res?.new_balance != null ? Number(res.new_balance) : null;

	return json({ ok: true, balance_credits: newBalance });
};
