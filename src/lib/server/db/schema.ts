import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import type { Capability } from '$lib/server/sources/types';

export const users = sqliteTable('users', {
	steamId: text('steam_id').primaryKey(),
	role: text('role', { enum: ['user', 'admin', 'owner'] })
		.notNull()
		.default('user'),
	name: text('name'),
	avatar: text('avatar'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const sources = sqliteTable('sources', {
	id: text('id').primaryKey(),
	label: text('label').notNull(),
	dsnCiphertext: text('dsn_ciphertext').notNull(),
	capabilities: text('capabilities', { mode: 'json' }).notNull().$type<Capability[]>(),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type SourceRow = typeof sources.$inferSelect;
export type NewSourceRow = typeof sources.$inferInsert;

/** Singleton row (id always 1) holding site branding only, no capability-specific columns. */
export const siteSettings = sqliteTable('site_settings', {
	id: integer('id').primaryKey(),
	siteName: text('site_name').notNull().default('Electric Panel'),
	siteDescription: text('site_description'),
	faviconData: blob('favicon_data', { mode: 'buffer' }),
	faviconMimeType: text('favicon_mime_type'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type SiteSettingsRow = typeof siteSettings.$inferSelect;

/**
 * One row per capability, not one column per capability, so a future
 * capability gets a toggle for free without a schema migration.
 */
export const moduleToggles = sqliteTable('module_toggles', {
	capability: text('capability').primaryKey().$type<Capability>(),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export type ModuleToggleRow = typeof moduleToggles.$inferSelect;

export const voiceDemos = sqliteTable('voice_demos', {
	id: text('id').primaryKey(),
	originalFilename: text('original_filename').notNull(),
	uploaderSteamId: text('uploader_steam_id').notNull(),
	status: text('status', {
		enum: ['uploaded', 'processing', 'processed', 'failed']
	})
		.notNull()
		.default('uploaded'),
	map: text('map'),
	durationSeconds: integer('duration_seconds'),
	errorMessage: text('error_message'),
	/** Approximate end of recording (usually the .dem file's last-modified time). */
	recordedAt: integer('recorded_at', { mode: 'timestamp' }),
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
	processedAt: integer('processed_at', { mode: 'timestamp' })
});

export type VoiceDemoRow = typeof voiceDemos.$inferSelect;
export type NewVoiceDemoRow = typeof voiceDemos.$inferInsert;
