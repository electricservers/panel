import { desc, eq } from 'drizzle-orm';
import { getDb } from './client';
import { users } from './schema';
import type { PanelRole } from '$lib/server/session';

export type SteamProfile = {
	steamId: string;
	name?: string;
	avatar?: string;
};

/**
 * Finds a panel user by SteamID, or null if they have never logged in.
 *
 * @public used by admin/session lookups once M4 lands.
 */
export function findUserBySteamId(steamId: string) {
	const db = getDb();
	const row = db.select().from(users).where(eq(users.steamId, steamId)).get();
	return row ?? null;
}

/**
 * Creates the user with default role `user` on first login, or refreshes
 * their cached name/avatar on subsequent logins. Role is never overwritten
 * here — it only changes through admin action.
 */
export function upsertUserOnLogin(profile: SteamProfile) {
	const db = getDb();
	const now = new Date();
	const existing = findUserBySteamId(profile.steamId);

	if (!existing) {
		db.insert(users)
			.values({
				steamId: profile.steamId,
				role: 'user',
				name: profile.name,
				avatar: profile.avatar,
				createdAt: now,
				updatedAt: now
			})
			.run();
		return findUserBySteamId(profile.steamId)!;
	}

	db.update(users)
		.set({ name: profile.name, avatar: profile.avatar, updatedAt: now })
		.where(eq(users.steamId, profile.steamId))
		.run();
	return findUserBySteamId(profile.steamId)!;
}

/**
 * @public role changes are admin-only and land with the M4 admin module.
 */
export function setUserRole(steamId: string, role: PanelRole) {
	const db = getDb();
	db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.steamId, steamId)).run();
}

/** Every panel user who has ever logged in, most recently updated first. */
export function listUsers() {
	const db = getDb();
	return db.select().from(users).orderBy(desc(users.updatedAt)).all();
}
