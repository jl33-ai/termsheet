import type { Cookies } from '@sveltejs/kit';
import { db, schema, eq, and, gt } from '$lib/server/db.ts';
import { userSessionSelect } from '$lib/server/selects';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { SessionUser } from '$lib/types';

function parseEnvList(v: string | undefined | null): string[] {
	if (!v) return [];
	return v
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

const allowedIds = new Set(parseEnvList(env.ADMIN_X_USER_IDS));
const allowedUsernames = new Set(parseEnvList(env.ADMIN_X_USERNAMES).map((s) => s.toLowerCase()));

export async function getSessionUser(cookies: Cookies): Promise<SessionUser | null> {
    const token = cookies.get('session_token') || '';
    if (!token) return null;
    const rows = await db
        .select(userSessionSelect)
        .from(schema.sessions)
        .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
        .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, new Date())))
        .limit(1);
    const u = rows?.[0];
    if (!u?.id) return null;
    return { id: u.id, x_user_id: u.x_user_id ?? null, x_username: u.x_username ?? null, x_avatar_url: u.x_avatar_url ?? null };
}

export function isAdminUser(user: SessionUser | null): boolean {
	// In development, allow all authenticated users to perform admin actions.
	// This keeps local flows (e.g., closing markets) unblocked without extra env.
	if (dev) return Boolean(user);

	if (!user) return false;
	if (user.x_user_id && allowedIds.has(String(user.x_user_id))) return true;
	if (user.x_username && allowedUsernames.has(String(user.x_username).toLowerCase())) return true;
	return false;
}
