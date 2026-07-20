import { mysqlTable, varchar, int, date, time, timestamp } from 'drizzle-orm/mysql-core';

/**
 * Connection/session log written by the whois SourceMod plugin on every
 * connect/disconnect/namechange. `steam_id` is always Steam2. `timestamp` is
 * unix seconds and is always populated by current plugin versions; `date`+
 * `time` are a legacy fallback for older rows.
 */
export const whoisLogs = mysqlTable('whois_logs', {
	entry: int('entry').autoincrement().primaryKey(),
	steamId: varchar('steam_id', { length: 64 }),
	name: varchar('name', { length: 128 }),
	date: date('date'),
	time: time('time'),
	timestamp: int('timestamp'),
	ip: varchar('ip', { length: 32 }),
	serverIp: varchar('server_ip', { length: 32 }),
	serverName: varchar('server_name', { length: 128 }),
	action: varchar('action', { length: 32 })
});

/** Staff-assigned permanent display name, keyed by Steam2 id. */
export const whoisPermname = mysqlTable('whois_permname', {
	steamId: varchar('steam_id', { length: 64 }).primaryKey(),
	name: varchar('name', { length: 128 })
});

/** Alt link: `steamId` is the alt, `mainSteamId` points at the main account. */
export const whoisAltLinks = mysqlTable('whois_alt_links', {
	steamId: varchar('steam_id', { length: 64 }).primaryKey(),
	mainSteamId: varchar('main_steam_id', { length: 64 }),
	linkedAt: timestamp('linked_at').defaultNow(),
	linkedBy: varchar('linked_by', { length: 64 })
});
