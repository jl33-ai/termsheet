import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { OAuthCookieName, CookieOpts } from '$lib/types';

function isLocalHost(hostname: string) {
	return hostname === 'localhost' || hostname === '127.0.0.1';
}

function inferCookieDomain(hostname: string): string | undefined {
	const AUTH_COOKIE_DOMAIN = env.AUTH_COOKIE_DOMAIN || '';
	if (AUTH_COOKIE_DOMAIN && AUTH_COOKIE_DOMAIN.trim()) return AUTH_COOKIE_DOMAIN.trim();
	// If user is on www., use apex so cookies survive redirects between www and apex.
	if (hostname.startsWith('www.')) return hostname.slice(4);
	return undefined;
}

export function oauthCookieOptions(url: URL, maxAgeSeconds?: number): CookieOpts {
	const domain = inferCookieDomain(url.hostname);
	const isLocal = isLocalHost(url.hostname);
	const secureEnv = env.AUTH_COOKIE_SECURE || '';
	const secure = secureEnv ? secureEnv === 'true' : !isLocal; // force secure in prod even if behind a proxy
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		...(domain ? { domain } : {}),
		...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {})
	} satisfies CookieOpts;
}

export function deleteWithSameOptions(cookies: Cookies, url: URL, name: OAuthCookieName) {
	const opts = oauthCookieOptions(url);
	cookies.delete(name, { path: opts.path, ...(opts as any) });
}
