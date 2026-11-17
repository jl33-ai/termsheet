import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async () => {
	throw error(404, 'Auth is disabled');
};
