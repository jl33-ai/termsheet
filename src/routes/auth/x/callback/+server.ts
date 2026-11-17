import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI } from '$env/static/private';
import { db, schema, eq, and, gt, sql } from '$lib/server/db.ts';
import { sanitizeUsername, isReservedUsername } from '$lib/server/usernames';
import crypto from 'node:crypto';
import { userIdSelect, userUsernameSelect } from '$lib/server/selects';

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code') || '';
	const state = url.searchParams.get('state') || '';
	const savedState = cookies.get('x_oauth_state') || '';
	const code_verifier = cookies.get('x_oauth_code_verifier') || '';

	if (!code || !state || state !== savedState) {
		throw error(400, 'Invalid OAuth state');
	}
	if (!X_CLIENT_ID || !X_REDIRECT_URI) {
		throw new Error('X OAuth not configured (X_CLIENT_ID/X_REDIRECT_URI)');
	}

	// Exchange code for token
	const tokenParams = new URLSearchParams({
		grant_type: 'authorization_code',
		redirect_uri: X_REDIRECT_URI,
		code,
		code_verifier
	});
	// Some providers require client_id in body even with Basic; keep it
	tokenParams.set('client_id', X_CLIENT_ID);

	const tokenHeaders: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded'
	};
	if (X_CLIENT_SECRET) {
		const basic = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
		tokenHeaders['Authorization'] = `Basic ${basic}`;
	}

	const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
		method: 'POST',
		headers: tokenHeaders,
		body: tokenParams
	});

	if (!tokenRes.ok) {
		const t = await tokenRes.text();
		console.error('X token exchange failed:', t);
		throw error(401, 'OAuth exchange failed');
	}

	const tokenJson = await tokenRes.json();
	const access_token: string = tokenJson.access_token;
	if (!access_token) throw error(401, 'No access token');

	// Fetch the user
    const meRes = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username,description',
        {
            headers: { Authorization: `Bearer ${access_token}` }
        }
    );
	if (!meRes.ok) {
		const t = await meRes.text();
		console.error('X user fetch failed:', t);
		throw error(401, 'Failed to fetch user from X');
	}
	const me = await meRes.json();
	const xUser = me?.data;
	if (!xUser?.id) throw error(401, 'Invalid X user payload');

	// Upsert into users table (do not override existing username)
    const upserted = await db
        .insert(schema.users)
        .values({
            xUserId: String(xUser.id),
            xUsername: xUser.username || null,
            xName: xUser.name || null,
            xAvatarUrl: xUser.profile_image_url || null,
        })
        .onConflictDoUpdate({
            target: schema.users.xUserId,
            set: {
                xUsername: xUser.username || null,
                xName: xUser.name || null,
                xAvatarUrl: xUser.profile_image_url || null,
                updatedAt: new Date(),
            },
        })
        .returning({ id: schema.users.id });

    const userId = upserted?.[0]?.id as string | undefined;
    if (!userId) {
        throw error(500, 'Failed to save user');
    }

    // If bio is empty, inherit from X description on first login
    if (xUser?.description) {
        await db
            .update(schema.users)
            .set({ bio: xUser.description })
            .where(and(eq(schema.users.id, userId), sql`${schema.users.bio} is null`));
    }

	// If no app username set, default to X username (ensure uniqueness)
    const existing = await db
        .select(userUsernameSelect)
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
    if (!existing?.[0]?.username) {
        const base = sanitizeUsername(xUser.username || 'user') || 'user';
        let candidate = base;
        for (let i = 0; i < 8; i++) {
            if (isReservedUsername(candidate)) {
                candidate = sanitizeUsername(
                    `${base}${Math.floor(Math.random() * 10000)
                        .toString()
                        .padStart(4, '0')}`
                );
                continue;
            }
            const taken = await db
                .select(userIdSelect)
                .from(schema.users)
                .where(eq(schema.users.username, candidate))
                .limit(1);
            if (!taken || taken.length === 0) {
                await db.update(schema.users).set({ username: candidate }).where(eq(schema.users.id, userId));
                break;
            }
            candidate = sanitizeUsername(
                `${base}${Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, '0')}`
            );
        }
    }
	// Create a session token
	const sessionToken = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30d

    await db.insert(schema.sessions).values({
        token: sessionToken,
        userId: userId,
        expiresAt: new Date(expiresAt),
    });

	// Set cookie and clear temporary cookies
	const secure = url.protocol === 'https:';
	cookies.set('session_token', sessionToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 60 * 60 * 24 * 30
	});
	cookies.delete('x_oauth_state', { path: '/' });
	cookies.delete('x_oauth_code_verifier', { path: '/' });

	// Redirect back to original page if provided and safe
	const next = cookies.get('post_auth_next') || '/';
	cookies.delete('post_auth_next', { path: '/' });
	const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
	throw redirect(302, dest);
};
