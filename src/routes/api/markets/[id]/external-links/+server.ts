import { error, json } from '@sveltejs/kit';
import { db, schema, eq, desc, and, inArray } from '$lib/server/db.ts';
import { externalLinkRowSelect } from '$lib/server/selects';
import { ensureUuid } from '$lib/server/input';
import { requireUser, safeJson } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const id = ensureUuid('id', params.id);

    // Use Drizzle select and cast enum to text to avoid driver quirks
    const rows = await db
        .select(externalLinkRowSelect)
        .from(schema.externalLinks)
        .where(eq(schema.externalLinks.marketId, id))
        .orderBy(desc(schema.externalLinks.fetchedAt))
        .limit(500);

    const external_links = rows.map((r) => ({
        id: r.id,
        source: r.source as 'x' | 'hackernews' | 'website',
        url: r.url,
        label: r.label ?? null,
        author_username: r.author_username ?? null,
        content: r.content ?? null,
        fetched_at: r.fetched_at ?? null
    }));

    return json({ external_links });
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
    const market_id = ensureUuid('id', params.id);
    const user = await requireUser(cookies);
    const body = await safeJson<{ url?: string; label?: string | null; author_username?: string | null; content?: string | null }>(request);
    const rawUrl = String(body?.url || '').trim();
    if (!rawUrl) throw error(400, 'url is required');

    // Basic URL normalization: http(s) only, lowercase host, strip www, remove hash,
    // remove default ports, drop common tracking params, sort remaining params,
    // and remove trailing slash (except root).
    function normalize(input: string): string {
        if (!/^https?:\/\//i.test(input)) throw new Error('must start with http(s)://');
        const u = new URL(input);
        u.hash = '';
        u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
        if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
            u.port = '';
        }
        const stripParams = new Set([
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'utm_name', 'utm_id', 'utm_reader', 'utm_viz_id', 'utm_pubreferrer',
            'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'yclid', 'ref', 'ref_src'
        ]);
        const kept: Array<[string, string]> = [];
        u.searchParams.forEach((v, k) => {
            if (!stripParams.has(k.toLowerCase())) kept.push([k, v]);
        });
        kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
        u.search = '';
        for (const [k, v] of kept) u.searchParams.append(k, v);
        if (u.pathname !== '/') {
            u.pathname = u.pathname.replace(/\/+$/, '');
            if (u.pathname === '') u.pathname = '/';
        }
        return u.toString();
    }

    let normalized: string;
    try {
        normalized = normalize(rawUrl);
    } catch {
        throw error(400, 'invalid url');
    }

    // Duplicate check for this market (match normalized or raw legacy value)
    const dupe = await db
        .select({ id: schema.externalLinks.id })
        .from(schema.externalLinks)
        .where(
            and(
                eq(schema.externalLinks.marketId, market_id),
                inArray(schema.externalLinks.url, Array.from(new Set([normalized, rawUrl])))
            )
        )
        .limit(1);
    if (dupe?.[0]) {
        return json({ success: true, id: dupe[0].id, duplicate: true });
    }

    const rows = await db
        .insert(schema.externalLinks)
        .values({
            source: 'website',
            url: normalized,
            marketId: market_id,
            userId: user.id,
            label: body?.label ?? null,
            authorUsername: body?.author_username ?? null,
            content: body?.content ?? null,
        })
        .returning({ id: schema.externalLinks.id });
    const inserted = rows?.[0];
    if (!inserted) throw error(500, 'failed to insert');
    return json({ success: true, id: inserted.id });
};
