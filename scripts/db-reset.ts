import 'dotenv/config';
import postgres from 'postgres';

function isLocalHost(host?: string | null) {
  if (!host) return false;
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local')
  );
}

function requireSafeLocal(urlStr: string) {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch (e) {
    throw new Error('Invalid DATABASE_URL');
  }
  const host = url.hostname;
  const db = url.pathname.replace(/^\//, '') || '(default)';
  if (!isLocalHost(host)) {
    throw new Error(
      `Refusing to reset a non-local database (host=${host}, db=${db}). Set a local DATABASE_URL to proceed.`
    );
  }
  return { host, db };
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL env var');
    process.exit(1);
  }

  const { host, db } = requireSafeLocal(DATABASE_URL);
  console.log(`Resetting database on ${host}/${db} ...`);

  const client = postgres(DATABASE_URL, { max: 1 });
  try {
    // Drop and recreate the public schema
    await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.unsafe('CREATE SCHEMA public;');
    // Common extension for gen_random_uuid() used by migrations
    await client.unsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    // Helpful default grants for local dev
    await client.unsafe('GRANT ALL ON SCHEMA public TO PUBLIC;');
    console.log('Database schema reset complete.');
  } finally {
    await client.end({ timeout: 1 });
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

