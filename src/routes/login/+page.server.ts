import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = ({ url }) => {
    const next = url.searchParams.get('next') || '/auth/complete';
    throw redirect(307, `/auth/x/start?next=${encodeURIComponent(next)}`);
};
