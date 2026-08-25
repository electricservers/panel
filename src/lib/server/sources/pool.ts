import mysql from 'mysql2/promise';
import { getSourceDsn } from '$lib/server/db/sources';
import { parseMysqlDsn } from '$lib/server/secrets/dsn';
import type { Source } from '$lib/server/sources/types';

const pools = new Map<string, mysql.Pool>();

/**
 * Lazily opens (and caches) one MySQL connection pool per source, shared by
 * every capability that source declares (`mgemod`, `whois`, ...). A source
 * with multiple capabilities points at one physical database, so capability
 * adapters wrap this same pool with their own Drizzle schema instead of each
 * opening their own connection.
 */
export function getSourcePool(source: Source): mysql.Pool {
	const existing = pools.get(source.id);
	if (existing) return existing;

	const parts = parseMysqlDsn(getSourceDsn(source.id));
	const pool = mysql.createPool({
		host: parts.host,
		port: parts.port,
		user: parts.user,
		password: parts.password,
		database: parts.database,
		charset: 'utf8mb4'
	});
	pools.set(source.id, pool);
	return pool;
}

/** Closes and forgets a source's MySQL pool so admin edits to its DSN take effect immediately. */
export function invalidateSourcePool(sourceId: string): void {
	const pool = pools.get(sourceId);
	if (!pool) return;
	pools.delete(sourceId);
	void pool.end();
}
