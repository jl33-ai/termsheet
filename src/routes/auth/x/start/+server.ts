import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { X_CLIENT_ID, X_REDIRECT_URI, X_SCOPES } from '$env/static/private';
import crypto from 'node:crypto';

function base64url(input: Buffer | string) {
	return (typeof input === 'string' ? Buffer.from(input) : input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function codeChallengeFromVerifier(verifier: string) {
	return base64url(crypto.createHash('sha256').update(verifier).digest());
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (!X_CLIENT_ID || !X_REDIRECT_URI) {
		throw new Error('X OAuth not configured (X_CLIENT_ID/X_REDIRECT_URI)');
	}

	const state = base64url(crypto.randomBytes(24));
	const code_verifier = base64url(crypto.randomBytes(64));
	const code_challenge = codeChallengeFromVerifier(code_verifier);

	// Set short-lived cookies for state and code_verifier
	const secure = url.protocol === 'https:';
	const opts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 600, secure };
	cookies.set('x_oauth_state', state, opts);
	cookies.set('x_oauth_code_verifier', code_verifier, opts);

	// Persist the post-auth redirect target (relative path only)
	const nextRaw = url.searchParams.get('next') || '';
	const next = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';
	cookies.set('post_auth_next', next, opts);

	const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', X_CLIENT_ID);
	authUrl.searchParams.set('redirect_uri', X_REDIRECT_URI);
	// Request required scopes. Default to tweet.read users.read offline.access
	const scope =
		X_SCOPES && X_SCOPES.trim().length > 0 ? X_SCOPES : 'tweet.read users.read offline.access';
	authUrl.searchParams.set('scope', scope);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('code_challenge', code_challenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');

	throw redirect(302, authUrl.toString());
};
