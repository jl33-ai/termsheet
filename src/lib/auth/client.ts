// Lightweight client-side auth helpers for consistent redirects and intent persistence
import type { PostAuthIntent } from '$lib/types';

const INTENT_KEY = 'postAuthIntent';

export function buildNextFromLocation(): string {
	return `${location.pathname}${location.search}${location.hash}`;
}

export function redirectToLogin(next?: string) {
    const dest = next || buildNextFromLocation();
    // Prefer opening OAuth in a new tab so current state is preserved
    try {
        // After callback, we land on /auth/complete which signals opener then closes
        window.open(`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`,'_blank','noopener');
        return;
    } catch {}
    // Fallback: same-tab OAuth start
    location.href = `/auth/x/start?next=${encodeURIComponent(dest)}`;
}

export function redirectToRegister(next?: string) {
    // Register path removed; use login flow
    redirectToLogin(next);
}

// Optional helper if you want to explicitly open auth in a new tab
export function openAuthInNewTab() {
    try {
        window.open(`/auth/x/start?next=${encodeURIComponent('/auth/complete')}`,'_blank','noopener');
    } catch {}
}

export function setPostAuthIntent(intent: PostAuthIntent) {
	try {
		sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
	} catch {}
}

export function consumePostAuthIntent(): PostAuthIntent | null {
	try {
		const raw = sessionStorage.getItem(INTENT_KEY);
		if (!raw) return null;
		sessionStorage.removeItem(INTENT_KEY);
		return JSON.parse(raw) as PostAuthIntent;
	} catch {
		return null;
	}
}
