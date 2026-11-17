import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import type { SetUsernameBody } from '$lib/types';
import { sanitizeUsername, isReservedUsername } from '$lib/server/usernames';

function sanitize(u: string) {
	return sanitizeUsername(u);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<SetUsernameBody>(request);
	const desired: string = typeof body?.username === 'string' ? body.username : '';
	const username = sanitize(desired);
	if (!username || username.length < 3)
		throw error(400, 'Username must be at least 3 characters, only a-z, 0-9, _');

	if (isReservedUsername(username)) {
		throw error(400, 'That username is reserved');
	}

    const { id: userId } = await requireUser(cookies);

    try {
        await db.update(schema.users).set({ username }).where(eq(schema.users.id, userId));
    } catch (e: any) {
        if (e?.code === '23505') throw error(409, 'Username already taken');
        throw error(500, e?.message || 'Failed to update username');
    }
	return json({ success: true, username });
};
