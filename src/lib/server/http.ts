import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getSessionUser, isAdminUser } from '$lib/server/admin';
import type { SessionUser } from '$lib/types';

export async function requireUser(cookies: Cookies): Promise<SessionUser> {
  const user = await getSessionUser(cookies);
  if (!user) throw error(401, 'Unauthorized');
  return user;
}

export async function requireAdmin(cookies: Cookies): Promise<SessionUser> {
  const user = await requireUser(cookies);
  if (!isAdminUser(user)) throw error(403, 'Forbidden');
  return user;
}

export async function safeJson<T = any>(req: Request): Promise<T & Record<string, any>> {
  try {
    const v = await req.json();
    return (typeof v === 'object' && v !== null ? v : {}) as T & Record<string, any>;
  } catch {
    return {} as T & Record<string, any>;
  }
}
