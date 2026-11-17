// Centralized helpers for username validation/sanitization

const RESERVED = new Set(['admin', 'wallet', 'company', 'login', 'market', 'register']);

export function sanitizeUsername(u: string): string {
	return (u || '')
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '')
		.slice(0, 20);
}

export function isReservedUsername(u: string): boolean {
	const s = sanitizeUsername(u);
	return s.length > 0 && RESERVED.has(s);
}

export function assertUsernameAllowed(u: string) {
	if (isReservedUsername(u)) {
		const err: any = new Error('That username is reserved');
		err.status = 400;
		throw err;
	}
}
