import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';

export const POST: RequestHandler = async ({ cookies }) => {
    const token = cookies.get('session_token');
    if (token) {
        await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
        cookies.delete('session_token', { path: '/' });
    }
    return json({ success: true });
};
