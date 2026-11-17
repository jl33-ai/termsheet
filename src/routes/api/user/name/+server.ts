import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import type { SetNameBody } from '$lib/types';

function sanitizeName(v: string) {
	// Trim, collapse whitespace, and clamp length to 120
	const t = (v || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
	const collapsed = t.replace(/\s+/g, ' ');
	return collapsed.slice(0, 120);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await safeJson<SetNameBody>(request);
	const desired: string = typeof body?.name === 'string' ? body.name : '';
	const name = sanitizeName(desired);
	if (!name || name.length < 1) throw error(400, 'Name is required');

    const { id: userId } = await requireUser(cookies);

    await db.update(schema.users).set({ xName: name }).where(eq(schema.users.id, userId));
    return json({ success: true, name });
};
