import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { moduleToggles } from './schema';
import { KNOWN_CAPABILITIES, type Capability } from '$lib/server/sources/types';

export type ModuleToggle = {
	capability: Capability;
	enabled: boolean;
};

/** Missing row defaults to enabled, so a brand-new capability works with no seed. */
export function isModuleEnabled(capability: Capability): boolean {
	const db = getDb();
	const row = db.select().from(moduleToggles).where(eq(moduleToggles.capability, capability)).get();
	return row?.enabled ?? true;
}

export function setModuleEnabled(capability: Capability, enabled: boolean): void {
	const db = getDb();
	const now = new Date();
	db.insert(moduleToggles)
		.values({ capability, enabled, updatedAt: now })
		.onConflictDoUpdate({
			target: moduleToggles.capability,
			set: { enabled, updatedAt: now }
		})
		.run();
}

/** One entry per known capability, defaulting missing rows to enabled. */
export function listModuleToggles(): ModuleToggle[] {
	const db = getDb();
	const rows = db.select().from(moduleToggles).all();
	const byCapability = new Map(rows.map((row) => [row.capability, row.enabled]));
	return KNOWN_CAPABILITIES.map((capability) => ({
		capability,
		enabled: byCapability.get(capability) ?? true
	}));
}
