import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from '$env/dynamic/private';
export { sql, eq, ne, gt, lt, gte, lte, and, or, inArray, desc, asc } from 'drizzle-orm';

// Create a postgres-js client and wrap with Drizzle
const client = postgres(env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
export { schema };
