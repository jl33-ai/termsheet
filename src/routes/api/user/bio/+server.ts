import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db, schema, eq } from '$lib/server/db.ts';
import { requireUser, safeJson } from '$lib/server/http';
import type { SetBioBody } from '$lib/types';

function sanitizeBio(v: string) {
  // Remove control chars, trim, clamp to 280 chars. Preserve basic newlines.
  const cleaned = (v || '').replace(/[\u0000-\u001F\u007F]/g, '');
  const trimmed = cleaned.trim();
  return trimmed.slice(0, 280);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const body = await safeJson<SetBioBody>(request);
  const desired: string = typeof body?.bio === 'string' ? body.bio : '';
  const bio = sanitizeBio(desired);
  // Allow empty bio to clear
  if (bio.length > 280) throw error(400, 'Bio too long');

  const { id: userId } = await requireUser(cookies);

  await db.update(schema.users).set({ bio: bio || null }).where(eq(schema.users.id, userId));
  return json({ success: true, bio });
};
