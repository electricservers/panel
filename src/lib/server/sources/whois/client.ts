import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { getSourcePool } from '$lib/server/sources/pool';
import type { Source } from '$lib/server/sources/types';
import * as schema from './schema';

type WhoisDb = MySql2Database<typeof schema>;

const clients = new Map<string, WhoisDb>();

/**
 * Lazily wraps (and caches) the source's shared connection pool with a
 * Drizzle client scoped to the `whois` schema.
 */
export function getWhoisDb(source: Source): WhoisDb {
	const existing = clients.get(source.id);
	if (existing) return existing;

	const db = drizzle(getSourcePool(source), { schema, mode: 'default' });
	clients.set(source.id, db);
	return db;
}
