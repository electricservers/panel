import { desc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
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

/** True when `steamId` matches the optional `OWNER_STEAM_ID` bootstrap env var. */
function isBootstrapOwner(steamId: string): boolean {
	const ownerId = env.OWNER_STEAM_ID?.trim();
	return Boolean(ownerId) && ownerId === steamId;
}

/**
 * Creates the user with default role `user` on first login, or refreshes
 * their cached name/avatar on subsequent logins. Role is never overwritten
 * here except when `OWNER_STEAM_ID` matches (fresh-deploy bootstrap).
 */
export function upsertUserOnLogin(profile: SteamProfile) {
	const db = getDb();
	const now = new Date();
	const existing = findUserBySteamId(profile.steamId);
	const bootstrapOwner = isBootstrapOwner(profile.steamId);

	if (!existing) {
		db.insert(users)
			.values({
				steamId: profile.steamId,
				role: bootstrapOwner ? 'owner' : 'user',
				name: profile.name,
				avatar: profile.avatar,
				createdAt: now,
				updatedAt: now
			})
			.run();
		return findUserBySteamId(profile.steamId)!;
	}

	db.update(users)
		.set({
			name: profile.name,
			avatar: profile.avatar,
			updatedAt: now,
			...(bootstrapOwner && existing.role !== 'owner' ? { role: 'owner' as const } : {})
		})
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
