import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import type { Pool } from 'mysql2/promise';
import { getSourcePool } from '$lib/server/sources/pool';
import type { Source } from '$lib/server/sources/types';
import * as schema from './schema';

type MgemodDb = MySql2Database<typeof schema>;

/** Keyed by pool, so a pool closed by `invalidateSourcePool` is never reused. */
const clients = new WeakMap<Pool, MgemodDb>();

/**
 * Lazily wraps (and caches) the source's shared connection pool with a
 * Drizzle client scoped to the `mgemod` schema.
 */
export function getMgemodDb(source: Source): MgemodDb {
	const pool = getSourcePool(source);
	const existing = clients.get(pool);
	if (existing) return existing;

	const db = drizzle(pool, { schema, mode: 'default' });
	clients.set(pool, db);
	return db;
}
