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
		charset: 'utf8mb4',
		// Fail a request fast when the remote DB is unreachable instead of hanging it.
		connectTimeout: 10_000,
		// Keeps idle sockets from being silently dropped by NAT/firewalls between
		// Railway and the game-server DB host.
		enableKeepAlive: true,
		keepAliveInitialDelay: 10_000
	});
	// A connection the server drops while idle emits `error`; without a
	// listener that becomes an uncaught exception and kills the process.
	pool.pool.on('connection', (connection) => {
		connection.on('error', (err) => {
			console.error(`MySQL connection error on source "${source.id}":`, err.message);
		});
	});
	pools.set(source.id, pool);
	return pool;
}

/** Closes and forgets a source's MySQL pool so admin edits to its DSN take effect immediately. */
export function invalidateSourcePool(sourceId: string): void {
	const pool = pools.get(sourceId);
	if (!pool) return;
	pools.delete(sourceId);
	pool.end().catch((err) => {
		console.error(`Failed to close MySQL pool for source "${sourceId}":`, err);
	});
}
