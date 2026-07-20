import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { siteSettings, type SiteSettingsRow } from './schema';

const SETTINGS_ID = 1;

function ensureSettingsRow(): SiteSettingsRow {
	const db = getDb();
	const existing = db.select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).get();
	if (existing) return existing;

	const now = new Date();
	db.insert(siteSettings)
		.values({ id: SETTINGS_ID, siteName: 'Electric Panel', updatedAt: now })
		.run();
	return db.select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).get()!;
}

/** Reads the singleton site settings row, bootstrapping defaults on first access. */
export function getSiteSettings(): SiteSettingsRow {
	return ensureSettingsRow();
}

export type SiteSettingsPatch = {
	siteName?: string;
	siteDescription?: string | null;
	faviconData?: Buffer | null;
	faviconMimeType?: string | null;
};

export function updateSiteSettings(patch: SiteSettingsPatch): SiteSettingsRow {
	ensureSettingsRow();
	const db = getDb();
	db.update(siteSettings)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(siteSettings.id, SETTINGS_ID))
		.run();
	return db.select().from(siteSettings).where(eq(siteSettings.id, SETTINGS_ID)).get()!;
}
