import { mysqlTable, varchar, int } from 'drizzle-orm/mysql-core';

/**
 * Player roster / leaderboard. `lastplayed` is read as text because older
 * MGEMod installs store it as a string (AR-style schema) while others use a
 * native int column; the adapter coerces it with `Number(...)`.
 */
export const mgemodStats = mysqlTable('mgemod_stats', {
	steamid: varchar('steamid', { length: 255 }).primaryKey(),
	name: varchar('name', { length: 255 }),
	rating: int('rating'),
	wins: int('wins'),
	losses: int('losses'),
	lastplayed: varchar('lastplayed', { length: 255 }),
	hitblip: varchar('hitblip', { length: 255 })
});

/** 1v1 match log. `mgemod_duels_2v2` and `mgemod_migrations` are unused by the panel. */
export const mgemodDuels = mysqlTable('mgemod_duels', {
	id: int('id').autoincrement().primaryKey(),
	winner: varchar('winner', { length: 255 }),
	loser: varchar('loser', { length: 255 }),
	winnerscore: varchar('winnerscore', { length: 255 }),
	loserscore: varchar('loserscore', { length: 255 }),
	winlimit: varchar('winlimit', { length: 255 }),
	endtime: int('endtime').notNull(),
	starttime: int('starttime'),
	mapname: varchar('mapname', { length: 255 }),
	arenaname: varchar('arenaname', { length: 255 }),
	winnerclass: varchar('winnerclass', { length: 64 }),
	loserclass: varchar('loserclass', { length: 64 }),
	winner_previous_elo: int('winner_previous_elo'),
	winner_new_elo: int('winner_new_elo'),
	loser_previous_elo: int('loser_previous_elo'),
	loser_new_elo: int('loser_new_elo')
});
