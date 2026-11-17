let _rtf: Intl.RelativeTimeFormat | null = null;
function relFmt(): Intl.RelativeTimeFormat {
	return (_rtf ||= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }));
}

let _dfSameYear: Intl.DateTimeFormat | null = null;
let _dfWithYear: Intl.DateTimeFormat | null = null;
function dfSameYear(): Intl.DateTimeFormat {
	return (_dfSameYear ||= new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}));
}
function dfWithYear(): Intl.DateTimeFormat {
	return (_dfWithYear ||= new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}));
}

let _dfDateShort: Intl.DateTimeFormat | null = null;
let _dfDateShortNoYear: Intl.DateTimeFormat | null = null;
function dfDateShort(): Intl.DateTimeFormat {
    return (_dfDateShort ||= new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }));
}
function dfDateShortNoYear(): Intl.DateTimeFormat {
    return (_dfDateShortNoYear ||= new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric'
    }));
}

let _dfDateTime: Intl.DateTimeFormat | null = null;
function dfDateTime(): Intl.DateTimeFormat {
	return (_dfDateTime ||= new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	}));
}

export function formatExpiry(dateLike: string | number | Date | null | undefined): string {
	if (!dateLike) return 'No expiry';
	const d = new Date(dateLike);
	if (Number.isNaN(d.getTime())) return 'No expiry';

	const now = new Date();
	const sameYear = d.getFullYear() === now.getFullYear();
	return (sameYear ? dfSameYear() : dfWithYear()).format(d);
}

export function formatRelativeExpiry(dateLike: string | number | Date | null | undefined): string {
	if (!dateLike) return 'No expiry';
	const d = new Date(dateLike);
	if (Number.isNaN(d.getTime())) return 'No expiry';

	const now = new Date();
	let diff = d.getTime() - now.getTime();
	const rtf = relFmt();

	const abs = Math.abs(diff);
	const sec = 1000;
	const min = 60 * sec;
	const hour = 60 * min;
	const day = 24 * hour;
	const month = 30 * day; // approx
	const year = 365 * day; // approx

	if (abs < 45 * sec) return rtf.format(Math.round(diff / sec), 'second');
	if (abs < 45 * min) return rtf.format(Math.round(diff / min), 'minute');
	if (abs < 22 * hour) return rtf.format(Math.round(diff / hour), 'hour');
	if (abs < 26 * day) return rtf.format(Math.round(diff / day), 'day');
	if (abs < 11 * month) return rtf.format(Math.round(diff / month), 'month');
	return rtf.format(Math.round(diff / year), 'year');
}

// Generic short date: Jan 5, 2025
export function formatDateShort(dateLike: string | number | Date | null | undefined): string {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    return (sameYear ? dfDateShortNoYear() : dfDateShort()).format(d);
}

// Generic date+time: Jan 5, 2025, 3:15 PM
export function formatDateTime(dateLike: string | number | Date | null | undefined): string {
	if (!dateLike) return '—';
	const d = new Date(dateLike);
	if (Number.isNaN(d.getTime())) return '—';
	return dfDateTime().format(d);
}

// Relative time for past/future events (e.g., "3 hours ago", "in 2 days")
export function formatRelative(dateLike: string | number | Date | null | undefined): string {
	if (!dateLike) return '—';
	const d = new Date(dateLike);
	if (Number.isNaN(d.getTime())) return '—';

	const now = new Date();
	let diff = d.getTime() - now.getTime();
	const rtf = relFmt();

	const abs = Math.abs(diff);
	const sec = 1000;
	const min = 60 * sec;
	const hour = 60 * min;
	const day = 24 * hour;
	const month = 30 * day; // approx
	const year = 365 * day; // approx

	if (abs < 45 * sec) return rtf.format(Math.round(diff / sec), 'second');
	if (abs < 45 * min) return rtf.format(Math.round(diff / min), 'minute');
	if (abs < 22 * hour) return rtf.format(Math.round(diff / hour), 'hour');
	if (abs < 26 * day) return rtf.format(Math.round(diff / day), 'day');
	if (abs < 11 * month) return rtf.format(Math.round(diff / month), 'month');
	return rtf.format(Math.round(diff / year), 'year');
}

// Ultra-short relative time (e.g., "2s", "3m", "5h", "2d", "3mo", "1y")
export function formatDateShortRelative(dateLike: string | number | Date | null | undefined): string {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';

    const now = Date.now();
    const diff = Math.abs(now - d.getTime());

    const sec = 1000;
    const min = 60 * sec;
    const hour = 60 * min;
    const day = 24 * hour;
    const month = 30 * day; // approx
    const year = 365 * day; // approx

    if (diff < min) return `${Math.floor(diff / sec)}s`;
    if (diff < hour) return `${Math.floor(diff / min)}m`;
    if (diff < day) return `${Math.floor(diff / hour)}h`;
    if (diff < month) return `${Math.floor(diff / day)}d`;
    if (diff < year) return `${Math.floor(diff / month)}mo`;
    return `${Math.floor(diff / year)}y`;
}
